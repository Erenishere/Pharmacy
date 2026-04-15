/**
 * Property Tests: Concurrent Operations
 * 
 * Feature: real-time-system-integration-testing
 * Properties 12-16: Concurrent operation handling and atomicity
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
 * 
 * These property tests verify that the system correctly handles concurrent
 * operations from multiple users without data corruption, race conditions,
 * or lost updates.
 */

const fc = require('fast-check');
const { TestHarness } = require('../components/testHarness');
const mockDataGenerator = require('../components/mockDataGenerator');
const { executeConcurrent } = require('../components/concurrentExecutor');

describe('Concurrent Operations Property Tests', () => {
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
   * Property 12: Concurrent operations on different entities
   * **Validates: Requirements 5.1, 5.4**
   */
  describe('Property 12: Concurrent Operations on Different Entities', () => {
    test('11.1: Concurrent operations on different entities complete successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockDataGenerator.generateItem(), { minLength: 3, maxLength: 10 }),
          fc.array(mockDataGenerator.generateAccount('customer'), { minLength: 3, maxLength: 10 }),
          fc.array(mockDataGenerator.generateWarehouse(), { minLength: 2, maxLength: 5 }),
          async (items, accounts, warehouses) => {
            try {
              const operations = [];

              for (const item of items) {
                operations.push(async () => {
                  const response = await adminClient.post('/master-data/items', item);
                  createdEntities.items.push(response.data._id);
                  return { type: 'item', id: response.data._id };
                });
              }

              for (const account of accounts) {
                operations.push(async () => {
                  const response = await adminClient.post('/master-data/accounts', account);
                  createdEntities.accounts.push(response.data._id);
                  return { type: 'account', id: response.data._id };
                });
              }

              for (const warehouse of warehouses) {
                operations.push(async () => {
                  const response = await adminClient.post('/master-data/warehouses', warehouse);
                  createdEntities.warehouses.push(response.data._id);
                  return { type: 'warehouse', id: response.data._id };
                });
              }

              const result = await executeConcurrent(operations, null, {
                detectConflicts: true,
                failFast: false,
                getEntityId: (result) => result?.id,
              });

              const allSucceeded = result.failedOperations === 0;
              const expectedTotal = items.length + accounts.length + warehouses.length;
              const noDataLoss = result.successfulOperations === expectedTotal;
              const noConflicts = result.conflicts === 0;

              return allSucceeded && noDataLoss && noConflicts;
              
            } catch (error) {
              console.error('Property 12 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 13: Concurrent invoice creation
   * **Validates: Requirements 5.2**
   */
  describe('Property 13: Concurrent Invoice Creation', () => {
    test('11.2: Concurrent invoices correctly decrement inventory', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateWarehouse(),
          fc.array(
            fc.record({
              customer: mockDataGenerator.generateAccount('customer'),
              quantity: fc.integer({ min: 5, max: 20 }),
            }),
            { minLength: 3, maxLength: 8 }
          ),
          async (itemData, warehouseData, invoiceSpecs) => {
            try {
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              await new Promise(resolve => setTimeout(resolve, 500));

              const totalQuantity = invoiceSpecs.reduce((sum, spec) => sum + spec.quantity, 0);

              await adminClient.post('/inventory/adjustments', {
                itemId: itemId,
                warehouseId: warehouseId,
                quantity: totalQuantity + 100,
                reason: 'initial_stock',
                date: new Date(),
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              const initialInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const initialQty = initialInventory.data?.[0]?.quantity || 0;

              const operations = [];
              
              for (const spec of invoiceSpecs) {
                const customerResponse = await adminClient.post('/master-data/accounts', spec.customer);
                const customerId = customerResponse.data._id;
                createdEntities.accounts.push(customerId);

                operations.push(async () => {
                  const invoiceAmount = spec.quantity * itemData.price;
                  const salesInvoice = {
                    type: 'sales',
                    customerId: customerId,
                    warehouseId: warehouseId,
                    items: [{
                      itemId: itemId,
                      quantity: spec.quantity,
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

                  const response = await posClient.post('/invoices', salesInvoice);
                  createdEntities.invoices.push(response.data._id);
                  return { invoiceId: response.data._id, quantity: spec.quantity };
                });
              }

              await new Promise(resolve => setTimeout(resolve, 500));

              const result = await executeConcurrent(operations, null, {
                detectConflicts: true,
                failFast: false,
              });

              await new Promise(resolve => setTimeout(resolve, 3000));

              const finalInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const finalQty = finalInventory.data?.[0]?.quantity || 0;

              const expectedFinalQty = initialQty - totalQuantity;
              const inventoryCorrect = Math.abs(finalQty - expectedFinalQty) < 0.01;
              const allSucceeded = result.failedOperations === 0;

              return allSucceeded && inventoryCorrect;
              
            } catch (error) {
              console.error('Property 13 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 14: Concurrent cross-module operations
   * **Validates: Requirements 5.3**
   */
  describe('Property 14: Concurrent Cross-Module Operations', () => {
    test('11.3: Admin updates and POS operations can run concurrently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockDataGenerator.generateItem(), { minLength: 2, maxLength: 5 }),
          fc.array(
            fc.record({
              itemUpdate: fc.record({
                price: fc.double({ min: 10, max: 1000, noNaN: true }).map(p => Number(p.toFixed(2))),
                isActive: fc.boolean(),
              }),
              invoice: fc.record({
                customer: mockDataGenerator.generateAccount('customer'),
                quantity: fc.integer({ min: 5, max: 20 }),
              }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (items, operationSpecs) => {
            try {
              const createdItems = [];
              for (const item of items) {
                const response = await adminClient.post('/master-data/items', item);
                createdItems.push({ id: response.data._id, price: item.price });
                createdEntities.items.push(response.data._id);
              }

              const warehouse = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouse);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              await new Promise(resolve => setTimeout(resolve, 500));

              for (const item of createdItems) {
                await adminClient.post('/inventory/adjustments', {
                  itemId: item.id,
                  warehouseId: warehouseId,
                  quantity: 1000,
                  reason: 'initial_stock',
                  date: new Date(),
                });
              }

              await new Promise(resolve => setTimeout(resolve, 1000));

              const operations = [];
              
              for (let i = 0; i < operationSpecs.length; i++) {
                const spec = operationSpecs[i];
                const item = createdItems[i % createdItems.length];

                operations.push(async () => {
                  const response = await adminClient.put(`/master-data/items/${item.id}`, {
                    price: spec.itemUpdate.price,
                    isActive: spec.itemUpdate.isActive,
                  });
                  return { type: 'admin_update', itemId: item.id };
                });

                const customerResponse = await adminClient.post('/master-data/accounts', spec.invoice.customer);
                const customerId = customerResponse.data._id;
                createdEntities.accounts.push(customerId);

                operations.push(async () => {
                  const invoiceAmount = spec.invoice.quantity * item.price;
                  const salesInvoice = {
                    type: 'sales',
                    customerId: customerId,
                    warehouseId: warehouseId,
                    items: [{
                      itemId: item.id,
                      quantity: spec.invoice.quantity,
                      price: item.price,
                      amount: invoiceAmount,
                    }],
                    totals: {
                      subtotal: invoiceAmount,
                      grandTotal: invoiceAmount,
                    },
                    invoiceDate: new Date(),
                    status: 'completed',
                  };

                  const response = await posClient.post('/invoices', salesInvoice);
                  createdEntities.invoices.push(response.data._id);
                  return { type: 'pos_invoice', invoiceId: response.data._id };
                });
              }

              await new Promise(resolve => setTimeout(resolve, 500));

              const result = await executeConcurrent(operations, null, {
                detectConflicts: false,
                failFast: false,
              });

              await new Promise(resolve => setTimeout(resolve, 2000));

              const allSucceeded = result.failedOperations === 0;
              const noConflictErrors = !result.errors.some(e => 
                e.message?.includes('conflict') || 
                e.message?.includes('lock') ||
                e.message?.includes('concurrent')
              );

              return allSucceeded && noConflictErrors;
              
            } catch (error) {
              console.error('Property 14 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 15: Serialization for same-entity operations
   * **Validates: Requirements 5.5**
   */
  describe('Property 15: Same-Entity Operation Serialization', () => {
    test('11.4: Concurrent updates to same entity are properly serialized', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          fc.array(
            fc.record({
              price: fc.double({ min: 10, max: 1000, noNaN: true }).map(p => Number(p.toFixed(2))),
              isActive: fc.boolean(),
            }),
            { minLength: 3, maxLength: 8 }
          ),
          async (itemData, updates) => {
            try {
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              await new Promise(resolve => setTimeout(resolve, 500));

              const operations = updates.map((update, index) => async () => {
                const response = await adminClient.put(`/master-data/items/${itemId}`, {
                  price: update.price,
                  isActive: update.isActive,
                });
                return { updateIndex: index, price: update.price, isActive: update.isActive };
              });

              const result = await executeConcurrent(operations, null, {
                detectConflicts: true,
                failFast: false,
                getEntityId: () => itemId,
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              const finalItem = await adminClient.get(`/master-data/items/${itemId}`);
              const finalState = finalItem.data;

              const allCompleted = result.failedOperations === 0;
              const matchesAnUpdate = updates.some(update => 
                Math.abs(finalState.price - update.price) < 0.01 &&
                finalState.isActive === update.isActive
              );

              return allCompleted && matchesAnUpdate;
              
            } catch (error) {
              console.error('Property 15 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });

  /**
   * Property 16: Transaction atomicity
   * **Validates: Requirements 5.6**
   */
  describe('Property 16: Transaction Atomicity', () => {
    test('11.5: Transactions are atomic - all or nothing', async () => {
      await fc.assert(
        fc.asyncProperty(
          mockDataGenerator.generateItem(),
          mockDataGenerator.generateAccount('customer'),
          mockDataGenerator.generateWarehouse(),
          fc.integer({ min: 10, max: 100 }),
          fc.boolean(),
          async (itemData, customerData, warehouseData, quantity, shouldFail) => {
            try {
              const itemResponse = await adminClient.post('/master-data/items', itemData);
              const itemId = itemResponse.data._id;
              createdEntities.items.push(itemId);

              const customerResponse = await adminClient.post('/master-data/accounts', customerData);
              const customerId = customerResponse.data._id;
              createdEntities.accounts.push(customerId);

              const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
              const warehouseId = warehouseResponse.data._id;
              createdEntities.warehouses.push(warehouseId);

              await new Promise(resolve => setTimeout(resolve, 500));

              await adminClient.post('/inventory/adjustments', {
                itemId: itemId,
                warehouseId: warehouseId,
                quantity: quantity + 100,
                reason: 'initial_stock',
                date: new Date(),
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              const initialInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const initialQty = initialInventory.data?.[0]?.quantity || 0;

              const initialAccount = await adminClient.get(`/master-data/accounts/${customerId}`);
              const initialBalance = initialAccount.data?.balance || customerData.openingBalance || 0;

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

              if (shouldFail) {
                salesInvoice.items.push({
                  itemId: 'invalid-item-id-that-does-not-exist',
                  quantity: 1,
                  price: 100,
                  amount: 100,
                });
              }

              let invoiceCreated = false;

              try {
                const invoiceResponse = await posClient.post('/invoices', salesInvoice);
                createdEntities.invoices.push(invoiceResponse.data._id);
                invoiceCreated = true;
              } catch (error) {
                invoiceCreated = false;
              }

              await new Promise(resolve => setTimeout(resolve, 2000));

              const finalInventory = await adminClient.get('/inventory', {
                params: { itemId: itemId, warehouseId: warehouseId }
              });
              const finalQty = finalInventory.data?.[0]?.quantity || 0;

              const finalAccount = await adminClient.get(`/master-data/accounts/${customerId}`);
              const finalBalance = finalAccount.data?.balance || 0;

              let atomicityHolds = false;

              if (invoiceCreated) {
                const inventoryDecremented = Math.abs((initialQty - finalQty) - quantity) < 0.01;
                const accountIncremented = Math.abs((finalBalance - initialBalance) - invoiceAmount) < 0.01;
                atomicityHolds = inventoryDecremented && accountIncremented;
              } else {
                const inventoryUnchanged = Math.abs(finalQty - initialQty) < 0.01;
                const accountUnchanged = Math.abs(finalBalance - initialBalance) < 0.01;
                atomicityHolds = inventoryUnchanged && accountUnchanged;
              }

              return atomicityHolds;
              
            } catch (error) {
              console.error('Property 16 test error:', error.message);
              return false;
            }
          }
        ),
        { numRuns: 2, timeout: 120000 }
      );
    }, 180000);
  });
});
