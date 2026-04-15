/**
 * Infrastructure Test
 * 
 * Verifies that the test framework infrastructure is properly set up
 * and can connect to the production database.
 */

const mongoose = require('mongoose');
const config = require('./config/testConfig');
const { wait, generateUniqueId, randomInt } = require('./utils/testHelpers');
const { createAdminClient, createPOSClient } = require('./utils/apiClient');

describe('Test Framework Infrastructure', () => {
  describe('Database Connection', () => {
    test('should be connected to production database', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      expect(mongoose.connection.name).toBeTruthy();
    });

    test('should have access to collections', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      expect(collections.length).toBeGreaterThan(0);
      
      // Verify key collections exist
      const collectionNames = collections.map(c => c.name);
      expect(collectionNames).toContain('items');
      expect(collectionNames).toContain('accounts');
    });
  });

  describe('Configuration', () => {
    test('should have valid configuration', () => {
      expect(config.databaseUrl).toBeTruthy();
      expect(config.adminApiUrl).toBeTruthy();
      expect(config.posApiUrl).toBeTruthy();
      expect(config.maxSyncLatency).toBeGreaterThan(0);
      expect(config.pollInterval).toBeGreaterThan(0);
      expect(config.propertyTestIterations).toBeGreaterThan(0);
    });

    test('should have reasonable timeout values', () => {
      expect(config.maxSyncLatency).toBeLessThanOrEqual(5000);
      expect(config.pollInterval).toBeLessThan(config.maxSyncLatency);
      expect(config.pollTimeout).toBeGreaterThan(config.maxSyncLatency);
    });
  });

  describe('Test Helpers', () => {
    test('wait should delay execution', async () => {
      const start = Date.now();
      await wait(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    test('generateUniqueId should generate unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test_/);
      expect(id2).toMatch(/^test_/);
    });

    test('randomInt should generate numbers in range', () => {
      for (let i = 0; i < 100; i++) {
        const num = randomInt(1, 10);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('API Clients', () => {
    test('should create admin API client', () => {
      const client = createAdminClient();
      expect(client).toBeTruthy();
      expect(client.baseUrl).toBe(config.adminApiUrl);
    });

    test('should create POS API client', () => {
      const client = createPOSClient();
      expect(client).toBeTruthy();
      expect(client.baseUrl).toBe(config.posApiUrl);
    });

    test('should set auth token on client', () => {
      const client = createAdminClient();
      const token = 'test_token_123';
      client.setAuthToken(token);
      expect(client.authToken).toBe(token);
      expect(client.client.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    });
  });

  describe('Global Test Utilities', () => {
    test('should have global integrationTestUtils', () => {
      expect(global.integrationTestUtils).toBeDefined();
      expect(global.integrationTestUtils.config).toBeDefined();
      expect(global.integrationTestUtils.isDryRun).toBeInstanceOf(Function);
      expect(global.integrationTestUtils.isAutoResolveEnabled).toBeInstanceOf(Function);
      expect(global.integrationTestUtils.log).toBeInstanceOf(Function);
    });

    test('should check dry-run mode', () => {
      const isDryRun = global.integrationTestUtils.isDryRun();
      expect(typeof isDryRun).toBe('boolean');
    });

    test('should check auto-resolve mode', () => {
      const isAutoResolve = global.integrationTestUtils.isAutoResolveEnabled();
      expect(typeof isAutoResolve).toBe('boolean');
    });
  });

  describe('Fast-check Integration', () => {
    test('should have fast-check available', () => {
      const fc = require('fast-check');
      expect(fc).toBeDefined();
      expect(fc.assert).toBeInstanceOf(Function);
      expect(fc.property).toBeInstanceOf(Function);
    });

    test('should be able to run simple property test', () => {
      const fc = require('fast-check');
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (num) => {
            return num >= 1 && num <= 100;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
