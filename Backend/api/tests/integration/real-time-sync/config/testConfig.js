/**
 * Test Configuration for Real-Time System Integration Testing
 * 
 * This configuration is used for integration tests that verify real-time
 * synchronization, data consistency, and performance across all system modules.
 * 
 * IMPORTANT: Tests run against the PRODUCTION database to verify real-world
 * data consistency. No test database isolation is used.
 */

// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const config = {
  // Database connection
  databaseUrl: process.env.MONGODB_URI,
  
  // API endpoints
  adminApiUrl: process.env.ADMIN_API_URL || 'http://localhost:3000/api/v1',
  posApiUrl: process.env.POS_API_URL || 'http://localhost:3000/api/v1/salesman/pos',
  
  // Test parameters
  maxSyncLatency: 2000, // milliseconds - max time for real-time sync
  pollInterval: 100, // milliseconds - how often to poll for changes
  pollTimeout: 5000, // milliseconds - max time to wait for changes
  propertyTestIterations: 100, // minimum iterations for property-based tests
  
  // Performance thresholds
  maxResponseTime: 3000, // milliseconds - for 10 concurrent users
  maxP95ResponseTime: 5000, // milliseconds - for 20 concurrent users
  minOperationsPerSecond: 10,
  
  // Concurrency settings
  maxConcurrentUsers: 20,
  loadTestDuration: 60, // seconds
  
  // Test execution settings
  testTimeout: 60000, // milliseconds - Jest timeout for integration tests
  
  // Inconsistency resolution settings
  autoResolve: process.env.AUTO_RESOLVE_INCONSISTENCIES === 'true',
  dryRun: process.env.DRY_RUN === 'true',
  
  // Logging
  verbose: process.env.VERBOSE_TESTS === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
