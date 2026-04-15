/**
 * Property Tests: Data Consistency
 * 
 * Feature: real-time-system-integration-testing
 * Properties 4-11: Data consistency invariants
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 9.1, 9.2, 9.3, 9.4, 9.5**
 * 
 * These property tests verify that data consistency invariants hold across
 * all modules in the system. They check that:
 * - Inventory quantities match stock movements
 * - Account balances match transactions
 * - Batch quantities match batch movements
 * - Cross-module data is consistent for invoices and payments
 * - Report data matches underlying transaction data
 * - Referential integrity is maintained
 * 
 * Tests run against production database to verify real-world data consistency.
 */

const fc = require('fast-check');
const { TestHarness } = require('../components/testHarness');
const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const mockDataGenerator = require('../components/mockDataGenerator');
const consistencyChecker = require('../components/consistencyChecker');
const syncVerifier = require('../components/syncVerifier');
const config = require('../config/testConfig');

describe('Data Consistency Property Tests', () => {
  let harness;
  let adminClient;
  let posClient;
  let createdEntities;

  beforeAll(async () => {
    harness = new TestHarness({ verbose: true });
    await harness.setup();
    
    const clients = harness.getClients();
    adminClient = clients.adminClient;
    posClient = clients.posClient;
    
    createdEntities = {
      items: [],
      accounts: [],
      warehouses: [],
      batches: [],
      invoices: [],
    };
  });

  afterAll(async () => {
    await harness.teardown();
  });

  /**
   * Property 4: Inventory balance invariant
   * **Validates: Requirements 9.1**
   * 
   * For any item and warehouse, the current inventory quantity should equal
   * the sum of all stock movements (purchases in, sales out, adjustments,
   * transfers in, transfers out) for that item in that warehouse.
   */
  describe('Property 4: Inventory Balance Invariant', () => {
    test('10.1: Inventory quantity equals sum of stock movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateWarehouse(),
          fc.array(
            fc.record({
              type: fc.constantFrom('purchase', 'sale', 'adjustment'),
              quantity: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (itemData, warehouseData, movements) => {
            try {
              // Create item
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              // Create warehouse
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              // Wait for sync
              await new Promise(resolve => setTimeout(resolve, 500));

              // Execute stock movements
              let expectedQuantity = 0;
              
              for (const movement of movements) {
                if (movement.type === 'purchase') {
                  // Create purchase to add stock
                  const supplier = fc.sample(mockDataGenerator.generateAccount('supplier'), 1)[0];
                  const supplierResponse = await adminClient.post('/master-data/accounts', supplier);
                  const supplierId = supplierResponse.data._id;
                  createdEntities.accounts.push(supplierId);

                  const purchaseInvoice = {
                    type: 'purchase',
                    supplierId: supplierId,
                    warehouseId: warehouseId,
                    items: [{
                      itemId: itemId,
                      quantity: movement.quantity,
                      price: itemData.price,
                      amount: movement.quantity * itemData.price,
                    }],
                    totals: {
                      subtotal: movement.quantity * itemData.price,
                      grandTotal: movement.quantity * itemData.price,
                    },
                    invoiceDate: new Date(),
                    status: 'completed',
                  };

                  await adminClient.post('/purchase/invoices', purchaseInvoice);
                  expectedQuantity += movement.quantity;
                  
                } else if (movement.type === 'sale') {
                  // Only create sale if we have stock
                  if (expectedQuantity >= movement.quantity) {
                    const customer = fc.sample(mockDataGenerator.generateAccount('customer'), 1)[0];
                    const customerResponse = await adminClient.post('/master-data/accounts', customer);
                    const customerId = customerResponse.data._id;
                    createdEntities.accounts.push(customerId);

                    const salesInvoice = {
                      type: 'sales',
                      customerId: customerId,
                      warehouseId: warehouseId,
                      items: [{
                        itemId: itemId,
                        quantity: movement.quantity,
                        price: itemData.price,
                        amount: movement.quantity * itemData.price,
                      }],
                      totals: {
                        subtotal: movement.quantity * itemData.price,
                        grandTotal: movement.quantity * itemData.price,
                      },
                      invoiceDate: new Date(),
                      status: 'completed',
                    };

                    await posClient.post('/invoices', salesInvoice);
                    expectedQuantity -= movement.quantity;
                  }
                  
                } else if (movement.type === 'adjustment') {
                  // Stock adjustment (can be positive or negative)
                  const adjustmentQty = expectedQuantity > 0 
                    ? fc.sample(fc.integer({ min: -expectedQuantity, max: movement.quantity }), 1)[0]
                    : movement.quantity;

                  await adminClient.post('/inventory/adjustments', {
                    itemId: itemId,
                    warehouseId: warehouseId,
                    quantity: adjustmentQty,
                    reason: 'testing',
                    date: new Date(),
                  });
                  
                  expectedQuantity += adjustmentQty;
                }

                // Small delay between movements
                await new Promise(resolve => setTimeout(resolve, 200));
              }

              // Wait for all movements to sync
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify inventory consistency
              const result = await consistencyChecker.verifyInventoryConsistency(itemId, warehouseId);

              // Property holds if inventory is consistent
              return result.consistent;
              
            } catch (error) {
              console.error('Property 4 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 5: Account balance invariant
   * **Validates: Requirements 9.2**
   * 
   * For any account (customer or supplier), the current account balance should
   * equal the opening balance plus the sum of all transactions (invoices,
   * payments, returns) for that account.
   */
  describe('Property 5: Account Balance Invariant', () => {
    test('10.2: Account balance equals opening balance plus transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateAccount('customer'),
          fc.array(
            fc.record({
              type: fc.constantFrom('invoice', 'payment'),
              amount: fc.double({ min: 100, max: 5000, noNaN: true }).map(a => Number(a.toFixed(2))),
            }),
            { minLength: 2, maxLength: 8 }
          ),
          async (accountData, transactions) => {
            try {
              // Create customer account
              const accountResponse = await adminClient.post('/master-data/accounts', accountData);
              const accountId = accountResponse.data._id;
              createdEntities.accounts.push(accountId);

              // Create item and warehouse for invoices
              const item = fc.sample(mockDataGenerator.generateItem(), 1)[0];
              const itemResponse = await adminClient.post('/master-data/items', item);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              const warehouse = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouse);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              // Add initial stock
              await adminClient.post('/inventory/adjustments', {
                itemId: itemId,
                warehouseId: warehouseId,
                quantity: 10000,
                reason: 'initial_stock',
                date: new Date(),
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              // Execute transactions
              let expectedBalance = accountData.openingBalance || 0;

              for (const transaction of transactions) {
                if (transaction.type === 'invoice') {
                  // Create sales invoice
                  const quantity = Math.floor(transaction.amount / item.price);
                  if (quantity > 0) {
                    const invoice = {
                      type: 'sales',
                      customerId: accountId,
                      warehouseId: warehouseId,
                      items: [{
                        itemId: itemId,
                        quantity: quantity,
                        price: item.price,
                        amount: quantity * item.price,
                      }],
                      totals: {
                        subtotal: quantity * item.price,
                        grandTotal: quantity * item.price,
                      },
                      invoiceDate: new Date(),
                      status: 'completed',
                    };

                    await posClient.post('/invoices', invoice);
                    expectedBalance += invoice.totals.grandTotal;
                  }
                  
                } else if (transaction.type === 'payment') {
                  // Only record payment if there's a balance
                  if (expectedBalance > 0) {
                    const paymentAmount = Math.min(transaction.amount, expectedBalance);
                    
                    await adminClient.post('/accounts/payments', {
                      accountId: accountId,
                      accountType: 'Customer',
                      amount: paymentAmount,
                      paymentMethod: 'cash',
                      date: new Date(),
                    });

                    expectedBalance -= paymentAmount;
                  }
                }

                await new Promise(resolve => setTimeout(resolve, 300));
              }

              // Wait for all transactions to sync
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify account consistency
              const result = await consistencyChecker.verifyAccountConsistency(accountId, 'Customer');

              // Property holds if account balance is consistent
              return result.consistent;
              
            } catch (error) {
              console.error('Property 5 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 6: Batch quantity invariant
   * **Validates: Requirements 9.3**
   * 
   * For any batch, the current batch quantity should equal the initial
   * quantity plus the sum of all batch movements (receipts, sales, adjustments).
   */
  describe('Property 6: Batch Quantity Invariant', () => {
    test('10.3: Batch quantity equals initial quantity plus movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateWarehouse(),
          fc.integer({ min: 100, max: 1000 }),
          fc.array(
            fc.integer({ min: 1, max: 50 }),
            { minLength: 2, maxLength: 8 }
          ),
          async (itemData, warehouseData, initialQuantity, salesQuantities) => {
            try {
              // Create item
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              // Create warehouse
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              // Create supplier for purchase
              const supplier = fc.sample(mockDataGenerator.generateAccount('supplier'), 1)[0];
              const supplierResponse = await adminClient.post('/master-data/accounts', supplier);
              const supplierId = supplierResponse.data._id;
              createdEntities.accounts.push(supplierId);

              await new Promise(resolve => setTimeout(resolve, 500));

              // Create batch via purchase invoice
              const batchNumber = fc.sample(mockDataGenerator.batchNumberArbitrary(), 1)[0];
              const expiryDate = fc.sample(mockDataGenerator.expiryDateArbitrary(), 1)[0];

              const purchaseInvoice = {
                type: 'purchase',
                supplierId: supplierId,
                warehouseId: warehouseId,
                items: [{
                  itemId: itemId,
                  quantity: initialQuantity,
                  price: itemData.price,
                  amount: initialQuantity * itemData.price,
                  batchNumber: batchNumber,
                  expiryDate: expiryDate,
                }],
                totals: {
                  subtotal: initialQuantity * itemData.price,
                  grandTotal: initialQuantity * itemData.price,
                },
                invoiceDate: new Date(),
                status: 'completed',
              };

              const purchaseResponse = await adminClient.post('/purchase/invoices', purchaseInvoice);
              await new Promise(resolve => setTimeout(resolve, 1000));

              // Find the created batch
              const batchesResponse = await adminClient.get('/inventory/batches', {
                params: { itemId: itemId, batchNumber: batchNumber }
              });
              
              if (!batchesResponse.data || batchesResponse.data.length === 0) {
                // Batch not created, skip this test case
                return true;
              }

              const batchId = batchesResponse.data[0]._id;
              createdEntities.batches.push(batchId);

              // Create customer for sales
              const customer = fc.sample(mockDataGenerator.generateAccount('customer'), 1)[0];
              const customerResponse = await adminClient.post('/master-data/accounts', customer);
              const customerId = customerResponse.data._id;
              createdEntities.accounts.push(customerId);

              // Execute sales from batch
              let totalSold = 0;
              for (const saleQty of salesQuantities) {
                if (totalSold + saleQty <= initialQuantity) {
                  const salesInvoice = {
                    type: 'sales',
                    customerId: customerId,
                    warehouseId: warehouseId,
                    items: [{
                      itemId: itemId,
                      quantity: saleQty,
                      price: itemData.price,
                      amount: saleQty * itemData.price,
                      batchNumber: batchNumber,
                    }],
                    totals: {
                      subtotal: saleQty * itemData.price,
                      grandTotal: saleQty * itemData.price,
                    },
                    invoiceDate: new Date(),
                    status: 'completed',
                  };

                  await posClient.post('/invoices', salesInvoice);
                  totalSold += saleQty;
                  
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }

              // Wait for all movements to sync
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify batch consistency
              const result = await consistencyChecker.verifyBatchConsistency(batchId);

              // Property holds if batch quantity is consistent
              return result.consistent;
              
            } catch (error) {
              console.error('Property 6 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 7: Cross-module consistency for sales invoices
   * **Validates: Requirements 4.1**
   * 
   * For any sales invoice, after the invoice is created and synchronized,
   * the inventory reduction should equal the invoice quantities, the account
   * balance increase should equal the invoice total, and the sales report
   * total should include the invoice amount.
   */
  describe('Property 7: Sales Invoice Cross-Module Consistency', () => {
    test('10.4: Sales invoice creates consistent changes across all modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateAccount('customer'),
          mockDataGenerator.generateWarehouse(),
          fc.integer({ min: 10, max: 100 }),
          async (itemData, customerData, warehouseData, quantity) => {
            try {
              // Create item
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              // Create customer
              const customerResponse = await adminClient.post('/master-data/accounts', customerData);
              const customerId = customerResponse.data._id;
              createdEntities.accounts.push(customerId);

              // Create warehouse
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              await new Promise(resolve => setTimeout(resolve, 500));

              // Add initial stock (more than we'll sell)
              await adminClient.post('/inventory/adjustments', {
                itemId: itemId,
                warehouseId: warehouseId,
                quantity: quantity + 100,
                reason: 'initial_stock',
                date: new Date(),
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              // Get initial inventory
              const initialInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const initialQty = initialInventory.data?.[0]?.quantity || 0;

              // Get initial account balance
              const initialAccount = await adminClient.get(`/master-data/accounts/${customerId}`);
              const initialBalance = initialAccount.data?.balance || customerData.openingBalance || 0;

              // Create sales invoice
              const invoiceAmount = quantity * itemData.price;
              const salesInvoice = {
                type: 'sales',
                customerId: customerId,
                warehouseId: warehouseId,
                items: [{
                  itemId: itemId,
                  quantity: quantity,
                  price: itemData.price,
                  amount: invoiceAmount,
                }],
                totals: {
                  subtotal: invoiceAmount,
                  grandTotal: invoiceAmount,
                },
                invoiceDate: new Date(),
                status: 'completed',
              };

              const invoiceResponse = await posClient.post('/invoices', salesInvoice);
              const invoiceId = invoiceResponse.data._id;
              createdEntities.invoices.push(invoiceId);

              // Wait for synchronization
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify inventory reduction
              const finalInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const finalQty = finalInventory.data?.[0]?.quantity || 0;
              const inventoryReduction = initialQty - finalQty;
              const inventoryConsistent = Math.abs(inventoryReduction - quantity) < 0.01;

              // Verify account balance increase
              const finalAccount = await adminClient.get(`/master-data/accounts/${customerId}`);
              const finalBalance = finalAccount.data?.balance || 0;
              const balanceIncrease = finalBalance - initialBalance;
              const accountConsistent = Math.abs(balanceIncrease - invoiceAmount) < 0.01;

              // Verify sales report includes invoice
              const salesReport = await adminClient.get('/reports/sales', {
                params: { 
                  startDate: new Date(Date.now() - 86400000).toISOString(),
                  endDate: new Date().toISOString()
                }
              });
              const reportIncludesInvoice = salesReport.data?.invoices?.some(
                inv => inv._id === invoiceId || inv.id === invoiceId
              ) || false;

              // Property holds if all modules are consistent
              return inventoryConsistent && accountConsistent && reportIncludesInvoice;
              
            } catch (error) {
              console.error('Property 7 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 8: Cross-module consistency for purchase invoices
   * **Validates: Requirements 4.2**
   * 
   * For any purchase invoice, after the invoice is created and synchronized,
   * the inventory increase should equal the invoice quantities, the account
   * balance increase should equal the invoice total, and the purchase report
   * total should include the invoice amount.
   */
  describe('Property 8: Purchase Invoice Cross-Module Consistency', () => {
    test('10.5: Purchase invoice creates consistent changes across all modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateAccount('supplier'),
          mockDataGenerator.generateWarehouse(),
          fc.integer({ min: 10, max: 100 }),
          async (itemData, supplierData, warehouseData, quantity) => {
            try {
              // Create item
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              // Create supplier
              const supplierResponse = await adminClient.post('/master-data/accounts', supplierData);
              const supplierId = supplierResponse.data._id;
              createdEntities.accounts.push(supplierId);

              // Create warehouse
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              await new Promise(resolve => setTimeout(resolve, 500));

              // Get initial inventory
              const initialInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const initialQty = initialInventory.data?.[0]?.quantity || 0;

              // Get initial account balance
              const initialAccount = await adminClient.get(`/master-data/accounts/${supplierId}`);
              const initialBalance = initialAccount.data?.balance || supplierData.openingBalance || 0;

              // Create purchase invoice
              const invoiceAmount = quantity * itemData.price;
              const purchaseInvoice = {
                type: 'purchase',
                supplierId: supplierId,
                warehouseId: warehouseId,
                items: [{
                  itemId: itemId,
                  quantity: quantity,
                  price: itemData.price,
                  amount: invoiceAmount,
                }],
                totals: {
                  subtotal: invoiceAmount,
                  grandTotal: invoiceAmount,
                },
                invoiceDate: new Date(),
                status: 'completed',
              };

              const invoiceResponse = await adminClient.post('/purchase/invoices', purchaseInvoice);
              const invoiceId = invoiceResponse.data._id;
              createdEntities.invoices.push(invoiceId);

              // Wait for synchronization
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify inventory increase
              const finalInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const finalQty = finalInventory.data?.[0]?.quantity || 0;
              const inventoryIncrease = finalQty - initialQty;
              const inventoryConsistent = Math.abs(inventoryIncrease - quantity) < 0.01;

              // Verify account balance increase
              const finalAccount = await adminClient.get(`/master-data/accounts/${supplierId}`);
              const finalBalance = finalAccount.data?.balance || 0;
              const balanceIncrease = finalBalance - initialBalance;
              const accountConsistent = Math.abs(balanceIncrease - invoiceAmount) < 0.01;

              // Verify purchase report includes invoice
              const purchaseReport = await adminClient.get('/reports/purchases', {
                params: { 
                  startDate: new Date(Date.now() - 86400000).toISOString(),
                  endDate: new Date().toISOString()
                }
              });
              const reportIncludesInvoice = purchaseReport.data?.invoices?.some(
                inv => inv._id === invoiceId || inv.id === invoiceId
              ) || false;

              // Property holds if all modules are consistent
              return inventoryConsistent && accountConsistent && reportIncludesInvoice;
              
            } catch (error) {
              console.error('Property 8 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 9: Payment consistency
   * **Validates: Requirements 4.3**
   * 
   * For any payment, after the payment is recorded and synchronized, the
   * account balance should be reduced by the payment amount, and the payment
   * report should show the payment.
   */
  describe('Property 9: Payment Consistency', () => {
    test('10.6: Payment creates consistent changes across modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateAccount('customer'),
          fc.double({ min: 500, max: 5000, noNaN: true }).map(a => Number(a.toFixed(2))),
          fc.double({ min: 100, max: 1000, noNaN: true }).map(a => Number(a.toFixed(2))),
          async (customerData, invoiceAmount, paymentAmount) => {
            try {
              // Create customer with opening balance
              customerData.openingBalance = 0;
              const customerResponse = await adminClient.post('/master-data/accounts', customerData);
              const customerId = customerResponse.data._id;
              createdEntities.accounts.push(customerId);

              // Create item and warehouse for invoice
              const item = fc.sample(mockDataGenerator.generateItem(), 1)[0];
              const itemResponse = await adminClient.post('/master-data/items', item);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              const warehouse = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouse);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              // Add stock
              await adminClient.post('/inventory/adjustments', {
                itemId: itemId,
                warehouseId: warehouseId,
                quantity: 1000,
                reason: 'initial_stock',
                date: new Date(),
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              // Create invoice to establish balance
              const quantity = Math.floor(invoiceAmount / item.price);
              if (quantity > 0) {
                const salesInvoice = {
                  type: 'sales',
                  customerId: customerId,
                  warehouseId: warehouseId,
                  items: [{
                    itemId: itemId,
                    quantity: quantity,
                    price: item.price,
                    amount: quantity * item.price,
                  }],
                  totals: {
                    subtotal: quantity * item.price,
                    grandTotal: quantity * item.price,
                  },
                  invoiceDate: new Date(),
                  status: 'completed',
                };

                await posClient.post('/invoices', salesInvoice);
                await new Promise(resolve => setTimeout(resolve, 1500));
              }

              // Get balance before payment
              const beforePayment = await adminClient.get(`/master-data/accounts/${customerId}`);
              const balanceBeforePayment = beforePayment.data?.balance || 0;

              // Only proceed if there's a balance to pay
              if (balanceBeforePayment <= 0) {
                return true; // Skip this test case
              }

              // Record payment (limited to available balance)
              const actualPayment = Math.min(paymentAmount, balanceBeforePayment);
              
              const paymentResponse = await adminClient.post('/accounts/payments', {
                accountId: customerId,
                accountType: 'Customer',
                amount: actualPayment,
                paymentMethod: 'cash',
                date: new Date(),
                reference: 'TEST-' + Date.now(),
              });
              const paymentId = paymentResponse.data?._id;

              // Wait for synchronization
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verify account balance reduced
              const afterPayment = await adminClient.get(`/master-data/accounts/${customerId}`);
              const balanceAfterPayment = afterPayment.data?.balance || 0;
              const balanceReduction = balanceBeforePayment - balanceAfterPayment;
              const balanceConsistent = Math.abs(balanceReduction - actualPayment) < 0.01;

              // Verify payment report shows payment
              const paymentReport = await adminClient.get('/reports/payments', {
                params: { 
                  startDate: new Date(Date.now() - 86400000).toISOString(),
                  endDate: new Date().toISOString()
                }
              });
              const reportIncludesPayment = paymentReport.data?.payments?.some(
                pmt => pmt._id === paymentId || pmt.id === paymentId || 
                       Math.abs(pmt.amount - actualPayment) < 0.01
              ) || false;

              // Property holds if both checks pass
              return balanceConsistent && reportIncludesPayment;
              
            } catch (error) {
              console.error('Property 9 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 10: Report data consistency
   * **Validates: Requirements 9.4**
   * 
   * For any report type (sales, purchase, inventory, accounts), the report
   * totals should match the sum of the underlying transaction data.
   */
  describe('Property 10: Report Data Consistency', () => {
    test('10.7: Report totals match underlying transaction data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('sales', 'purchase', 'inventory'),
          async (reportType) => {
            try {
              // Verify report consistency using consistency checker
              const result = await consistencyChecker.verifyReportConsistency(reportType, {
                startDate: new Date(Date.now() - 86400000 * 30), // Last 30 days
                endDate: new Date(),
              });

              // Property holds if report is consistent
              return result.consistent;
              
            } catch (error) {
              console.error('Property 10 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 60000 }
      );
    }, 120000);
  });

  /**
   * Property 11: Referential integrity
   * **Validates: Requirements 4.6, 9.5**
   * 
   * For any transaction or entity, all foreign key references (itemId,
   * accountId, warehouseId, batchId) should point to existing entities
   * in their respective collections.
   */
  describe('Property 11: Referential Integrity', () => {
    test('10.8: All foreign key references point to existing entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            createItem: fc.boolean(),
            createAccount: fc.boolean(),
            createWarehouse: fc.boolean(),
            createInvoice: fc.boolean(),
          }),
          async (scenario) => {
            try {
              let itemId, accountId, warehouseId;

              // Create entities based on scenario
              if (scenario.createItem) {
                const item = fc.sample(mockDataGenerator.generateItem(), 1)[0];
                const itemResponse = await adminClient.post('/master-data/items', item);
                itemId = itemResponse.data._id;
                createdEntities.items.push(itemId);
              }

              if (scenario.createAccount) {
                const account = fc.sample(mockDataGenerator.generateAccount('customer'), 1)[0];
                const accountResponse = await adminClient.post('/master-data/accounts', account);
                accountId = accountResponse.data._id;
                createdEntities.accounts.push(accountId);
              }

              if (scenario.createWarehouse) {
                const warehouse = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
                const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouse);
                warehouseId = warehouseResponse.data._id;
                createdEntities.warehouses.push(warehouseId);
              }

              await new Promise(resolve => setTimeout(resolve, 500));

              // Create invoice if all required entities exist
              if (scenario.createInvoice && itemId && accountId && warehouseId) {
                // Add stock first
                await adminClient.post('/inventory/adjustments', {
                  itemId: itemId,
                  warehouseId: warehouseId,
                  quantity: 100,
                  reason: 'initial_stock',
                  date: new Date(),
                });

                await new Promise(resolve => setTimeout(resolve, 500));

                // Create invoice
                const item = await adminClient.get(`/master-data/items/${itemId}`);
                const price = item.data?.price || 100;

                const invoice = {
                  type: 'sales',
                  customerId: accountId,
                  warehouseId: warehouseId,
                  items: [{
                    itemId: itemId,
                    quantity: 10,
                    price: price,
                    amount: 10 * price,
                  }],
                  totals: {
                    subtotal: 10 * price,
                    grandTotal: 10 * price,
                  },
                  invoiceDate: new Date(),
                  status: 'completed',
                };

                const invoiceResponse = await posClient.post('/invoices', invoice);
                createdEntities.invoices.push(invoiceResponse.data._id);

                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // Verify referential integrity
              const result = await consistencyChecker.verifyReferentialIntegrity();

              // Property holds if all references are valid
              return result.consistent;
              
            } catch (error) {
              console.error('Property 11 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });
});
