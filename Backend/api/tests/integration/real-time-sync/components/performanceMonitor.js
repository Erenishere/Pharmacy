/**
 * Performance Monitor Module
 * 
 * Measures and tracks performance metrics for integration tests.
 * Records operation timings, calculates statistics (average, median, percentiles),
 * tracks operations per second, and monitors failure rates.
 * 
 * This module provides:
 * - Operation timing recording
 * - Statistical calculations (average, median, p95, p99, min, max)
 * - Operations per second calculation
 * - Failure rate tracking
 * - Metrics reporting and export
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

class PerformanceMonitor {
  constructor() {
    this.reset();
  }

  /**
   * Reset all monitoring data
   */
  reset() {
    this.isMonitoring = false;
    this.startTime = null;
    this.endTime = null;
    this.operations = [];
    this.operationTimings = []; // Array of durations for percentile calculations
    this.successCount = 0;
    this.failureCount = 0;
  }

  /**
   * Start monitoring performance
   */
  startMonitoring() {
    this.reset();
    this.isMonitoring = true;
    this.startTime = Date.now();
  }

  /**
   * Stop monitoring and return final metrics
   * @returns {PerformanceMetrics}
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      throw new Error('Monitoring is not active. Call startMonitoring() first.');
    }

    this.isMonitoring = false;
    this.endTime = Date.now();
    
    return this.getMetrics();
  }

  /**
   * Record an operation timing
   * 
   * @param {string} operation - Operation name/type
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Whether the operation succeeded
   */
  recordOperation(operation, duration, success = true) {
    if (!this.isMonitoring) {
      throw new Error('Monitoring is not active. Call startMonitoring() first.');
    }

    // Record operation details
    this.operations.push({
      operation,
      duration,
      success,
      timestamp: Date.now(),
    });

    // Record timing for statistics
    this.operationTimings.push(duration);

    // Update counters
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
  }

  /**
   * Get current performance metrics
   * @returns {PerformanceMetrics}
   */
  getMetrics() {
    const totalOperations = this.successCount + this.failureCount;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        operationsPerSecond: 0,
        failureRate: 0,
        duration: 0,
      };
    }

    // Calculate duration
    const endTime = this.endTime || Date.now();
    const duration = endTime - this.startTime;
    const durationInSeconds = duration / 1000;

    // Sort timings for percentile calculations
    const sortedTimings = [...this.operationTimings].sort((a, b) => a - b);

    // Calculate statistics
    const averageResponseTime = this.calculateAverage(this.operationTimings);
    const medianResponseTime = this.calculatePercentile(sortedTimings, 50);
    const p95ResponseTime = this.calculatePercentile(sortedTimings, 95);
    const p99ResponseTime = this.calculatePercentile(sortedTimings, 99);
    const minResponseTime = sortedTimings[0] || 0;
    const maxResponseTime = sortedTimings[sortedTimings.length - 1] || 0;

    // Calculate operations per second
    const operationsPerSecond = durationInSeconds > 0 
      ? totalOperations / durationInSeconds 
      : 0;

    // Calculate failure rate
    const failureRate = totalOperations > 0 
      ? (this.failureCount / totalOperations) * 100 
      : 0;

    return {
      totalOperations,
      successfulOperations: this.successCount,
      failedOperations: this.failureCount,
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
      medianResponseTime: Number(medianResponseTime.toFixed(2)),
      p95ResponseTime: Number(p95ResponseTime.toFixed(2)),
      p99ResponseTime: Number(p99ResponseTime.toFixed(2)),
      minResponseTime: Number(minResponseTime.toFixed(2)),
      maxResponseTime: Number(maxResponseTime.toFixed(2)),
      operationsPerSecond: Number(operationsPerSecond.toFixed(2)),
      failureRate: Number(failureRate.toFixed(2)),
      duration: Number(duration.toFixed(2)),
    };
  }

  /**
   * Calculate average of an array of numbers
   * @param {Array<number>} values - Array of numbers
   * @returns {number}
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate percentile from sorted array
   * @param {Array<number>} sortedValues - Sorted array of numbers
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number}
   */
  calculatePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    // Handle edge cases
    if (percentile === 0) return sortedValues[0];
    if (percentile === 100) return sortedValues[sortedValues.length - 1];

    // Calculate index using linear interpolation
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    // If index is an integer, return that value
    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }

    // Linear interpolation between two values
    const lowerValue = sortedValues[lowerIndex];
    const upperValue = sortedValues[upperIndex];
    const fraction = index - lowerIndex;
    
    return lowerValue + (upperValue - lowerValue) * fraction;
  }

  /**
   * Get detailed operation breakdown by operation type
   * @returns {Object}
   */
  getOperationBreakdown() {
    const breakdown = {};

    for (const op of this.operations) {
      if (!breakdown[op.operation]) {
        breakdown[op.operation] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          timings: [],
        };
      }

      breakdown[op.operation].count++;
      breakdown[op.operation].timings.push(op.duration);
      
      if (op.success) {
        breakdown[op.operation].successCount++;
      } else {
        breakdown[op.operation].failureCount++;
      }
    }

    // Calculate statistics for each operation type
    for (const [operation, data] of Object.entries(breakdown)) {
      const sortedTimings = [...data.timings].sort((a, b) => a - b);
      
      breakdown[operation].averageResponseTime = Number(this.calculateAverage(data.timings).toFixed(2));
      breakdown[operation].medianResponseTime = Number(this.calculatePercentile(sortedTimings, 50).toFixed(2));
      breakdown[operation].p95ResponseTime = Number(this.calculatePercentile(sortedTimings, 95).toFixed(2));
      breakdown[operation].p99ResponseTime = Number(this.calculatePercentile(sortedTimings, 99).toFixed(2));
      breakdown[operation].minResponseTime = Number(sortedTimings[0].toFixed(2));
      breakdown[operation].maxResponseTime = Number(sortedTimings[sortedTimings.length - 1].toFixed(2));
      breakdown[operation].failureRate = Number(((data.failureCount / data.count) * 100).toFixed(2));
      
      // Remove raw timings array to keep output clean
      delete breakdown[operation].timings;
    }

    return breakdown;
  }

  /**
   * Export metrics as JSON
   * @returns {string}
   */
  exportMetricsJSON() {
    const metrics = this.getMetrics();
    const breakdown = this.getOperationBreakdown();
    
    return JSON.stringify({
      summary: metrics,
      breakdown,
      operations: this.operations,
    }, null, 2);
  }

  /**
   * Export metrics as formatted text report
   * @returns {string}
   */
  exportMetricsReport() {
    const metrics = this.getMetrics();
    const breakdown = this.getOperationBreakdown();
    
    let report = '='.repeat(80) + '\n';
    report += 'PERFORMANCE METRICS REPORT\n';
    report += '='.repeat(80) + '\n\n';
    
    report += 'SUMMARY\n';
    report += '-'.repeat(80) + '\n';
    report += `Total Operations:        ${metrics.totalOperations}\n`;
    report += `Successful Operations:   ${metrics.successfulOperations}\n`;
    report += `Failed Operations:       ${metrics.failedOperations}\n`;
    report += `Failure Rate:            ${metrics.failureRate}%\n`;
    report += `Duration:                ${metrics.duration}ms (${(metrics.duration / 1000).toFixed(2)}s)\n`;
    report += `Operations Per Second:   ${metrics.operationsPerSecond}\n`;
    report += '\n';
    
    report += 'RESPONSE TIME STATISTICS\n';
    report += '-'.repeat(80) + '\n';
    report += `Average:                 ${metrics.averageResponseTime}ms\n`;
    report += `Median:                  ${metrics.medianResponseTime}ms\n`;
    report += `95th Percentile (p95):   ${metrics.p95ResponseTime}ms\n`;
    report += `99th Percentile (p99):   ${metrics.p99ResponseTime}ms\n`;
    report += `Minimum:                 ${metrics.minResponseTime}ms\n`;
    report += `Maximum:                 ${metrics.maxResponseTime}ms\n`;
    report += '\n';
    
    if (Object.keys(breakdown).length > 0) {
      report += 'OPERATION BREAKDOWN\n';
      report += '-'.repeat(80) + '\n';
      
      for (const [operation, data] of Object.entries(breakdown)) {
        report += `\n${operation}:\n`;
        report += `  Count:           ${data.count}\n`;
        report += `  Success:         ${data.successCount}\n`;
        report += `  Failures:        ${data.failureCount}\n`;
        report += `  Failure Rate:    ${data.failureRate}%\n`;
        report += `  Avg Response:    ${data.averageResponseTime}ms\n`;
        report += `  Median:          ${data.medianResponseTime}ms\n`;
        report += `  p95:             ${data.p95ResponseTime}ms\n`;
        report += `  p99:             ${data.p99ResponseTime}ms\n`;
        report += `  Min:             ${data.minResponseTime}ms\n`;
        report += `  Max:             ${data.maxResponseTime}ms\n`;
      }
    }
    
    report += '\n' + '='.repeat(80) + '\n';
    
    return report;
  }

  /**
   * Check if metrics meet performance thresholds
   * @param {Object} thresholds - Performance thresholds to check
   * @returns {Object} Results of threshold checks
   */
  checkThresholds(thresholds = {}) {
    const metrics = this.getMetrics();
    const results = {
      passed: true,
      violations: [],
    };

    // Check average response time
    if (thresholds.maxAverageResponseTime && metrics.averageResponseTime > thresholds.maxAverageResponseTime) {
      results.passed = false;
      results.violations.push({
        metric: 'averageResponseTime',
        actual: metrics.averageResponseTime,
        threshold: thresholds.maxAverageResponseTime,
        message: `Average response time ${metrics.averageResponseTime}ms exceeds threshold ${thresholds.maxAverageResponseTime}ms`,
      });
    }

    // Check p95 response time
    if (thresholds.maxP95ResponseTime && metrics.p95ResponseTime > thresholds.maxP95ResponseTime) {
      results.passed = false;
      results.violations.push({
        metric: 'p95ResponseTime',
        actual: metrics.p95ResponseTime,
        threshold: thresholds.maxP95ResponseTime,
        message: `95th percentile response time ${metrics.p95ResponseTime}ms exceeds threshold ${thresholds.maxP95ResponseTime}ms`,
      });
    }

    // Check p99 response time
    if (thresholds.maxP99ResponseTime && metrics.p99ResponseTime > thresholds.maxP99ResponseTime) {
      results.passed = false;
      results.violations.push({
        metric: 'p99ResponseTime',
        actual: metrics.p99ResponseTime,
        threshold: thresholds.maxP99ResponseTime,
        message: `99th percentile response time ${metrics.p99ResponseTime}ms exceeds threshold ${thresholds.maxP99ResponseTime}ms`,
      });
    }

    // Check operations per second
    if (thresholds.minOperationsPerSecond && metrics.operationsPerSecond < thresholds.minOperationsPerSecond) {
      results.passed = false;
      results.violations.push({
        metric: 'operationsPerSecond',
        actual: metrics.operationsPerSecond,
        threshold: thresholds.minOperationsPerSecond,
        message: `Operations per second ${metrics.operationsPerSecond} is below threshold ${thresholds.minOperationsPerSecond}`,
      });
    }

    // Check failure rate
    if (thresholds.maxFailureRate && metrics.failureRate > thresholds.maxFailureRate) {
      results.passed = false;
      results.violations.push({
        metric: 'failureRate',
        actual: metrics.failureRate,
        threshold: thresholds.maxFailureRate,
        message: `Failure rate ${metrics.failureRate}% exceeds threshold ${thresholds.maxFailureRate}%`,
      });
    }

    return results;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a performance monitor and wrap an async function to measure its execution time
 * 
 * @param {Function} fn - Async function to measure
 * @param {string} operationName - Name of the operation
 * @param {PerformanceMonitor} monitor - Performance monitor instance
 * @returns {Function} Wrapped function that records timing
 */
function measureOperation(fn, operationName, monitor) {
  return async (...args) => {
    const startTime = Date.now();
    let success = true;
    let error = null;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      success = false;
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      monitor.recordOperation(operationName, duration, success);
    }
  };
}

/**
 * Measure execution time of a function and return both result and duration
 * 
 * @param {Function} fn - Async function to measure
 * @returns {Promise<{result: any, duration: number, success: boolean}>}
 */
async function measureExecutionTime(fn) {
  const startTime = Date.now();
  let success = true;
  let result = null;
  let error = null;

  try {
    result = await fn();
  } catch (err) {
    success = false;
    error = err;
  }

  const duration = Date.now() - startTime;

  if (!success) {
    throw error;
  }

  return {
    result,
    duration,
    success,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PerformanceMonitor,
  measureOperation,
  measureExecutionTime,
};
