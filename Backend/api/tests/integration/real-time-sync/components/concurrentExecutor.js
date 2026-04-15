/**
 * Concurrent Test Executor Module
 * 
 * Simulates multi-user scenarios by executing operations concurrently.
 * Detects conflicts when multiple operations affect the same entity,
 * collects and aggregates errors, and supports load testing with sustained
 * concurrent operations.
 * 
 * This module provides:
 * - executeConcurrent: Run operations in parallel with Promise.all/allSettled
 * - executeLoadTest: Simulate sustained concurrent load over time
 * - Conflict detection for operations on the same entity
 * - Error collection and aggregation
 * - Performance metrics integration
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

const { PerformanceMonitor } = require('./performanceMonitor');

// ============================================================================
// CONCURRENT EXECUTION
// ============================================================================

/**
 * Execute operations concurrently with specified concurrency level
 * 
 * @param {Array<Function>} operations - Array of async functions to execute
 * @param {number} concurrency - Maximum number of concurrent operations (default: operations.length)
 * @param {Object} options - Additional options
 * @param {boolean} options.detectConflicts - Whether to detect entity conflicts (default: true)
 * @param {boolean} options.failFast - Whether to stop on first error (default: false)
 * @param {Function} options.getEntityId - Function to extract entity ID from operation result
 * @returns {Promise<ConcurrentResult>}
 */
async function executeConcurrent(operations, concurrency = null, options = {}) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('Operations must be a non-empty array');
  }

  const {
    detectConflicts = true,
    failFast = false,
    getEntityId = null,
  } = options;

  // Default concurrency is all operations at once
  const maxConcurrency = concurrency || operations.length;

  const startTime = Date.now();
  const results = [];
  const errors = [];
  const entityMap = new Map(); // Track which operations affect which entities
  let successCount = 0;
  let failureCount = 0;

  // Execute operations in batches based on concurrency limit
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    const batch = operations.slice(i, i + maxConcurrency);
    const batchStartIndex = i;

    // Execute batch concurrently using Promise.allSettled
    const batchResults = await Promise.allSettled(
      batch.map(async (operation, batchIndex) => {
        const operationIndex = batchStartIndex + batchIndex;
        const operationStartTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - operationStartTime;

          // Track entity if conflict detection is enabled
          if (detectConflicts && getEntityId) {
            const entityId = getEntityId(result);
            if (entityId) {
              if (!entityMap.has(entityId)) {
                entityMap.set(entityId, []);
              }
              entityMap.get(entityId).push({
                operationIndex,
                result,
                timestamp: Date.now(),
              });
            }
          }

          return {
            success: true,
            result,
            duration,
            operationIndex,
          };
        } catch (error) {
          const duration = Date.now() - operationStartTime;
          
          return {
            success: false,
            error,
            duration,
            operationIndex,
          };
        }
      })
    );

    // Process batch results
    for (const promiseResult of batchResults) {
      if (promiseResult.status === 'fulfilled') {
        const opResult = promiseResult.value;
        results.push(opResult);

        if (opResult.success) {
          successCount++;
        } else {
          failureCount++;
          errors.push({
            operationIndex: opResult.operationIndex,
            error: opResult.error,
            message: opResult.error.message,
            stack: opResult.error.stack,
          });

          // Stop execution if failFast is enabled
          if (failFast) {
            const totalLatency = Date.now() - startTime;
            return {
              totalOperations: results.length,
              successfulOperations: successCount,
              failedOperations: failureCount,
              conflicts: 0,
              averageLatency: calculateAverageLatency(results),
              errors,
              results,
              entityConflicts: [],
              aborted: true,
              duration: totalLatency,
            };
          }
        }
      } else {
        // Promise.allSettled should not reject, but handle just in case
        failureCount++;
        errors.push({
          operationIndex: i + batchResults.indexOf(promiseResult),
          error: promiseResult.reason,
          message: promiseResult.reason?.message || 'Unknown error',
          stack: promiseResult.reason?.stack,
        });
      }
    }
  }

  // Detect conflicts (operations affecting the same entity)
  const entityConflicts = [];
  if (detectConflicts) {
    for (const [entityId, operations] of entityMap.entries()) {
      if (operations.length > 1) {
        entityConflicts.push({
          entityId,
          operationCount: operations.length,
          operations: operations.map(op => ({
            operationIndex: op.operationIndex,
            timestamp: op.timestamp,
          })),
        });
      }
    }
  }

  const totalLatency = Date.now() - startTime;
  const averageLatency = calculateAverageLatency(results);

  return {
    totalOperations: operations.length,
    successfulOperations: successCount,
    failedOperations: failureCount,
    conflicts: entityConflicts.length,
    averageLatency,
    errors,
    results,
    entityConflicts,
    aborted: false,
    duration: totalLatency,
  };
}

/**
 * Calculate average latency from results
 * @param {Array} results - Array of operation results
 * @returns {number}
 */
function calculateAverageLatency(results) {
  if (results.length === 0) return 0;
  
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  return Number((totalDuration / results.length).toFixed(2));
}

// ============================================================================
// LOAD TESTING
// ============================================================================

/**
 * Execute a load test by continuously generating and executing operations
 * for a specified duration while maintaining a target concurrency level
 * 
 * @param {Function} operationGenerator - Function that generates an async operation
 * @param {number} duration - Test duration in milliseconds
 * @param {number} concurrency - Target number of concurrent operations
 * @param {Object} options - Additional options
 * @param {boolean} options.rampUp - Whether to gradually ramp up to target concurrency (default: false)
 * @param {number} options.rampUpDuration - Duration of ramp-up period in ms (default: duration * 0.1)
 * @param {Function} options.onProgress - Callback for progress updates
 * @returns {Promise<LoadTestResult>}
 */
async function executeLoadTest(operationGenerator, duration, concurrency, options = {}) {
  if (typeof operationGenerator !== 'function') {
    throw new Error('operationGenerator must be a function');
  }
  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('duration must be a positive number');
  }
  if (typeof concurrency !== 'number' || concurrency <= 0) {
    throw new Error('concurrency must be a positive number');
  }

  const {
    rampUp = false,
    rampUpDuration = duration * 0.1,
    onProgress = null,
  } = options;

  const monitor = new PerformanceMonitor();
  monitor.startMonitoring();

  const startTime = Date.now();
  const endTime = startTime + duration;
  const errors = [];
  const activeOperations = new Set();
  let operationCounter = 0;
  let completedOperations = 0;

  /**
   * Execute a single operation and track it
   */
  const executeOperation = async () => {
    const operationId = operationCounter++;
    const operationStartTime = Date.now();
    
    activeOperations.add(operationId);

    try {
      const operation = operationGenerator();
      if (typeof operation !== 'function' && typeof operation?.then !== 'function') {
        throw new Error('operationGenerator must return a function or promise');
      }

      const result = typeof operation === 'function' ? await operation() : await operation;
      const operationDuration = Date.now() - operationStartTime;
      
      monitor.recordOperation('load_test_operation', operationDuration, true);
      completedOperations++;
      
      return { success: true, result, duration: operationDuration };
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime;
      
      monitor.recordOperation('load_test_operation', operationDuration, false);
      completedOperations++;
      
      errors.push({
        operationId,
        error,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
      
      return { success: false, error, duration: operationDuration };
    } finally {
      activeOperations.delete(operationId);
    }
  };

  /**
   * Calculate target concurrency based on ramp-up settings
   */
  const getTargetConcurrency = () => {
    if (!rampUp) return concurrency;

    const elapsed = Date.now() - startTime;
    if (elapsed >= rampUpDuration) return concurrency;

    // Linear ramp-up from 1 to target concurrency
    const progress = elapsed / rampUpDuration;
    return Math.max(1, Math.floor(concurrency * progress));
  };

  /**
   * Maintain target concurrency by starting new operations
   */
  const maintainConcurrency = async () => {
    const targetConcurrency = getTargetConcurrency();
    
    while (activeOperations.size < targetConcurrency && Date.now() < endTime) {
      // Start new operation without awaiting (fire and forget)
      executeOperation();
      
      // Small delay to prevent tight loop
      await sleep(1);
    }
  };

  // Main load test loop
  const progressInterval = onProgress ? setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / duration) * 100);
    const metrics = monitor.getMetrics();
    
    onProgress({
      progress: Number(progress.toFixed(2)),
      elapsed,
      activeOperations: activeOperations.size,
      completedOperations,
      metrics,
    });
  }, 1000) : null;

  try {
    while (Date.now() < endTime) {
      await maintainConcurrency();
      await sleep(10); // Check every 10ms
    }

    // Wait for all active operations to complete
    while (activeOperations.size > 0) {
      await sleep(100);
    }
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }

  const metrics = monitor.stopMonitoring();

  return {
    duration: metrics.duration,
    totalOperations: completedOperations,
    successfulOperations: metrics.successfulOperations,
    failedOperations: metrics.failedOperations,
    operationsPerSecond: metrics.operationsPerSecond,
    metrics,
    errors,
    targetConcurrency: concurrency,
    rampUp,
  };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CONFLICT DETECTION HELPERS
// ============================================================================

/**
 * Create an entity ID extractor for common entity types
 * 
 * @param {string} entityType - Type of entity ('item', 'account', 'warehouse', etc.)
 * @returns {Function} Entity ID extractor function
 */
function createEntityIdExtractor(entityType) {
  return (result) => {
    if (!result) return null;

    // Handle different result structures
    if (result.data) {
      return result.data._id || result.data.id || result.data[`${entityType}Id`];
    }

    return result._id || result.id || result[`${entityType}Id`];
  };
}

/**
 * Create an entity ID extractor for invoice operations
 * Extracts item IDs from invoice items to detect inventory conflicts
 * 
 * @returns {Function} Entity ID extractor function
 */
function createInvoiceItemExtractor() {
  return (result) => {
    if (!result) return null;

    const invoice = result.data || result;
    if (!invoice.items || !Array.isArray(invoice.items)) return null;

    // Return array of item IDs affected by this invoice
    return invoice.items.map(item => item.itemId || item.item_id).filter(Boolean);
  };
}

/**
 * Analyze conflicts to determine if they are expected or problematic
 * 
 * @param {Array} entityConflicts - Array of entity conflicts from executeConcurrent
 * @param {Object} options - Analysis options
 * @param {boolean} options.allowSameEntityUpdates - Whether same-entity updates are expected
 * @returns {Object} Conflict analysis results
 */
function analyzeConflicts(entityConflicts, options = {}) {
  const { allowSameEntityUpdates = false } = options;

  const analysis = {
    totalConflicts: entityConflicts.length,
    problematicConflicts: [],
    expectedConflicts: [],
  };

  for (const conflict of entityConflicts) {
    if (allowSameEntityUpdates) {
      // If same-entity updates are allowed, conflicts are expected
      analysis.expectedConflicts.push(conflict);
    } else {
      // Otherwise, conflicts are problematic
      analysis.problematicConflicts.push(conflict);
    }
  }

  analysis.hasProblematicConflicts = analysis.problematicConflicts.length > 0;

  return analysis;
}

// ============================================================================
// ERROR AGGREGATION
// ============================================================================

/**
 * Aggregate and categorize errors from concurrent operations
 * 
 * @param {Array} errors - Array of error objects
 * @returns {Object} Aggregated error information
 */
function aggregateErrors(errors) {
  if (!errors || errors.length === 0) {
    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByMessage: {},
      uniqueErrors: [],
    };
  }

  const errorsByType = {};
  const errorsByMessage = {};
  const uniqueErrorMessages = new Set();

  for (const errorObj of errors) {
    const error = errorObj.error;
    const errorType = error?.constructor?.name || 'Error';
    const errorMessage = error?.message || 'Unknown error';

    // Count by type
    if (!errorsByType[errorType]) {
      errorsByType[errorType] = {
        count: 0,
        examples: [],
      };
    }
    errorsByType[errorType].count++;
    if (errorsByType[errorType].examples.length < 3) {
      errorsByType[errorType].examples.push({
        operationIndex: errorObj.operationIndex,
        message: errorMessage,
        timestamp: errorObj.timestamp,
      });
    }

    // Count by message
    if (!errorsByMessage[errorMessage]) {
      errorsByMessage[errorMessage] = {
        count: 0,
        type: errorType,
        operationIndices: [],
      };
    }
    errorsByMessage[errorMessage].count++;
    errorsByMessage[errorMessage].operationIndices.push(errorObj.operationIndex);

    // Track unique messages
    uniqueErrorMessages.add(errorMessage);
  }

  // Create unique errors list
  const uniqueErrors = Array.from(uniqueErrorMessages).map(message => ({
    message,
    count: errorsByMessage[message].count,
    type: errorsByMessage[message].type,
  }));

  return {
    totalErrors: errors.length,
    errorsByType,
    errorsByMessage,
    uniqueErrors,
    uniqueErrorCount: uniqueErrors.length,
  };
}

/**
 * Format error aggregation results as a readable report
 * 
 * @param {Object} aggregation - Result from aggregateErrors
 * @returns {string} Formatted report
 */
function formatErrorReport(aggregation) {
  if (aggregation.totalErrors === 0) {
    return 'No errors occurred.';
  }

  let report = `Total Errors: ${aggregation.totalErrors}\n`;
  report += `Unique Error Types: ${aggregation.uniqueErrorCount}\n\n`;

  report += 'Errors by Type:\n';
  report += '-'.repeat(80) + '\n';
  for (const [type, data] of Object.entries(aggregation.errorsByType)) {
    report += `${type}: ${data.count} occurrence(s)\n`;
    if (data.examples.length > 0) {
      report += '  Examples:\n';
      for (const example of data.examples) {
        report += `    - Operation ${example.operationIndex}: ${example.message}\n`;
      }
    }
  }

  report += '\nMost Common Errors:\n';
  report += '-'.repeat(80) + '\n';
  const sortedErrors = aggregation.uniqueErrors.sort((a, b) => b.count - a.count);
  for (const error of sortedErrors.slice(0, 10)) {
    report += `${error.message} (${error.count} occurrence(s))\n`;
  }

  return report;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  executeConcurrent,
  executeLoadTest,
  
  // Conflict detection helpers
  createEntityIdExtractor,
  createInvoiceItemExtractor,
  analyzeConflicts,
  
  // Error aggregation
  aggregateErrors,
  formatErrorReport,
  
  // Utility
  sleep,
};
