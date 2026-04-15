/**
 * Framework Components Integration Test
 * 
 * Verifies that all framework components work correctly together.
 * Tests each component's basic functionality to ensure the framework is ready.
 */

const { TestHarness } = require('./components/testHarness');
const { PerformanceMonitor } = require('./components/performanceMonitor');
const consistencyChecker = require('./components/consistencyChecker');
const syncVerifier = require('./components/syncVerifier');
const concurrentExecutor = require('./components/concurrentExecutor');
const mockDataGenerator = require('./components/mockDataGenerator');
const inconsistencyResolver = require('./components/inconsistencyResolver');
const fc = require('fast-check');

describe('Framework Components Integration', () => {
  describe('Mock Data Generator', () => {
    test('should generate valid item data', () => {
      const items = fc.sample(mockDataGenerator.generateItem(), 5);
      
      expect(items).toHaveLength(5);
      items.forEach(item => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('code');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('unit');
        expect(item).toHaveProperty('price');
        expect(item.price).toBeGreaterThan(0);
      });
    });

    test('should generate valid account data', () => {
      const accounts = fc.sample(mockDataGenerator.generateAccount('customer'), 3);
      
      expect(accounts).toHaveLength(3);
      accounts.forEach(account => {
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('type');
        expect(account).toHaveProperty('contactInfo');
        expect(account.contactInfo).toHaveProperty('phone');
      });
    });

    test('should generate valid warehouse data', () => {
      const warehouses = fc.sample(mockDataGenerator.generateWarehouse(), 3);
      
      expect(warehouses).toHaveLength(3);
      warehouses.forEach(warehouse => {
        expect(warehouse).toHaveProperty('name');
        expect(warehouse).toHaveProperty('code');
        expect(warehouse).toHaveProperty('location');
      });
    });
  });

  describe('Performance Monitor', () => {
    test('should track operation timings', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.startMonitoring();
      monitor.recordOperation('test_op', 100, true);
      monitor.recordOperation('test_op', 200, true);
      monitor.recordOperation('test_op', 150, false);
      const metrics = monitor.stopMonitoring();
      
      expect(metrics.totalOperations).toBe(3);
      expect(metrics.successfulOperations).toBe(2);
      expect(metrics.failedOperations).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.failureRate).toBeCloseTo(33.33, 1);
    });

    test('should calculate percentiles correctly', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.startMonitoring();
      for (let i = 1; i <= 100; i++) {
        monitor.recordOperation('test', i, true);
      }
      const metrics = monitor.stopMonitoring();
      
      expect(metrics.minResponseTime).toBe(1);
      expect(metrics.maxResponseTime).toBe(100);
      expect(metrics.medianResponseTime).toBeGreaterThanOrEqual(49.5);
      expect(metrics.medianResponseTime).toBeLessThanOrEqual(50.5);
      expect(metrics.p95ResponseTime).toBeGreaterThan(90);
      expect(metrics.p99ResponseTime).toBeGreaterThan(95);
    });
  });

  describe('Concurrent Executor', () => {
    test('should execute operations concurrently', async () => {
      const operations = [
        async () => { await new Promise(r => setTimeout(r, 50)); return 'op1'; },
        async () => { await new Promise(r => setTimeout(r, 50)); return 'op2'; },
        async () => { await new Promise(r => setTimeout(r, 50)); return 'op3'; },
      ];
      
      const result = await concurrentExecutor.executeConcurrent(operations);
      
      expect(result.totalOperations).toBe(3);
      expect(result.successfulOperations).toBe(3);
      expect(result.failedOperations).toBe(0);
      expect(result.duration).toBeLessThan(200); // Should be concurrent, not sequential
    });

    test('should detect conflicts', async () => {
      const operations = [
        async () => ({ _id: 'item1', name: 'Item 1' }),
        async () => ({ _id: 'item1', name: 'Item 1 Updated' }),
        async () => ({ _id: 'item2', name: 'Item 2' }),
      ];
      
      const result = await concurrentExecutor.executeConcurrent(operations, null, {
        detectConflicts: true,
        getEntityId: (result) => result._id,
      });
      
      expect(result.conflicts).toBe(1); // item1 has 2 operations
      expect(result.entityConflicts).toHaveLength(1);
      expect(result.entityConflicts[0].entityId).toBe('item1');
      expect(result.entityConflicts[0].operationCount).toBe(2);
    });

    test('should aggregate errors', () => {
      const errors = [
        { operationIndex: 0, error: new Error('Test error 1'), message: 'Test error 1' },
        { operationIndex: 1, error: new Error('Test error 1'), message: 'Test error 1' },
        { operationIndex: 2, error: new TypeError('Type error'), message: 'Type error' },
      ];
      
      const aggregation = concurrentExecutor.aggregateErrors(errors);
      
      expect(aggregation.totalErrors).toBe(3);
      expect(aggregation.uniqueErrorCount).toBe(2);
      expect(aggregation.errorsByType).toHaveProperty('Error');
      expect(aggregation.errorsByType).toHaveProperty('TypeError');
    });
  });

  describe('Sync Verifier', () => {
    test('should poll for changes', async () => {
      let counter = 0;
      const query = async () => {
        counter++;
        return counter >= 3 ? 'found' : null;
      };
      const predicate = (value) => value === 'found';
      
      const result = await syncVerifier.pollForChange(query, predicate, 1000, 50);
      
      expect(result.found).toBe(true);
      expect(result.attempts).toBeGreaterThanOrEqual(3);
      expect(result.finalValue).toBe('found');
    });

    test('should timeout if value not found', async () => {
      const query = async () => null;
      const predicate = (value) => value === 'found';
      
      const result = await syncVerifier.pollForChange(query, predicate, 200, 50);
      
      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should create predicates correctly', () => {
      const existsPredicate = syncVerifier.createExistsPredicate({ name: 'Test' });
      expect(existsPredicate({ name: 'Test', id: 1 })).toBe(true);
      expect(existsPredicate({ name: 'Other', id: 1 })).toBe(false);
      
      const updatePredicate = syncVerifier.createUpdatePredicate('123', { status: 'active' });
      expect(updatePredicate({ _id: '123', status: 'active' })).toBe(true);
      expect(updatePredicate({ _id: '123', status: 'inactive' })).toBe(false);
      
      const deletePredicate = syncVerifier.createDeletePredicate('123');
      expect(deletePredicate(null)).toBe(true);
      expect(deletePredicate({ _id: '123', isActive: false })).toBe(true);
      expect(deletePredicate({ _id: '123', isActive: true })).toBe(false);
    });
  });

  describe('Test Harness', () => {
    let harness;

    beforeEach(async () => {
      harness = new TestHarness({ verbose: false });
      await harness.setup();
    });

    afterEach(async () => {
      await harness.teardown();
    });

    test('should execute a simple test', async () => {
      const test = {
        name: 'Simple Test',
        description: 'A simple test',
        execute: async () => {
          // Test logic with small delay to ensure measurable duration
          await new Promise(resolve => setTimeout(resolve, 1));
        },
        verify: async () => {
          return true;
        },
      };
      
      const result = await harness.runTest(test);
      
      expect(result.passed).toBe(true);
      expect(result.name).toBe('Simple Test');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should execute a test suite', async () => {
      const suite = {
        name: 'Test Suite',
        tests: [
          {
            name: 'Test 1',
            execute: async () => {},
            verify: async () => true,
          },
          {
            name: 'Test 2',
            execute: async () => {},
            verify: async () => true,
          },
        ],
      };
      
      const result = await harness.runSuite(suite);
      
      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(0);
    });

    test('should get test summary', async () => {
      const test1 = {
        name: 'Test 1',
        execute: async () => {},
        verify: async () => true,
      };
      const test2 = {
        name: 'Test 2',
        execute: async () => {},
        verify: async () => false,
      };
      
      await harness.runTest(test1);
      await harness.runTest(test2);
      
      const summary = harness.getSummary();
      
      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.passRate).toBe(50);
    });

    test('should provide access to components', () => {
      const components = harness.getComponents();
      
      expect(components).toHaveProperty('consistencyChecker');
      expect(components).toHaveProperty('syncVerifier');
      expect(components).toHaveProperty('concurrentExecutor');
      expect(components).toHaveProperty('PerformanceMonitor');
    });
  });

  describe('Component Integration', () => {
    test('all components should be available', () => {
      expect(TestHarness).toBeDefined();
      expect(PerformanceMonitor).toBeDefined();
      expect(consistencyChecker).toBeDefined();
      expect(syncVerifier).toBeDefined();
      expect(concurrentExecutor).toBeDefined();
      expect(mockDataGenerator).toBeDefined();
      expect(inconsistencyResolver).toBeDefined();
    });

    test('components should have expected exports', () => {
      // Mock Data Generator
      expect(mockDataGenerator.generateItem).toBeDefined();
      expect(mockDataGenerator.generateAccount).toBeDefined();
      expect(mockDataGenerator.generateWarehouse).toBeDefined();
      
      // Consistency Checker
      expect(consistencyChecker.verifyInventoryConsistency).toBeDefined();
      expect(consistencyChecker.verifyAccountConsistency).toBeDefined();
      expect(consistencyChecker.verifyAllConsistency).toBeDefined();
      
      // Sync Verifier
      expect(syncVerifier.pollForChange).toBeDefined();
      expect(syncVerifier.verifyAdminToPOS).toBeDefined();
      expect(syncVerifier.verifyPOSToAdmin).toBeDefined();
      
      // Concurrent Executor
      expect(concurrentExecutor.executeConcurrent).toBeDefined();
      expect(concurrentExecutor.executeLoadTest).toBeDefined();
      
      // Inconsistency Resolver
      expect(inconsistencyResolver.resolveInventoryInconsistency).toBeDefined();
      expect(inconsistencyResolver.resolveAccountInconsistency).toBeDefined();
      expect(inconsistencyResolver.resolveAllInconsistencies).toBeDefined();
    });
  });
});
