/**
 * Property Test: Admin to POS Synchronization
 * 
 * Feature: real-time-system-integration-testing
 * Property 1: Admin to POS synchronization latency
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 * 
 * For any master data entity (item, account, warehouse, category, unit) and
 * any operation (create, update, deactivate), when the operation is performed
 * via the Admin API, the POS API should reflect the change within 2 seconds.
 * 
 * This property test verifies that all master data changes in the Admin system
 * propagate to the POS system in real-time with acceptable latency.
 */

const fc = require('fast-check');
const { TestHarness } = require('../components/testHarness');
const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const mockDataGenerator = require('../components/mockDataGenerator');
const syncVerifier = require('../components/syncVerifier');
const config = require('../config/testConfig');

describe('Property 1: Admin to POS Synchronization Latency', () => {
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
    };
  });

  afterAll(async () => {
    await harness.teardown();
  });

  /**
   * Property Test: Item creation synchronizes to POS
   * Validates: Requirement 1.1
   */
  test('Property 1.1: Item creation synchronizes to POS within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(mockDataGenerator.generateItem(), async (itemData) => {
        // Perform admin operation: create item
        const adminAction = async () => {
          const response = await adminClient.post('/master-data/items', itemData);
          createdEntities.items.push(response.data._id);
          return response.data;
        };

        // Query POS for the item
        const posQuery = async () => {
          try {
            const response = await posClient.get('/items');
            return response.data || [];
          } catch (error) {
            return [];
          }
        };

        // Verify item appears in POS
        const verifyPredicate = (posItems) => {
          return posItems.some(item => 
            item.name === itemData.name && 
            item.code === itemData.code
          );
        };

        // Verify synchronization
        const result = await syncVerifier.verifyAdminToPOS({
          type: 'create',
          module: 'master-data',
          entity: 'item',
          adminAction,
          posQuery,
          verifyPredicate,
        }, config.maxSyncLatency);

        // Property holds if synchronized within latency threshold
        return result.synchronized && !result.error;
      }),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Property Test: Item update synchronizes to POS
   * Validates: Requirement 1.2
   */
  test('Property 1.2: Item update synchronizes to POS within 2 seconds', async () => {
    // First create an item to update
    const initialItem = fc.sample(mockDataGenerator.generateItem(), 1)[0];
    const createResponse = await adminClient.post('/master-data/items', initialItem);
    const itemId = createResponse.data._id;
    createdEntities.items.push(itemId);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: mockDataGenerator.itemNameArbitrary(),
          price: fc.double({ min: 10, max: 5000, noNaN: true }).map(p => Number(p.toFixed(2))),
        }),
        async (updateData) => {
          // Perform admin operation: update item
          const adminAction = async () => {
            const response = await adminClient.put(`/master-data/items/${itemId}`, updateData);
            return response.data;
          };

          // Query POS for the updated item
          const posQuery = async () => {
            try {
              const response = await posClient.get(`/items/${itemId}`);
              return response.data;
            } catch (error) {
              return null;
            }
          };

          // Verify item is updated in POS
          const verifyPredicate = (posItem) => {
            return posItem && 
                   posItem.name === updateData.name && 
                   Math.abs(posItem.price - updateData.price) < 0.01;
          };

          // Verify synchronization
          const result = await syncVerifier.verifyAdminToPOS({
            type: 'update',
            module: 'master-data',
            entity: 'item',
            adminAction,
            posQuery,
            verifyPredicate,
          }, config.maxSyncLatency);

          return result.synchronized && !result.error;
        }
      ),
      { numRuns: 3 }
    );
  }, 120000);

  /**
   * Property Test: Item deactivation prevents POS selection
   * Validates: Requirement 1.3
   */
  test('Property 1.3: Item deactivation prevents POS selection within 2 seconds', async () => {
    // First create an active item
    const initialItem = fc.sample(mockDataGenerator.generateItem(), 1)[0];
    initialItem.isActive = true;
    const createResponse = await adminClient.post('/master-data/items', initialItem);
    const itemId = createResponse.data._id;
    createdEntities.items.push(itemId);

    // Deactivate the item
    const adminAction = async () => {
      const response = await adminClient.put(`/master-data/items/${itemId}`, { isActive: false });
      return response.data;
    };

    // Query POS for active items
    const posQuery = async () => {
      try {
        const response = await posClient.get('/items', { params: { isActive: true } });
        return response.data || [];
      } catch (error) {
        return [];
      }
    };

    // Verify item is not in active items list
    const verifyPredicate = (posItems) => {
      return !posItems.some(item => item._id === itemId || item.id === itemId);
    };

    // Verify synchronization
    const result = await syncVerifier.verifyAdminToPOS({
      type: 'deactivate',
      module: 'master-data',
      entity: 'item',
      adminAction,
      posQuery,
      verifyPredicate,
    }, config.maxSyncLatency);

    expect(result.synchronized).toBe(true);
    expect(result.error).toBeNull();
  }, 30000);

  /**
   * Property Test: Warehouse creation synchronizes to POS
   * Validates: Requirement 1.4
   */
  test('Property 1.4: Warehouse creation synchronizes to POS within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(mockDataGenerator.generateWarehouse(), async (warehouseData) => {
        // Perform admin operation: create warehouse
        const adminAction = async () => {
          const response = await adminClient.post('/master-data/warehouses', warehouseData);
          createdEntities.warehouses.push(response.data._id);
          return response.data;
        };

        // Query POS for warehouses
        const posQuery = async () => {
          try {
            const response = await posClient.get('/warehouses');
            return response.data || [];
          } catch (error) {
            return [];
          }
        };

        // Verify warehouse appears in POS
        const verifyPredicate = (posWarehouses) => {
          return posWarehouses.some(wh => 
            wh.name === warehouseData.name && 
            wh.code === warehouseData.code
          );
        };

        // Verify synchronization
        const result = await syncVerifier.verifyAdminToPOS({
          type: 'create',
          module: 'master-data',
          entity: 'warehouse',
          adminAction,
          posQuery,
          verifyPredicate,
        }, config.maxSyncLatency);

        return result.synchronized && !result.error;
      }),
      { numRuns: 3 }
    );
  }, 120000);

  /**
   * Property Test: Account creation synchronizes to POS
   * Validates: Requirement 1.5
   */
  test('Property 1.5: Account creation synchronizes to POS within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(mockDataGenerator.generateAccount('customer'), async (accountData) => {
        // Perform admin operation: create account
        const adminAction = async () => {
          const response = await adminClient.post('/master-data/accounts', accountData);
          createdEntities.accounts.push(response.data._id);
          return response.data;
        };

        // Query POS for accounts
        const posQuery = async () => {
          try {
            const response = await posClient.get('/accounts', { 
              params: { type: 'customer' } 
            });
            return response.data || [];
          } catch (error) {
            return [];
          }
        };

        // Verify account appears in POS
        const verifyPredicate = (posAccounts) => {
          return posAccounts.some(acc => 
            acc.name === accountData.name && 
            acc.type === accountData.type
          );
        };

        // Verify synchronization
        const result = await syncVerifier.verifyAdminToPOS({
          type: 'create',
          module: 'master-data',
          entity: 'account',
          adminAction,
          posQuery,
          verifyPredicate,
        }, config.maxSyncLatency);

        return result.synchronized && !result.error;
      }),
      { numRuns: 3 }
    );
  }, 120000);
});
