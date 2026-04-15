/**
 * Setup for Real-Time System Integration Tests
 * 
 * IMPORTANT: These tests run against the PRODUCTION database to verify
 * real-world data consistency. No test database isolation is used.
 * 
 * The tests will:
 * 1. Connect to the existing production database
 * 2. Verify data consistency across modules
 * 3. Detect and report any inconsistencies
 * 4. Optionally auto-resolve detected issues
 */

const mongoose = require('mongoose');
const config = require('./config/testConfig');

let isConnected = false;

/**
 * Setup before all tests
 */
beforeAll(async () => {
  // Set environment to use production database
  process.env.NODE_ENV = 'integration';
  
  // Connect to production database if not already connected
  if (!isConnected && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(config.databaseUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      
      isConnected = true;
      console.log('✓ Connected to production database for integration testing');
      console.log('⚠️  WARNING: Tests will run against PRODUCTION data');
      console.log('⚠️  Any inconsistencies found will be reported');
      
      if (config.autoResolve) {
        console.log('✓ Auto-resolution is ENABLED');
      } else {
        console.log('ℹ Auto-resolution is DISABLED (use AUTO_RESOLVE_INCONSISTENCIES=true to enable)');
      }
      
      if (config.dryRun) {
        console.log('ℹ Dry-run mode is ENABLED (no changes will be made)');
      }
    } catch (error) {
      console.error('✗ Failed to connect to production database:', error);
      throw error;
    }
  }
}, 30000);

/**
 * Cleanup after each test
 * Note: We do NOT clean up production data between tests
 */
afterEach(async () => {
  // No cleanup - tests verify production data consistency
  // Any test data created should be marked with test identifiers
  // for manual cleanup if needed
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  // Close database connection
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('✓ Disconnected from production database');
  }
}, 30000);

// Configure Jest timeout for integration tests
jest.setTimeout(config.testTimeout);

// Global test utilities
global.integrationTestUtils = {
  config,
  
  /**
   * Check if we're in dry-run mode
   */
  isDryRun: () => config.dryRun,
  
  /**
   * Check if auto-resolution is enabled
   */
  isAutoResolveEnabled: () => config.autoResolve,
  
  /**
   * Log test information
   */
  log: (message, level = 'info') => {
    if (config.verbose || level === 'error') {
      const prefix = {
        info: 'ℹ',
        warn: '⚠️',
        error: '✗',
        success: '✓',
      }[level] || 'ℹ';
      
      console.log(`${prefix} ${message}`);
    }
  },
};

module.exports = {
  config,
};
