/**
 * Jest Configuration for Real-Time System Integration Tests
 * 
 * This configuration is specifically for integration tests that verify
 * real-time synchronization and data consistency across the system.
 */

module.exports = {
  displayName: 'Real-Time Integration Tests',
  testEnvironment: 'node',
  rootDir: '../../..',
  
  // Test file patterns
  testMatch: [
    '**/tests/integration/real-time-sync/**/*.test.js',
    '**/tests/integration/real-time-sync/**/*.spec.js',
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/real-time-sync/setup.js'],
  
  // Timeout for integration tests (longer than unit tests)
  testTimeout: 60000,
  
  // Coverage settings
  collectCoverageFrom: [
    'tests/integration/real-time-sync/**/*.js',
    '!tests/integration/real-time-sync/**/*.test.js',
    '!tests/integration/real-time-sync/**/*.spec.js',
    '!tests/integration/real-time-sync/jest.config.js',
    '!tests/integration/real-time-sync/setup.js',
  ],
  
  // Coverage thresholds (lower for integration tests)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // Verbose output
  verbose: true,
  
  // Don't force exit (let connections close gracefully)
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Run tests serially (important for integration tests)
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
