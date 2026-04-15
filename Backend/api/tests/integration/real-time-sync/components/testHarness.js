/**
 * Test Harness Module
 * 
 * Core orchestration framework for executing integration and property-based tests
 * against the production database. This harness coordinates all test components
 * to verify real-time synchronization, data consistency, and system performance.
 * 
 * IMPORTANT: Tests run against PRODUCTION database to verify real-world data.
 * No database cleanup is performed - tests verify and optionally fix production data.
 * 
 * This module provides:
 * - Connection to production database
 * - Test execution orchestration (single tests, suites, property tests)
 * - Result collection and reporting
 * - Integration with fast-check for property-based testing
 * - Inconsistency detection and reporting
 * - Auto-resolution for detected inconsistencies (when enabled)
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.7
 */

const mongoose = require('mongoose');
const fc = require('fast-check');
const config = require('../config/testConfig');
const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const { PerformanceMonitor } = require('./performanceMonitor');
const consistencyChecker = require('./consistencyChecker');
const syncVerifier = require('./syncVerifier');
const concurrentExecutor = require('./concurrentExecutor');

// ============================================================================
// TEST HARNESS CLASS
// ============================================================================

class TestHarness {
  constructor(options = {}) {
    this.options = {
      databaseUrl: options.databaseUrl || config.databaseUrl,
      adminApiUrl: options.adminApiUrl || config.adminApiUrl,
      posApiUrl: options.posApiUrl || config.posApiUrl,
      autoResolve: options.autoResolve !== undefined ? options.autoResolve : config.autoResolve,
      dryRun: options.dryRun !== undefined ? options.dryRun : config.dryRun,
      verbose: options.verbose !== undefined ? options.verbose : config.verbose,
    };

    this.db = null;
    this.adminClient = null;
    this.posClient = null;
    this.isSetup = false;
    this.testResults = [];
    this.inconsistencies = [];
  }

  // ==========================================================================
  // SETUP AND TEARDOWN
  // ==========================================================================

  /**
   * Set up test environment
   * - Connect to production database
   * - Initialize API clients
   * - Initialize test components
   */
  async setup() {
    if (this.isSetup) {
      throw new Error('Test harness is already set up');
    }

    try {
      // Connect to production database
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(this.options.databaseUrl, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        this.log('Connected to production database');
      } else {
        this.log('Using existing database connection');
      }

      this.db = mongoose.connection;

      // Initialize API clients
      this.adminClient = createAdminClient();
      this.posClient = createPOSClient();
      this.log('Initialized API clients');

      this.isSetup = true;
      this.log('Test harness setup complete');
    } catch (error) {
      throw new Error(`Failed to set up test harness: ${error.message}`);
    }
  }

  /**
   * Tear down test environment
   * - Clean up resources (but NOT database data)
   * - Close connections
   * 
   * NOTE: Does NOT clean up database - tests verify production data
   */
  async teardown() {
    if (!this.isSetup) {
      return;
    }

    try {
      // Close database connection if we opened it
      if (this.db && mongoose.connection.readyState === 1) {
        // Don't close if other tests might be using it
        // await mongoose.connection.close();
        this.log('Database connection left open for other tests');
      }

      this.db = null;
      this.adminClient = null;
      this.posClient = null;
      this.isSetup = false;

      this.log('Test harness teardown complete');
    } catch (error) {
      throw new Error(`Failed to tear down test harness: ${error.message}`);
    }
  }

  // ==========================================================================
  // TEST EXECUTION
  // ==========================================================================

  /**
   * Run a single integration test
   * 
   * @param {IntegrationTest} test - Test to execute
   * @returns {Promise<TestResult>}
   */
  async runTest(test) {
    this.ensureSetup();

    if (!test || typeof test !== 'object') {
      throw new Error('Test must be an object');
    }

    const { name, description, setup, execute, verify, cleanup } = test;

    if (!name) {
      throw new Error('Test must have a name');
    }

    this.log(`Running test: ${name}`);
    const startTime = Date.now();
    let testError = null;
    let verifyResult = null;

    try {
      // Setup phase
      if (setup && typeof setup === 'function') {
        this.log(`  Setup phase...`);
        await setup();
      }

      // Execute phase
      if (execute && typeof execute === 'function') {
        this.log(`  Execute phase...`);
        await execute();
      }

      // Verify phase
      if (verify && typeof verify === 'function') {
        this.log(`  Verify phase...`);
        verifyResult = await verify();
        
        if (verifyResult === false) {
          testError = new Error('Verification failed');
        }
      }

      // Cleanup phase
      if (cleanup && typeof cleanup === 'function') {
        this.log(`  Cleanup phase...`);
        await cleanup();
      }

      const duration = Date.now() - startTime;
      const passed = !testError;

      const result = {
        name,
        description,
        passed,
        duration,
        error: testError,
        details: verifyResult,
        timestamp: new Date(),
      };

      this.testResults.push(result);
      this.log(`  ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result = {
        name,
        description,
        passed: false,
        duration,
        error,
        details: null,
        timestamp: new Date(),
      };

      this.testResults.push(result);
      this.log(`  FAILED (${duration}ms): ${error.message}`);

      return result;
    }
  }

  /**
   * Run a test suite (collection of tests)
   * 
   * @param {TestSuite} suite - Test suite to execute
   * @returns {Promise<SuiteResult>}
   */
  async runSuite(suite) {
    this.ensureSetup();

    if (!suite || typeof suite !== 'object') {
      throw new Error('Suite must be an object');
    }

    const { name, description, tests, beforeAll, afterAll, beforeEach, afterEach } = suite;

    if (!name) {
      throw new Error('Suite must have a name');
    }

    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      throw new Error('Suite must have an array of tests');
    }

    this.log(`\nRunning test suite: ${name}`);
    if (description) {
      this.log(`  ${description}`);
    }

    const startTime = Date.now();
    const results = [];
    let setupError = null;

    try {
      // Run beforeAll hook
      if (beforeAll && typeof beforeAll === 'function') {
        this.log('  Running beforeAll hook...');
        await beforeAll();
      }

      // Run each test
      for (const test of tests) {
        try {
          // Run beforeEach hook
          if (beforeEach && typeof beforeEach === 'function') {
            await beforeEach();
          }

          // Run test
          const result = await this.runTest(test);
          results.push(result);

          // Run afterEach hook
          if (afterEach && typeof afterEach === 'function') {
            await afterEach();
          }
        } catch (error) {
          this.log(`  Error in test ${test.name}: ${error.message}`);
          results.push({
            name: test.name,
            description: test.description,
            passed: false,
            duration: 0,
            error,
            details: null,
            timestamp: new Date(),
          });
        }
      }

      // Run afterAll hook
      if (afterAll && typeof afterAll === 'function') {
        this.log('  Running afterAll hook...');
        await afterAll();
      }
    } catch (error) {
      setupError = error;
      this.log(`  Suite setup/teardown error: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;

    const suiteResult = {
      name,
      description,
      totalTests: results.length,
      passedTests: passedCount,
      failedTests: failedCount,
      duration,
      results,
      setupError,
      timestamp: new Date(),
    };

    this.log(`\nSuite complete: ${passedCount}/${results.length} passed (${duration}ms)`);

    return suiteResult;
  }

  /**
   * Run a property-based test using fast-check
   * 
   * @param {PropertyTest} property - Property test to execute
   * @param {number} iterations - Number of iterations (default: config.propertyTestIterations)
   * @returns {Promise<PropertyTestResult>}
   */
  async runPropertyTest(property, iterations = config.propertyTestIterations) {
    this.ensureSetup();

    if (!property || typeof property !== 'object') {
      throw new Error('Property must be an object');
    }

    const { name, propertyDescription, generator, predicate, beforeEach, afterEach } = property;

    if (!name) {
      throw new Error('Property test must have a name');
    }

    if (!generator) {
      throw new Error('Property test must have a generator (fast-check arbitrary)');
    }

    if (!predicate || typeof predicate !== 'function') {
      throw new Error('Property test must have a predicate function');
    }

    this.log(`\nRunning property test: ${name}`);
    if (propertyDescription) {
      this.log(`  Property: ${propertyDescription}`);
    }
    this.log(`  Iterations: ${iterations}`);

    const startTime = Date.now();

    try {
      // Run property test with fast-check
      const result = await fc.assert(
        fc.asyncProperty(generator, async (data) => {
          // Run beforeEach hook if provided
          if (beforeEach && typeof beforeEach === 'function') {
            await beforeEach(data);
          }

          try {
            // Run predicate
            const predicateResult = await predicate(data);

            // Run afterEach hook if provided
            if (afterEach && typeof afterEach === 'function') {
              await afterEach(data);
            }

            return predicateResult;
          } catch (error) {
            // Run afterEach hook even on error
            if (afterEach && typeof afterEach === 'function') {
              try {
                await afterEach(data);
              } catch (cleanupError) {
                this.log(`  Cleanup error: ${cleanupError.message}`);
              }
            }
            throw error;
          }
        }),
        {
          numRuns: iterations,
          verbose: this.options.verbose,
        }
      );

      const duration = Date.now() - startTime;

      const testResult = {
        name,
        propertyDescription,
        passed: true,
        duration,
        iterations,
        counterexample: null,
        error: null,
        timestamp: new Date(),
      };

      this.testResults.push(testResult);
      this.log(`  PASSED (${duration}ms, ${iterations} iterations)`);

      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Extract counterexample from fast-check error
      let counterexample = null;
      if (error.counterexample) {
        counterexample = error.counterexample;
      }

      const testResult = {
        name,
        propertyDescription,
        passed: false,
        duration,
        iterations,
        counterexample,
        error,
        timestamp: new Date(),
      };

      this.testResults.push(testResult);
      this.log(`  FAILED (${duration}ms)`);
      if (counterexample) {
        this.log(`  Counterexample: ${JSON.stringify(counterexample, null, 2)}`);
      }

      return testResult;
    }
  }

  // ==========================================================================
  // INCONSISTENCY DETECTION AND RESOLUTION
  // ==========================================================================

  /**
   * Detect inconsistencies in production data
   * 
   * @returns {Promise<Array<ConsistencyResult>>}
   */
  async detectInconsistencies() {
    this.ensureSetup();

    this.log('\nDetecting inconsistencies in production data...');

    try {
      const results = await consistencyChecker.verifyAllConsistency();
      
      // Flatten results and filter for inconsistencies
      const inconsistencies = [];
      for (const category of results) {
        if (category.issueCount > 0) {
          for (const issue of category.issues) {
            inconsistencies.push({
              category: category.category,
              ...issue,
            });
          }
        }
      }

      this.inconsistencies = inconsistencies;

      if (inconsistencies.length === 0) {
        this.log('  No inconsistencies found');
      } else {
        this.log(`  Found ${inconsistencies.length} inconsistencies`);
        
        // Log summary by category
        const categoryCounts = {};
        for (const issue of inconsistencies) {
          categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
        }
        
        for (const [category, count] of Object.entries(categoryCounts)) {
          this.log(`    ${category}: ${count} issue(s)`);
        }
      }

      return inconsistencies;
    } catch (error) {
      this.log(`  Error detecting inconsistencies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve detected inconsistencies (if auto-resolution is enabled)
   * 
   * @param {Array<ConsistencyResult>} inconsistencies - Inconsistencies to resolve
   * @returns {Promise<Object>} Resolution results
   */
  async resolveInconsistencies(inconsistencies = null) {
    this.ensureSetup();

    const issuesToResolve = inconsistencies || this.inconsistencies;

    if (!issuesToResolve || issuesToResolve.length === 0) {
      this.log('No inconsistencies to resolve');
      return {
        resolved: 0,
        failed: 0,
        skipped: 0,
        results: [],
      };
    }

    if (!this.options.autoResolve) {
      this.log('Auto-resolution is disabled. Set autoResolve: true to enable.');
      return {
        resolved: 0,
        failed: 0,
        skipped: issuesToResolve.length,
        results: [],
      };
    }

    this.log(`\nResolving ${issuesToResolve.length} inconsistencies...`);
    if (this.options.dryRun) {
      this.log('  DRY RUN MODE - No changes will be made');
    }

    const results = {
      resolved: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };

    // Note: Actual resolution logic would be implemented in an inconsistencyResolver module
    // For now, we just report what would be done
    for (const issue of issuesToResolve) {
      const resolutionResult = {
        category: issue.category,
        issue: issue.details,
        action: 'none',
        success: false,
        message: '',
      };

      if (issue.category === 'Inventory') {
        resolutionResult.action = 'recalculate_from_movements';
        resolutionResult.message = `Would recalculate inventory for item ${issue.itemId} in warehouse ${issue.warehouseId}`;
        results.skipped++;
      } else if (issue.category === 'Accounts') {
        resolutionResult.action = 'recalculate_from_transactions';
        resolutionResult.message = `Would recalculate balance for account ${issue.accountId}`;
        results.skipped++;
      } else if (issue.category === 'Batches') {
        resolutionResult.action = 'recalculate_from_movements';
        resolutionResult.message = `Would recalculate batch quantity for batch ${issue.batchId}`;
        results.skipped++;
      } else if (issue.category === 'Referential Integrity') {
        resolutionResult.action = 'manual_review_required';
        resolutionResult.message = 'Referential integrity issues require manual review';
        results.skipped++;
      } else {
        resolutionResult.action = 'unknown';
        resolutionResult.message = 'Unknown issue type';
        results.skipped++;
      }

      results.results.push(resolutionResult);
      this.log(`  ${resolutionResult.action}: ${resolutionResult.message}`);
    }

    this.log(`\nResolution complete: ${results.resolved} resolved, ${results.failed} failed, ${results.skipped} skipped`);

    return results;
  }

  // ==========================================================================
  // RESULT COLLECTION AND REPORTING
  // ==========================================================================

  /**
   * Get all test results
   * 
   * @returns {Array<TestResult>}
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Get summary of all test results
   * 
   * @returns {Object}
   */
  getSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0,
      totalDuration,
      averageDuration: total > 0 ? Number((totalDuration / total).toFixed(2)) : 0,
      inconsistenciesFound: this.inconsistencies.length,
    };
  }

  /**
   * Generate a comprehensive test report
   * 
   * @returns {string}
   */
  generateReport() {
    const summary = this.getSummary();
    
    let report = '='.repeat(80) + '\n';
    report += 'TEST HARNESS REPORT\n';
    report += '='.repeat(80) + '\n\n';
    
    report += 'SUMMARY\n';
    report += '-'.repeat(80) + '\n';
    report += `Total Tests:         ${summary.total}\n`;
    report += `Passed:              ${summary.passed}\n`;
    report += `Failed:              ${summary.failed}\n`;
    report += `Pass Rate:           ${summary.passRate}%\n`;
    report += `Total Duration:      ${summary.totalDuration}ms (${(summary.totalDuration / 1000).toFixed(2)}s)\n`;
    report += `Average Duration:    ${summary.averageDuration}ms\n`;
    report += `Inconsistencies:     ${summary.inconsistenciesFound}\n`;
    report += '\n';
    
    // Failed tests
    const failedTests = this.testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += 'FAILED TESTS\n';
      report += '-'.repeat(80) + '\n';
      
      for (const test of failedTests) {
        report += `\n${test.name}\n`;
        if (test.description) {
          report += `  Description: ${test.description}\n`;
        }
        report += `  Duration: ${test.duration}ms\n`;
        report += `  Error: ${test.error?.message || 'Unknown error'}\n`;
        
        if (test.counterexample) {
          report += `  Counterexample: ${JSON.stringify(test.counterexample, null, 2)}\n`;
        }
      }
      
      report += '\n';
    }
    
    // Inconsistencies
    if (this.inconsistencies.length > 0) {
      report += 'INCONSISTENCIES DETECTED\n';
      report += '-'.repeat(80) + '\n';
      
      const categoryCounts = {};
      for (const issue of this.inconsistencies) {
        categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      }
      
      for (const [category, count] of Object.entries(categoryCounts)) {
        report += `${category}: ${count} issue(s)\n`;
      }
      
      report += '\nSample Issues:\n';
      for (const issue of this.inconsistencies.slice(0, 10)) {
        report += `  - ${issue.category}: ${issue.details}\n`;
      }
      
      if (this.inconsistencies.length > 10) {
        report += `  ... and ${this.inconsistencies.length - 10} more\n`;
      }
      
      report += '\n';
    }
    
    report += '='.repeat(80) + '\n';
    
    return report;
  }

  /**
   * Export results as JSON
   * 
   * @returns {string}
   */
  exportResultsJSON() {
    return JSON.stringify({
      summary: this.getSummary(),
      results: this.testResults,
      inconsistencies: this.inconsistencies,
      timestamp: new Date(),
    }, null, 2);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Ensure test harness is set up
   * @private
   */
  ensureSetup() {
    if (!this.isSetup) {
      throw new Error('Test harness is not set up. Call setup() first.');
    }
  }

  /**
   * Log message if verbose mode is enabled
   * @private
   */
  log(message) {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  /**
   * Clear all test results and inconsistencies
   */
  clearResults() {
    this.testResults = [];
    this.inconsistencies = [];
  }

  /**
   * Get API clients for use in tests
   * 
   * @returns {Object} { adminClient, posClient }
   */
  getClients() {
    this.ensureSetup();
    
    return {
      adminClient: this.adminClient,
      posClient: this.posClient,
    };
  }

  /**
   * Get database connection for use in tests
   * 
   * @returns {mongoose.Connection}
   */
  getDatabase() {
    this.ensureSetup();
    return this.db;
  }

  /**
   * Get test components for use in tests
   * 
   * @returns {Object}
   */
  getComponents() {
    return {
      consistencyChecker,
      syncVerifier,
      concurrentExecutor,
      PerformanceMonitor,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TestHarness,
};
