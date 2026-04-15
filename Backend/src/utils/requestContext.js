/**
 * Request Context Utility
 * Provides async context storage for request-scoped data
 * Enables tracking of user, correlation IDs, and request metadata
 * across async operations without explicit parameter passing
 */

const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

// Create async local storage instance
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Get the current request context
 * @returns {Object|null} Current context or null if not in a request context
 */
function getRequestContext() {
  return asyncLocalStorage.getStore();
}

/**
 * Get a specific value from the current context
 * @param {string} key - The key to look up
 * @param {any} defaultValue - Default value if key not found
 * @returns {any}
 */
function getContextValue(key, defaultValue = null) {
  const store = asyncLocalStorage.getStore();
  return store ? store.get(key) : defaultValue;
}

/**
 * Set a value in the current context
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 */
function setContextValue(key, value) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.set(key, value);
  }
}

/**
 * Generate a new correlation ID
 * @returns {string} UUID
 */
function generateCorrelationId() {
  return uuidv4();
}

/**
 * Generate a new request ID
 * @returns {string} UUID
 */
function generateRequestId() {
  return uuidv4();
}

/**
 * Express middleware to initialize request context
 * Must be used early in the middleware chain (after auth, before routes)
 */
function requestContextMiddleware() {
  return (req, res, next) => {
    // Create new context store
    const store = new Map();

    // Extract or generate IDs
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    const requestId = generateRequestId();

    // Set basic request info
    store.set('correlationId', correlationId);
    store.set('requestId', requestId);
    store.set('ipAddress', req.ip || req.connection?.remoteAddress);
    store.set('userAgent', req.headers['user-agent']);
    store.set('startTime', Date.now());

    // Extract user info from authenticated request
    if (req.user) {
      store.set('userId', req.user._id?.toString() || req.user.id);
      store.set('userName', req.user.username || req.user.name);
      store.set('userRole', req.user.role);
      store.set('dimensionId', req.user.dimensionId);
      store.set('permissions', req.user.permissions);
    }

    // Extract dimension filter if present
    if (req.dimensionFilter) {
      store.set('dimensionFilter', req.dimensionFilter);
      store.set('dimensionBased', req.dimensionBased);
    }

    // Add response header with correlation ID
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', requestId);

    // Run the rest of the request in this context
    asyncLocalStorage.run(store, () => {
      next();
    });
  };
}

/**
 * Wrapper to run a function within a new context
 * Useful for background jobs, workers, or non-HTTP operations
 * @param {Function} fn - Function to run
 * @param {Object} contextValues - Values to initialize context with
 * @returns {Promise<any>}
 */
async function runInContext(fn, contextValues = {}) {
  const store = new Map();
  
  // Set default values
  store.set('correlationId', contextValues.correlationId || generateCorrelationId());
  store.set('requestId', contextValues.requestId || generateRequestId());
  store.set('isSystem', contextValues.isSystem !== false); // Default to system context
  
  // Set all provided values
  for (const [key, value] of Object.entries(contextValues)) {
    store.set(key, value);
  }

  return asyncLocalStorage.run(store, fn);
}

/**
 * Create a child context with inherited values
 * Useful for sub-operations that need their own correlation ID but inherit user context
 * @param {Function} fn - Function to run
 * @param {Object} overrides - Values to override or add
 * @returns {Promise<any>}
 */
async function runInChildContext(fn, overrides = {}) {
  const parentStore = asyncLocalStorage.getStore();
  const store = new Map(parentStore || []);
  
  // Generate child correlation ID linked to parent
  const parentCorrelationId = store.get('correlationId');
  const childCorrelationId = generateCorrelationId();
  store.set('correlationId', childCorrelationId);
  store.set('parentCorrelationId', parentCorrelationId);
  store.set('isChildContext', true);
  
  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    store.set(key, value);
  }

  return asyncLocalStorage.run(store, fn);
}

/**
 * Get request timing information
 * @returns {Object|null}
 */
function getRequestTiming() {
  const store = asyncLocalStorage.getStore();
  if (!store) return null;

  const startTime = store.get('startTime');
  if (!startTime) return null;

  return {
    startTime,
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Debug utility to dump current context
 * @returns {Object}
 */
function dumpContext() {
  const store = asyncLocalStorage.getStore();
  if (!store) return { empty: true };

  const entries = {};
  for (const [key, value] of store.entries()) {
    // Don't expose sensitive values in logs
    if (key.includes('password') || key.includes('token') || key.includes('secret')) {
      entries[key] = '[REDACTED]';
    } else {
      entries[key] = value;
    }
  }
  return entries;
}

/**
 * Express middleware to log request context on error
 * Helps with debugging by attaching context to errors
 */
function errorContextMiddleware() {
  return (err, req, res, next) => {
    const context = getRequestContext();
    if (context) {
      err.correlationId = context.get('correlationId');
      err.requestId = context.get('requestId');
      err.userId = context.get('userId');
      err.context = dumpContext();
    }
    next(err);
  };
}

module.exports = {
  // Core functions
  getRequestContext,
  getContextValue,
  setContextValue,
  
  // ID generation
  generateCorrelationId,
  generateRequestId,
  
  // Middleware
  requestContextMiddleware,
  errorContextMiddleware,
  
  // Context runners
  runInContext,
  runInChildContext,
  
  // Utilities
  getRequestTiming,
  dumpContext,
  
  // Export the storage for advanced use
  asyncLocalStorage,
};
