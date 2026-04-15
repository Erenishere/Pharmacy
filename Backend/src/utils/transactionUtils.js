/**
 * Transaction Utility Module
 * Provides robust MongoDB multi-document ACID transaction support
 * with automatic retry logic and session management
 */

const mongoose = require('mongoose');
const AppError = require('./appError');

/**
 * Execute operations within a MongoDB ACID transaction
 * @param {Function} operation - Async function receiving session
 * @param {Object} options - Transaction options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelayMs - Initial retry delay in ms (default: 100)
 * @param {string} options.readPreference - Read preference (default: 'primary')
 * @param {number} options.timeout - Transaction timeout in ms (default: 30000)
 * @returns {Promise<any>} Operation result
 */
async function executeTransactionalOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    retryDelayMs = 100,
    readPreference = 'primary',
    timeout = 30000,
  } = options;

  const session = await mongoose.startSession();
  
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      // Start transaction with appropriate options
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference,
        maxCommitTimeMS: timeout,
      });

      // Execute the operation within transaction
      const result = await operation(session);

      // Commit the transaction
      await session.commitTransaction();
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Abort the transaction
      await session.abortTransaction();

      // Determine if error is retryable
      const isRetryable = isRetryableError(error);
      
      if (isRetryable && retries < maxRetries - 1) {
        retries++;
        const delay = retryDelayMs * Math.pow(2, retries);
        console.warn(`Transaction retry ${retries}/${maxRetries} after ${delay}ms. Error: ${error.message}`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      throw enrichError(error, retries);
    }
  }

  throw enrichError(lastError, retries);
}

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isRetryableError(error) {
  // MongoDB transient transaction errors
  if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) {
    return true;
  }
  
  // Write conflict errors
  if (error.codeName === 'WriteConflict' || error.code === 112) {
    return true;
  }
  
  // Lock timeout
  if (error.codeName === 'LockTimeout' || error.code === 13) {
    return true;
  }
  
  // Network errors
  if (error.message && (
    error.message.includes('network error') ||
    error.message.includes('connection') ||
    error.message.includes('ECONNREFUSED')
  )) {
    return true;
  }

  return false;
}

/**
 * Enrich error with transaction context
 * @param {Error} error - Original error
 * @param {number} retries - Number of retries attempted
 * @returns {Error} Enriched error
 */
function enrichError(error, retries) {
  if (retries > 0) {
    error.message = `${error.message} (failed after ${retries} retries)`;
  }
  error.isTransactionError = true;
  error.retriesAttempted = retries;
  return error;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute bulk operations within a transaction
 * Useful for batch updates that must all succeed or fail together
 * @param {Array<Function>} operations - Array of async functions
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} Results from all operations
 */
async function executeBulkTransactional(operations, options = {}) {
  return executeTransactionalOperation(async (session) => {
    const results = [];
    for (const operation of operations) {
      const result = await operation(session);
      results.push(result);
    }
    return results;
  }, options);
}

/**
 * Create a transactional version of a model operation
 * Wraps common mongoose operations with transaction support
 */
class TransactionalModel {
  constructor(model) {
    this.model = model;
  }

  /**
   * Find one document within transaction
   */
  async findById(id, session, options = {}) {
    return this.model.findById(id).session(session).setOptions(options);
  }

  /**
   * Find documents within transaction
   */
  async find(query, session, options = {}) {
    return this.model.find(query).session(session).setOptions(options);
  }

  /**
   * Update one document atomically
   */
  async updateOne(query, update, session, options = {}) {
    return this.model.findOneAndUpdate(query, update, {
      new: true,
      session,
      ...options,
    });
  }

  /**
   * Increment/decrement a numeric field atomically
   * Prevents race conditions on counters, stock, balances
   */
  async increment(query, field, amount, session) {
    const update = { $inc: { [field]: amount } };
    return this.model.findOneAndUpdate(
      query,
      update,
      { new: true, session }
    );
  }

  /**
   * Create document within transaction
   */
  async create(data, session) {
    const doc = new this.model(data);
    doc.$session(session);
    return doc.save({ session });
  }

  /**
   * Delete document within transaction
   */
  async deleteById(id, session) {
    return this.model.findByIdAndDelete(id, { session });
  }
}

/**
 * Helper to wrap a model with transactional methods
 * @param {mongoose.Model} model - Mongoose model
 * @returns {TransactionalModel}
 */
function withTransaction(model) {
  return new TransactionalModel(model);
}

/**
 * Transaction decorator for service methods
 * Automatically wraps method in transaction
 * @param {Object} options - Transaction options
 */
function transactional(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      return executeTransactionalOperation(async (session) => {
        // Inject session as last argument if not provided
        if (!args.some(arg => arg && typeof arg === 'object' && arg.constructor && arg.constructor.name === 'ClientSession')) {
          args.push(session);
        }
        return originalMethod.apply(this, args);
      }, options);
    };

    return descriptor;
  };
}

module.exports = {
  executeTransactionalOperation,
  executeBulkTransactional,
  TransactionalModel,
  withTransaction,
  transactional,
  isRetryableError,
};
