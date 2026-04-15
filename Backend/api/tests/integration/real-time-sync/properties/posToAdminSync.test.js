/**
 * Property Test: POS to Admin Synchronization
 * 
 * Feature: real-time-system-integration-testing
 * Property 2: POS to Admin synchronization latency
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * For any POS operation (invoice creation, payment processing, sales return),
 * when the operation is performed via the POS API, the Admin API should reflect
 * the change in all affected modules (inventory, accounts, reports) within 2 seconds.
 * 
 * This property test verifies that all POS transactions propagate to the Admin
 * system in real-time with acceptable latency, updating inventory, accounts, and reports.
 */

const fc = require('fast-check');
const { TestHarness } = require('../components/testHarness');
const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const mockDataGenerator = require('../components/mockDataGenerator');
const syncVerifier = require('../components/syncVerifier');
const config = require('../config/testConfig');

describe('Property 2: POS to Admin Synchronization Latency', () => {
  let harness;
  let adminClient;
  let posClient;
  let testData;

  beforeAll(async () => {
    harness = new TestHarness({ verbose: true });
    await harness.setup();
    
    const clients = harness.getClients();
    adminClient = clients.adminClient;
    posClient = clients.posClient;
    
    // Create test data needed for POS operations
    testData = {
      items: [],
      customers: [],
      warehouses: [],
      invoices: [],
    };

    // Create a test customer
    const customerData = fc.sample(mockDataGenerator.generateAccount('customer'), 1)[0];
    const customerResponse = await adminClient.post('/master-data/accounts', customerData);
    testData.customers.push(customerResponse.data);

    // Create test items
    for (let i = 0; i < 3; i++) {
      const itemData = fc.sample(mockDataGenerator.generateItem(), 1)[0];
      itemData.isActive = true;
      const itemResponse = await adminClient.post('/master-data/items', itemData);
      testData.items.push(itemResponse.data);
    }

    // Create a test warehouse
    const warehouseData = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
    warehouseData.isActive = true;
    const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
    testData.warehouses.push(warehouseResponse.data);

    // Add initial stock for items
    for (const item of testData.items) {
      await adminClient.post('/inventory/adjustments', {
        itemId: item._id,
        warehouseId: testData.warehouses[0]._id,
        quantity: 1000,
        reason: 'initial_stock',
        date: new Date(),
      });
    }
  });

  afterAll(async () => {
    await harness.teardown();
  });

  /**
   * Property Test: Invoice creation reduces inventory in Admin
   * Validates: Requirement 2.1
   */
  test('Property 2.1: Invoice creation reduces Admin inventory within 2 seconds', async () => {
    const customer = testData.customers[0];
    const warehouse = testData.warehouses[0];
    const items = testData.items.map(item => ({ id: item._id, price: item.price }));

    await fc.assert(
      fc.asyncProperty(
        mockDataGenerator.generateSalesInvoice(customer._id, warehouse._id, items),
        async (invoiceData) => {
          // Get initial inventory levels
          const initialInventory = {};
          for (const invoiceItem of invoiceData.items) {
            const invResponse = await adminClient.get(`/inventory/items/${invoiceItem.itemId}`, {
              params: { warehouseId: warehouse._id }
            });
            initialInventory[invoiceItem.itemId] = invResponse.data?.quantity || 0;
          }

          // Perform POS operation: create invoice
          const posAction = async () => {
            const response = await posClient.post('/invoices', invoiceData);
            testData.invoices.push(response.data._id);
            return response.data;
          };

          // Query Admin for updated inventory
          const adminQuery = async () => {
            const updatedInventory = {};
            for (const invoiceItem of invoiceData.items) {
              const invResponse = await adminClient.get(`/inventory/items/${invoiceItem.itemId}`, {
                params: { warehouseId: warehouse._id }
              });
              updatedInventory[invoiceItem.itemId] = invResponse.data?.quantity || 0;
            }
            return updatedInventory;
          };

          // Verify inventory is reduced by invoice quantities
          const verifyPredicate = (updatedInventory) => {
            for (const invoiceItem of invoiceData.items) {
              const expected = initialInventory[invoiceItem.itemId] - invoiceItem.quantity;
              const actual = updatedInventory[invoiceItem.itemId];
              
              if (Math.abs(actual - expected) > 0.01) {
                return false;
              }
            }
            return true;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyPOSToAdmin({
            type: 'create',
            module: 'sales',
            entity: 'invoice',
            posAction,
            adminQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 2 }
    );
  }, 120000);

  /**
   * Property Test: Invoice creation updates account balance in Admin
   * Validates: Requirement 2.2
   */
  test('Property 2.2: Invoice creation updates Admin account balance within 2 seconds', async () => {
    const customer = testData.customers[0];
    const warehouse = testData.warehouses[0];
    const items = testData.items.map(item => ({ id: item._id, price: item.price }));

    await fc.assert(
      fc.asyncProperty(
        mockDataGenerator.generateSalesInvoice(customer._id, warehouse._id, items),
        async (invoiceData) => {
          // Get initial account balance
          const initialAccountResponse = await adminClient.get(`/master-data/accounts/${customer._id}`);
          const initialBalance = initialAccountResponse.data?.balance || 0;

          // Perform POS operation: create invoice
          const posAction = async () => {
            const response = await posClient.post('/invoices', invoiceData);
            testData.invoices.push(response.data._id);
            return response.data;
          };

          // Query Admin for updated account balance
          const adminQuery = async () => {
            const response = await adminClient.get(`/master-data/accounts/${customer._id}`);
            return response.data;
          };

          // Verify account balance increased by invoice total
          const verifyPredicate = (account) => {
            const expectedBalance = initialBalance + invoiceData.totalAmount;
            const actualBalance = account?.balance || 0;
            
            return Math.abs(actualBalance - expectedBalance) < 0.01;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyPOSToAdmin({
            type: 'create',
            module: 'sales',
            entity: 'invoice',
            posAction,
            adminQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 2 }
    );
  }, 120000);

  /**
   * Property Test: Invoice appears in Admin sales reports
   * Validates: Requirement 2.3
   */
  test('Property 2.3: Invoice appears in Admin sales reports within 2 seconds', async () => {
    const customer = testData.customers[0];
    const warehouse = testData.warehouses[0];
    const items = testData.items.map(item => ({ id: item._id, price: item.price }));

    const invoiceData = fc.sample(
      mockDataGenerator.generateSalesInvoice(customer._id, warehouse._id, items),
      1
    )[0];

    // Perform POS operation: create invoice
    const posAction = async () => {
      const response = await posClient.post('/invoices', invoiceData);
      testData.invoices.push(response.data._id);
      return response.data;
    };

    // Query Admin for sales reports
    const adminQuery = async () => {
      try {
        const response = await adminClient.get('/reports/sales', {
          params: {
            startDate: new Date(Date.now() - 60000).toISOString(),
            endDate: new Date(Date.now() + 60000).toISOString(),
          }
        });
        return response.data || [];
      } catch (error) {
        return [];
      }
    };

    // Verify invoice appears in sales report
    const verifyPredicate = (salesReport) => {
      if (!Array.isArray(salesReport)) return false;
      
      return salesReport.some(report => 
        Math.abs(report.totalAmount - invoiceData.totalAmount) < 0.01
      );
    };

    // Verify synchronization
    const result = await syncVerifier.verifyPOSToAdmin({
      type: 'create',
      module: 'sales',
      entity: 'invoice',
      posAction,
      adminQuery,
      verifyPredicate,
    }, config.maxSyncLatency);

    expect(result.synchronized).toBe(true);
    expect(result.error).toBeNull();
  }, 30000);

  /**
   * Property Test: Payment processing updates Admin account statements
   * Validates: Requirement 2.4
   */
  test('Property 2.4: Payment processing updates Admin account statements within 2 seconds', async () => {
    const customer = testData.customers[0];

    await fc.assert(
      fc.asyncProperty(
        mockDataGenerator.generatePayment(customer._id, 5000),
        async (paymentData) => {
          // Get initial account balance
          const initialAccountResponse = await adminClient.get(`/master-data/accounts/${customer._id}`);
          const initialBalance = initialAccountResponse.data?.balance || 0;

          // Perform POS operation: process payment
          const posAction = async () => {
            const response = await posClient.post('/payments', paymentData);
            return response.data;
          };

          // Query Admin for updated account
          const adminQuery = async () => {
            const response = await adminClient.get(`/master-data/accounts/${customer._id}`);
            return response.data;
          };

          // Verify account balance reduced by payment amount
          const verifyPredicate = (account) => {
            const expectedBalance = initialBalance - paymentData.amount;
            const actualBalance = account?.balance || 0;
            
            return Math.abs(actualBalance - expectedBalance) < 0.01;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyPOSToAdmin({
            type: 'create',
            module: 'payments',
            entity: 'payment',
            posAction,
            adminQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 2 }
    );
  }, 120000);

  /**
   * Property Test: Sales return increases Admin inventory
   * Validates: Requirement 2.5
   */
  test('Property 2.5: Sales return increases Admin inventory within 2 seconds', async () => {
    // First create an invoice to return
    const customer = testData.customers[0];
    const warehouse = testData.warehouses[0];
    const items = testData.items.map(item => ({ id: item._id, price: item.price }));
    
    const invoiceData = fc.sample(
      mockDataGenerator.generateSalesInvoice(customer._id, warehouse._id, items),
      1
    )[0];
    
    const invoiceResponse = await posClient.post('/invoices', invoiceData);
    const invoiceId = invoiceResponse.data._id;
    testData.invoices.push(invoiceId);

    // Wait for invoice to sync
    await syncVerifier.sleep(2000);

    // Get inventory levels after invoice
    const inventoryAfterInvoice = {};
    for (const invoiceItem of invoiceData.items) {
      const invResponse = await adminClient.get(`/inventory/items/${invoiceItem.itemId}`, {
        params: { warehouseId: warehouse._id }
      });
      inventoryAfterInvoice[invoiceItem.itemId] = invResponse.data?.quantity || 0;
    }

    // Create return data
    const returnData = {
      invoiceId,
      items: invoiceData.items.map(item => ({
        itemId: item.itemId,
        quantity: Math.floor(item.quantity / 2), // Return half
        reason: 'customer_return',
      })),
      date: new Date(),
    };

    // Perform POS operation: create sales return
    const posAction = async () => {
      const response = await posClient.post('/returns', returnData);
      return response.data;
    };

    // Query Admin for updated inventory
    const adminQuery = async () => {
      const updatedInventory = {};
      for (const returnItem of returnData.items) {
        const invResponse = await adminClient.get(`/inventory/items/${returnItem.itemId}`, {
          params: { warehouseId: warehouse._id }
        });
        updatedInventory[returnItem.itemId] = invResponse.data?.quantity || 0;
      }
      return updatedInventory;
    };

    // Verify inventory increased by return quantities
    const verifyPredicate = (updatedInventory) => {
      for (const returnItem of returnData.items) {
        const expected = inventoryAfterInvoice[returnItem.itemId] + returnItem.quantity;
        const actual = updatedInventory[returnItem.itemId];
        
        if (Math.abs(actual - expected) > 0.01) {
          return false;
        }
      }
      return true;
    };

    // Verify synchronization
    const result = await syncVerifier.verifyPOSToAdmin({
      type: 'create',
      module: 'sales',
      entity: 'return',
      posAction,
      adminQuery,
      verifyPredicate,
    }, config.maxSyncLatency);

    expect(result.synchronized).toBe(true);
    expect(result.error).toBeNull();
  }, 30000);
});
