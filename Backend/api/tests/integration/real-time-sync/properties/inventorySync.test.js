/**
 * Property Test: Inventory Operation Synchronization
 * 
 * Feature: real-time-system-integration-testing
 * Property 3: Inventory operation synchronization
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * For any inventory operation (stock adjustment, batch update, stock transfer,
 * purchase receipt), when the operation is performed, both Admin and POS systems
 * should show consistent updated data within 2 seconds.
 * 
 * This property test verifies that all inventory operations propagate to both
 * Admin and POS systems in real-time with acceptable latency.
 */

const fc = require('fast-check');
const { TestHarness } = require('../components/testHarness');
const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const mockDataGenerator = require('../components/mockDataGenerator');
const syncVerifier = require('../components/syncVerifier');
const config = require('../config/testConfig');

describe('Property 3: Inventory Operation Synchronization', () => {
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
    
    // Create test data needed for inventory operations
    testData = {
      items: [],
      warehouses: [],
      batches: [],
      suppliers: [],
    };

    // Create test items
    for (let i = 0; i < 3; i++) {
      const itemData = fc.sample(mockDataGenerator.generateItem(), 1)[0];
      itemData.isActive = true;
      const itemResponse = await adminClient.post('/master-data/items', itemData);
      testData.items.push(itemResponse.data);
    }

    // Create test warehouses
    for (let i = 0; i < 2; i++) {
      const warehouseData = fc.sample(mockDataGenerator.generateWarehouse(), 1)[0];
      warehouseData.isActive = true;
      const warehouseResponse = await adminClient.post('/master-data/warehouses', warehouseData);
      testData.warehouses.push(warehouseResponse.data);
    }

    // Create a test supplier
    const supplierData = fc.sample(mockDataGenerator.generateAccount('supplier'), 1)[0];
    const supplierResponse = await adminClient.post('/master-data/accounts', supplierData);
    testData.suppliers.push(supplierResponse.data);

    // Add initial stock for items
    for (const item of testData.items) {
      for (const warehouse of testData.warehouses) {
        await adminClient.post('/inventory/adjustments', {
          itemId: item._id,
          warehouseId: warehouse._id,
          quantity: 500,
          reason: 'initial_stock',
          date: new Date(),
        });
      }
    }
  });

  afterAll(async () => {
    await harness.teardown();
  });

  /**
   * Property Test: Stock adjustment synchronizes to POS
   * Validates: Requirement 3.1
   */
  test('Property 3.1: Stock adjustment synchronizes to POS within 2 seconds', async () => {
    const item = testData.items[0];
    const warehouse = testData.warehouses[0];

    await fc.assert(
      fc.asyncProperty(
        mockDataGenerator.generateStockAdjustment(item._id, warehouse._id),
        async (adjustmentData) => {
          // Get initial inventory in both systems
          const initialAdminInv = await adminClient.get(`/inventory/items/${item._id}`, {
            params: { warehouseId: warehouse._id }
          });
          const initialQuantity = initialAdminInv.data?.quantity || 0;

          // Perform admin operation: stock adjustment
          const adminAction = async () => {
            const response = await adminClient.post('/inventory/adjustments', adjustmentData);
            return response.data;
          };

          // Query POS for updated inventory
          const posQuery = async () => {
            try {
              const response = await posClient.get(`/inventory/items/${item._id}`, {
                params: { warehouseId: warehouse._id }
              });
              return response.data;
            } catch (error) {
              return null;
            }
          };

          // Verify POS shows updated quantity
          const verifyPredicate = (posInventory) => {
            if (!posInventory) return false;
            
            const expectedQuantity = initialQuantity + adjustmentData.quantity;
            const actualQuantity = posInventory.quantity || 0;
            
            return Math.abs(actualQuantity - expectedQuantity) < 0.01;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyAdminToPOS({
            type: 'create',
            module: 'inventory',
            entity: 'adjustment',
            adminAction,
            posQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 5 }
    );
  }, 120000);

  /**
   * Property Test: Stock adjustment reflects in Admin reports
   * Validates: Requirement 3.2
   */
  test('Property 3.2: Stock adjustment reflects in Admin reports within 2 seconds', async () => {
    const item = testData.items[0];
    const warehouse = testData.warehouses[0];

    const adjustmentData = fc.sample(
      mockDataGenerator.generateStockAdjustment(item._id, warehouse._id),
      1
    )[0];

    // Get initial inventory
    const initialAdminInv = await adminClient.get(`/inventory/items/${item._id}`, {
      params: { warehouseId: warehouse._id }
    });
    const initialQuantity = initialAdminInv.data?.quantity || 0;

    // Perform admin operation: stock adjustment
    const adminAction = async () => {
      const response = await adminClient.post('/inventory/adjustments', adjustmentData);
      return response.data;
    };

    // Query Admin inventory report
    const adminQuery = async () => {
      try {
        const response = await adminClient.get('/reports/inventory', {
          params: {
            itemId: item._id,
            warehouseId: warehouse._id,
          }
        });
        return response.data;
      } catch (error) {
        return null;
      }
    };

    // Verify report shows updated quantity
    const verifyPredicate = (inventoryReport) => {
      if (!inventoryReport) return false;
      
      const expectedQuantity = initialQuantity + adjustmentData.quantity;
      const actualQuantity = inventoryReport.quantity || inventoryReport.currentQuantity || 0;
      
      return Math.abs(actualQuantity - expectedQuantity) < 0.01;
    };

    // Verify synchronization
    const result = await syncVerifier.verifyAdminToPOS({
      type: 'create',
      module: 'inventory',
      entity: 'adjustment',
      adminAction,
      adminQuery,
      verifyPredicate,
    }, config.maxSyncLatency);

    expect(result.synchronized).toBe(true);
    expect(result.error).toBeNull();
  }, 30000);

  /**
   * Property Test: Batch expiry updates synchronize to POS
   * Validates: Requirement 3.3
   */
  test('Property 3.3: Batch expiry updates synchronize to POS within 2 seconds', async () => {
    const item = testData.items[0];
    const warehouse = testData.warehouses[0];

    // First create a batch
    const batchData = fc.sample(mockDataGenerator.generateBatch(item._id), 1)[0];
    batchData.warehouseId = warehouse._id;
    const batchResponse = await adminClient.post('/inventory/batches', batchData);
    const batchId = batchResponse.data._id;
    testData.batches.push(batchId);

    // Wait for batch to sync
    await syncVerifier.sleep(2000);

    // Update batch expiry date
    const newExpiryDate = fc.sample(mockDataGenerator.expiryDateArbitrary(), 1)[0];

    const adminAction = async () => {
      const response = await adminClient.put(`/inventory/batches/${batchId}`, {
        expiryDate: newExpiryDate,
      });
      return response.data;
    };

    // Query POS for updated batch
    const posQuery = async () => {
      try {
        const response = await posClient.get(`/inventory/batches/${batchId}`);
        return response.data;
      } catch (error) {
        return null;
      }
    };

    // Verify POS shows updated expiry date
    const verifyPredicate = (posBatch) => {
      if (!posBatch) return false;
      
      const expectedDate = new Date(newExpiryDate).toISOString().split('T')[0];
      const actualDate = new Date(posBatch.expiryDate).toISOString().split('T')[0];
      
      return expectedDate === actualDate;
    };

    // Verify synchronization
    const result = await syncVerifier.verifyAdminToPOS({
      type: 'update',
      module: 'inventory',
      entity: 'batch',
      adminAction,
      posQuery,
      verifyPredicate,
    }, config.maxSyncLatency);

    expect(result.synchronized).toBe(true);
    expect(result.error).toBeNull();
  }, 30000);

  /**
   * Property Test: Stock transfer updates both warehouses
   * Validates: Requirement 3.4
   */
  test('Property 3.4: Stock transfer updates both warehouses within 2 seconds', async () => {
    const item = testData.items[0];
    const sourceWarehouse = testData.warehouses[0];
    const targetWarehouse = testData.warehouses[1];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        async (transferQuantity) => {
          // Get initial inventory in both warehouses
          const initialSourceInv = await adminClient.get(`/inventory/items/${item._id}`, {
            params: { warehouseId: sourceWarehouse._id }
          });
          const initialSourceQty = initialSourceInv.data?.quantity || 0;

          const initialTargetInv = await adminClient.get(`/inventory/items/${item._id}`, {
            params: { warehouseId: targetWarehouse._id }
          });
          const initialTargetQty = initialTargetInv.data?.quantity || 0;

          // Perform admin operation: stock transfer
          const adminAction = async () => {
            const response = await adminClient.post('/inventory/transfers', {
              itemId: item._id,
              sourceWarehouseId: sourceWarehouse._id,
              targetWarehouseId: targetWarehouse._id,
              quantity: transferQuantity,
              date: new Date(),
            });
            return response.data;
          };

          // Query both Admin and POS for updated inventory
          const queryBothSystems = async () => {
            const adminSource = await adminClient.get(`/inventory/items/${item._id}`, {
              params: { warehouseId: sourceWarehouse._id }
            });
            const adminTarget = await adminClient.get(`/inventory/items/${item._id}`, {
              params: { warehouseId: targetWarehouse._id }
            });

            const posSource = await posClient.get(`/inventory/items/${item._id}`, {
              params: { warehouseId: sourceWarehouse._id }
            });
            const posTarget = await posClient.get(`/inventory/items/${item._id}`, {
              params: { warehouseId: targetWarehouse._id }
            });

            return {
              adminSource: adminSource.data,
              adminTarget: adminTarget.data,
              posSource: posSource.data,
              posTarget: posTarget.data,
            };
          };

          // Verify both warehouses updated in both systems
          const verifyPredicate = (data) => {
            const expectedSourceQty = initialSourceQty - transferQuantity;
            const expectedTargetQty = initialTargetQty + transferQuantity;

            const adminSourceMatch = Math.abs((data.adminSource?.quantity || 0) - expectedSourceQty) < 0.01;
            const adminTargetMatch = Math.abs((data.adminTarget?.quantity || 0) - expectedTargetQty) < 0.01;
            const posSourceMatch = Math.abs((data.posSource?.quantity || 0) - expectedSourceQty) < 0.01;
            const posTargetMatch = Math.abs((data.posTarget?.quantity || 0) - expectedTargetQty) < 0.01;

            return adminSourceMatch && adminTargetMatch && posSourceMatch && posTargetMatch;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyAdminToPOS({
            type: 'create',
            module: 'inventory',
            entity: 'transfer',
            adminAction,
            posQuery: queryBothSystems,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 2 }
    );
  }, 120000);

  /**
   * Property Test: Purchase receipt increases POS stock availability
   * Validates: Requirement 3.5
   */
  test('Property 3.5: Purchase receipt increases POS stock availability within 2 seconds', async () => {
    const supplier = testData.suppliers[0];
    const warehouse = testData.warehouses[0];
    const items = testData.items.map(item => ({ id: item._id, price: item.price }));

    await fc.assert(
      fc.asyncProperty(
        mockDataGenerator.generatePurchaseInvoice(supplier._id, warehouse._id, items),
        async (purchaseData) => {
          // Get initial inventory in POS
          const initialPosInventory = {};
          for (const purchaseItem of purchaseData.items) {
            const invResponse = await posClient.get(`/inventory/items/${purchaseItem.itemId}`, {
              params: { warehouseId: warehouse._id }
            });
            initialPosInventory[purchaseItem.itemId] = invResponse.data?.quantity || 0;
          }

          // Perform admin operation: create purchase invoice
          const adminAction = async () => {
            const response = await adminClient.post('/purchase/invoices', purchaseData);
            return response.data;
          };

          // Query POS for updated inventory
          const posQuery = async () => {
            const updatedInventory = {};
            for (const purchaseItem of purchaseData.items) {
              const invResponse = await posClient.get(`/inventory/items/${purchaseItem.itemId}`, {
                params: { warehouseId: warehouse._id }
              });
              updatedInventory[purchaseItem.itemId] = invResponse.data?.quantity || 0;
            }
            return updatedInventory;
          };

          // Verify POS inventory increased by purchase quantities
          const verifyPredicate = (updatedInventory) => {
            for (const purchaseItem of purchaseData.items) {
              const expected = initialPosInventory[purchaseItem.itemId] + purchaseItem.quantity;
              const actual = updatedInventory[purchaseItem.itemId];
              
              if (Math.abs(actual - expected) > 0.01) {
                return false;
              }
            }
            return true;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyAdminToPOS({
            type: 'create',
            module: 'purchase',
            entity: 'invoice',
            adminAction,
            posQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 2 }
    );
  }, 120000);
});
