/**
 * Synchronization Verifier Module
 * 
 * Validates real-time data propagation between Admin and POS systems.
 * Measures synchronization latency and verifies that updates propagate
 * within the 2-second threshold defined in requirements.
 * 
 * This module provides:
 * - pollForChange: Generic polling function with configurable timeout
 * - verifyAdminToPOS: Verify Admin operations sync to POS
 * - verifyPOSToAdmin: Verify POS operations sync to Admin
 * - Latency measurement for all synchronization checks
 * - Detailed error reporting for synchronization failures
 */

const { createAdminClient, createPOSClient } = require('../utils/apiClient');
const config = require('../config/testConfig');

// ============================================================================
// POLLING UTILITIES
// ============================================================================

/**
 * Poll for a data change with configurable timeout and interval
 * 
 * @param {Function} query - Async function that returns the current value
 * @param {Function} predicate - Function that returns true when expected value is found
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} pollInterval - Time between polls in milliseconds
 * @returns {Promise<PollResult>}
 */
async function pollForChange(query, predicate, timeout = config.pollTimeout, pollInterval = config.pollInterval) {
  const startTime = Date.now();
  let attempts = 0;
  let lastValue = null;
  let lastError = null;

  while (Date.now() - startTime < timeout) {
    attempts++;
    
    try {
      const value = await query();
      lastValue = value;
      
      if (predicate(value)) {
        const latency = Date.now() - startTime;
        return {
          found: true,
          latency,
          attempts,
          finalValue: value,
          error: null,
        };
      }
    } catch (error) {
      lastError = error;
      // Continue polling even if query fails - the data might not exist yet
    }
    
    // Wait before next poll
    await sleep(pollInterval);
  }

  // Timeout reached without finding expected value
  const latency = Date.now() - startTime;
  return {
    found: false,
    latency,
    attempts,
    finalValue: lastValue,
    error: lastError || new Error('Polling timeout: expected value not found'),
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
// SYNCHRONIZATION VERIFICATION
// ============================================================================

/**
 * Verify that an Admin operation propagates to POS within latency threshold
 * 
 * @param {Object} operation - Operation details
 * @param {string} operation.type - Operation type: 'create', 'update', 'delete', 'deactivate'
 * @param {string} operation.module - Module name: 'items', 'accounts', 'warehouses', etc.
 * @param {string} operation.entity - Entity type: 'item', 'account', 'warehouse', etc.
 * @param {Function} operation.adminAction - Async function that performs the admin operation
 * @param {Function} operation.posQuery - Async function that queries POS for the change
 * @param {Function} operation.verifyPredicate - Function that verifies the expected change
 * @param {number} maxLatency - Maximum acceptable latency in milliseconds
 * @returns {Promise<SyncResult>}
 */
async function verifyAdminToPOS(operation, maxLatency = config.maxSyncLatency) {
  const { type, module, entity, adminAction, posQuery, verifyPredicate } = operation;
  
  if (!adminAction || typeof adminAction !== 'function') {
    throw new Error('adminAction must be a function');
  }
  if (!posQuery || typeof posQuery !== 'function') {
    throw new Error('posQuery must be a function');
  }
  if (!verifyPredicate || typeof verifyPredicate !== 'function') {
    throw new Error('verifyPredicate must be a function');
  }

  const startTime = Date.now();
  let adminResult = null;
  let adminError = null;

  try {
    // Perform the admin operation
    adminResult = await adminAction();
  } catch (error) {
    adminError = error;
    return {
      synchronized: false,
      latency: Date.now() - startTime,
      error: new Error(`Admin operation failed: ${error.message}`),
      details: {
        type,
        module,
        entity,
        phase: 'admin_operation',
        adminError: error.message,
      },
    };
  }

  // Poll POS API for the change
  const pollResult = await pollForChange(
    posQuery,
    verifyPredicate,
    maxLatency,
    config.pollInterval
  );

  const totalLatency = Date.now() - startTime;
  const synchronized = pollResult.found;

  if (!synchronized) {
    return {
      synchronized: false,
      latency: totalLatency,
      error: new Error(
        `Synchronization failed: ${entity} ${type} did not propagate to POS within ${maxLatency}ms`
      ),
      details: {
        type,
        module,
        entity,
        phase: 'pos_verification',
        adminResult,
        pollAttempts: pollResult.attempts,
        pollLatency: pollResult.latency,
        finalValue: pollResult.finalValue,
        pollError: pollResult.error?.message,
      },
    };
  }

  // Check if latency exceeds threshold
  if (totalLatency > maxLatency) {
    return {
      synchronized: true,
      latency: totalLatency,
      error: new Error(
        `Synchronization latency exceeded threshold: ${totalLatency}ms > ${maxLatency}ms`
      ),
      details: {
        type,
        module,
        entity,
        phase: 'latency_check',
        adminResult,
        posValue: pollResult.finalValue,
        pollAttempts: pollResult.attempts,
        threshold: maxLatency,
      },
    };
  }

  // Success
  return {
    synchronized: true,
    latency: totalLatency,
    error: null,
    details: {
      type,
      module,
      entity,
      adminResult,
      posValue: pollResult.finalValue,
      pollAttempts: pollResult.attempts,
    },
  };
}

/**
 * Verify that a POS operation propagates to Admin within latency threshold
 * 
 * @param {Object} operation - Operation details
 * @param {string} operation.type - Operation type: 'create', 'update', 'delete'
 * @param {string} operation.module - Module name: 'sales', 'payments', 'returns', etc.
 * @param {string} operation.entity - Entity type: 'invoice', 'payment', 'return', etc.
 * @param {Function} operation.posAction - Async function that performs the POS operation
 * @param {Function} operation.adminQuery - Async function that queries Admin for the change
 * @param {Function} operation.verifyPredicate - Function that verifies the expected change
 * @param {number} maxLatency - Maximum acceptable latency in milliseconds
 * @returns {Promise<SyncResult>}
 */
async function verifyPOSToAdmin(operation, maxLatency = config.maxSyncLatency) {
  const { type, module, entity, posAction, adminQuery, verifyPredicate } = operation;
  
  if (!posAction || typeof posAction !== 'function') {
    throw new Error('posAction must be a function');
  }
  if (!adminQuery || typeof adminQuery !== 'function') {
    throw new Error('adminQuery must be a function');
  }
  if (!verifyPredicate || typeof verifyPredicate !== 'function') {
    throw new Error('verifyPredicate must be a function');
  }

  const startTime = Date.now();
  let posResult = null;
  let posError = null;

  try {
    // Perform the POS operation
    posResult = await posAction();
  } catch (error) {
    posError = error;
    return {
      synchronized: false,
      latency: Date.now() - startTime,
      error: new Error(`POS operation failed: ${error.message}`),
      details: {
        type,
        module,
        entity,
        phase: 'pos_operation',
        posError: error.message,
      },
    };
  }

  // Poll Admin API for the change
  const pollResult = await pollForChange(
    adminQuery,
    verifyPredicate,
    maxLatency,
    config.pollInterval
  );

  const totalLatency = Date.now() - startTime;
  const synchronized = pollResult.found;

  if (!synchronized) {
    return {
      synchronized: false,
      latency: totalLatency,
      error: new Error(
        `Synchronization failed: ${entity} ${type} did not propagate to Admin within ${maxLatency}ms`
      ),
      details: {
        type,
        module,
        entity,
        phase: 'admin_verification',
        posResult,
        pollAttempts: pollResult.attempts,
        pollLatency: pollResult.latency,
        finalValue: pollResult.finalValue,
        pollError: pollResult.error?.message,
      },
    };
  }

  // Check if latency exceeds threshold
  if (totalLatency > maxLatency) {
    return {
      synchronized: true,
      latency: totalLatency,
      error: new Error(
        `Synchronization latency exceeded threshold: ${totalLatency}ms > ${maxLatency}ms`
      ),
      details: {
        type,
        module,
        entity,
        phase: 'latency_check',
        posResult,
        adminValue: pollResult.finalValue,
        pollAttempts: pollResult.attempts,
        threshold: maxLatency,
      },
    };
  }

  // Success
  return {
    synchronized: true,
    latency: totalLatency,
    error: null,
    details: {
      type,
      module,
      entity,
      posResult,
      adminValue: pollResult.finalValue,
      pollAttempts: pollResult.attempts,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON VERIFICATION PATTERNS
// ============================================================================

/**
 * Create a predicate that checks if an entity exists with specific properties
 * 
 * @param {Object} expectedProperties - Properties to check
 * @returns {Function} Predicate function
 */
function createExistsPredicate(expectedProperties) {
  return (value) => {
    if (!value) return false;
    
    // If value is an array, check if any item matches
    if (Array.isArray(value)) {
      return value.some(item => matchesProperties(item, expectedProperties));
    }
    
    // If value is an object, check if it matches
    return matchesProperties(value, expectedProperties);
  };
}

/**
 * Create a predicate that checks if an entity has been updated with specific properties
 * 
 * @param {string} id - Entity ID
 * @param {Object} expectedProperties - Properties to check
 * @returns {Function} Predicate function
 */
function createUpdatePredicate(id, expectedProperties) {
  return (value) => {
    if (!value) return false;
    
    // If value is an array, find the item by ID
    if (Array.isArray(value)) {
      const item = value.find(i => i._id === id || i.id === id);
      return item && matchesProperties(item, expectedProperties);
    }
    
    // If value is an object, check ID and properties
    if (value._id === id || value.id === id) {
      return matchesProperties(value, expectedProperties);
    }
    
    return false;
  };
}

/**
 * Create a predicate that checks if an entity has been deleted/deactivated
 * 
 * @param {string} id - Entity ID
 * @returns {Function} Predicate function
 */
function createDeletePredicate(id) {
  return (value) => {
    if (!value) return true; // Entity not found = deleted
    
    // If value is an array, check if item is not in the list or is inactive
    if (Array.isArray(value)) {
      const item = value.find(i => i._id === id || i.id === id);
      return !item || item.isActive === false;
    }
    
    // If value is an object, check if it's marked as inactive
    if (value._id === id || value.id === id) {
      return value.isActive === false;
    }
    
    return true;
  };
}

/**
 * Check if an object matches expected properties
 * 
 * @param {Object} obj - Object to check
 * @param {Object} expectedProperties - Expected properties
 * @returns {boolean}
 */
function matchesProperties(obj, expectedProperties) {
  for (const [key, expectedValue] of Object.entries(expectedProperties)) {
    const actualValue = obj[key];
    
    // Handle nested objects
    if (typeof expectedValue === 'object' && expectedValue !== null && !Array.isArray(expectedValue)) {
      if (!matchesProperties(actualValue, expectedValue)) {
        return false;
      }
    } else if (actualValue !== expectedValue) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  pollForChange,
  verifyAdminToPOS,
  verifyPOSToAdmin,
  
  // Helper functions
  createExistsPredicate,
  createUpdatePredicate,
  createDeletePredicate,
  matchesProperties,
  
  // Utility
  sleep,
};
