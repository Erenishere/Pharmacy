/**
 * Audit Service
 * Provides centralized audit logging functionality with correlation tracking
 * Designed for fire-and-forget pattern to not block main operations
 */

const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');
const { AsyncLocalStorage } = require('async_hooks');

// Async local storage for request context propagation
const auditContext = new AsyncLocalStorage();

class AuditService {
  constructor() {
    // Configuration
    this.config = {
      enableSyncLogging: process.env.AUDIT_SYNC_LOGGING === 'true',
      logFailedOnly: process.env.AUDIT_LOG_FAILED_ONLY === 'true',
      maxRetries: 3,
      collectionsToAudit: [
        'invoices',
        'customers',
        'suppliers',
        'items',
        'stockmovements',
        'cashreceipts',
        'cashpayments',
        'batches',
        'users',
        'ledgerentries',
      ],
    };
  }

  /**
   * Generate a unique correlation ID for linking related operations
   * @returns {string} UUID
   */
  generateCorrelationId() {
    return uuidv4();
  }

  /**
   * Set the correlation ID for the current async context
   * @param {string} correlationId
   */
  setCorrelationId(correlationId) {
    const store = auditContext.getStore() || new Map();
    store.set('correlationId', correlationId);
    auditContext.enterWith(store);
  }

  /**
   * Get the current correlation ID
   * @returns {string|null}
   */
  getCorrelationId() {
    const store = auditContext.getStore();
    return store ? store.get('correlationId') : null;
  }

  /**
   * Create a child correlation ID for nested operations
   * @param {string} parentCorrelationId
   * @returns {string}
   */
  createChildCorrelationId(parentCorrelationId) {
    return `${parentCorrelationId}:${uuidv4()}`;
  }

  /**
   * Log a CREATE action
   * @param {Object} data
   */
  async logCreate(data) {
    return this.createLogEntry({ ...data, actionType: 'CREATE' });
  }

  /**
   * Log an UPDATE action with changes
   * @param {Object} data
   */
  async logUpdate(data) {
    return this.createLogEntry({ ...data, actionType: 'UPDATE' });
  }

  /**
   * Log a DELETE action
   * @param {Object} data
   */
  async logDelete(data) {
    return this.createLogEntry({ ...data, actionType: 'DELETE' });
  }

  /**
   * Log a LOGIN action
   * @param {Object} data
   */
  async logLogin(data) {
    return this.createLogEntry({ ...data, actionType: 'LOGIN' });
  }

  /**
   * Log a LOGOUT action
   * @param {Object} data
   */
  async logLogout(data) {
    return this.createLogEntry({ ...data, actionType: 'LOGOUT' });
  }

  /**
   * Log an EXPORT action
   * @param {Object} data
   */
  async logExport(data) {
    return this.createLogEntry({ ...data, actionType: 'EXPORT' });
  }

  /**
   * Log a PRINT action
   * @param {Object} data
   */
  async logPrint(data) {
    return this.createLogEntry({ ...data, actionType: 'PRINT' });
  }

  /**
   * Log a VIEW action (for sensitive data access)
   * @param {Object} data
   */
  async logView(data) {
    return this.createLogEntry({ ...data, actionType: 'VIEW' });
  }

  /**
   * Log an APPROVE action
   * @param {Object} data
   */
  async logApprove(data) {
    return this.createLogEntry({ ...data, actionType: 'APPROVE' });
  }

  /**
   * Log a REJECT action
   * @param {Object} data
   */
  async logReject(data) {
    return this.createLogEntry({ ...data, actionType: 'REJECT' });
  }

  /**
   * Core method to create an audit log entry
   * Uses fire-and-forget pattern for performance
   * @param {Object} params
   */
  async createLogEntry(params) {
    const {
      actionType,
      collectionName,
      documentId,
      documentIdentifier,
      changes = [],
      summary,
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      requestId,
      correlationId,
      parentCorrelationId,
      beforeState,
      afterState,
      metadata = {},
    } = params;

    // Get correlation ID from context if not provided
    const finalCorrelationId = correlationId || this.getCorrelationId();

    const logEntry = {
      timestamp: new Date(),
      actionType,
      collectionName,
      documentId,
      documentIdentifier,
      changes: this.sanitizeChanges(changes),
      summary: summary || this.generateSummary(actionType, collectionName, documentIdentifier),
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      requestId,
      correlationId: finalCorrelationId,
      parentCorrelationId,
      beforeState: this.shouldStoreState(actionType) ? beforeState : undefined,
      afterState: this.shouldStoreState(actionType) ? afterState : undefined,
      metadata,
      status: 'completed',
    };

    // Fire-and-forget: Don't block the main operation
    if (this.config.enableSyncLogging) {
      // Synchronous logging (for critical operations)
      try {
        return await AuditLog.create(logEntry);
      } catch (error) {
        console.error('Synchronous audit log failed:', error);
        // Don't throw - audit logging should not break business logic
        return null;
      }
    } else {
      // Asynchronous logging (default)
      this.saveLogAsync(logEntry);
      return null;
    }
  }

  /**
   * Save log entry asynchronously with retry logic
   * @param {Object} logEntry
   */
  async saveLogAsync(logEntry) {
    let retries = 0;
    while (retries < this.config.maxRetries) {
      try {
        await AuditLog.create(logEntry);
        return;
      } catch (error) {
        retries++;
        if (retries >= this.config.maxRetries) {
          console.error('Audit log failed after max retries:', error);
          // In production, you might want to send this to a fallback log system
          // or a message queue for later processing
          break;
        }
        // Exponential backoff
        await this.sleep(100 * Math.pow(2, retries));
      }
    }
  }

  /**
   * Sanitize changes to prevent storing sensitive data
   * @param {Array} changes
   * @returns {Array}
   */
  sanitizeChanges(changes) {
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    
    return changes.map(change => {
      const sanitized = { ...change };
      
      // Check if field name indicates sensitive data
      if (sensitiveFields.some(field => change.field.toLowerCase().includes(field))) {
        sanitized.oldValue = change.oldValue ? '[REDACTED]' : null;
        sanitized.newValue = change.newValue ? '[REDACTED]' : null;
      }
      
      return sanitized;
    });
  }

  /**
   * Determine if we should store full document state
   * @param {string} actionType
   * @returns {boolean}
   */
  shouldStoreState(actionType) {
    // Store state for deletes and critical updates
    return ['DELETE', 'APPROVE', 'REJECT'].includes(actionType);
  }

  /**
   * Generate a human-readable summary
   * @param {string} actionType
   * @param {string} collectionName
   * @param {string} documentIdentifier
   * @returns {string}
   */
  generateSummary(actionType, collectionName, documentIdentifier) {
    const id = documentIdentifier || 'Unknown';
    const collection = collectionName || 'Unknown';
    
    switch (actionType) {
      case 'CREATE':
        return `Created new ${collection}: ${id}`;
      case 'UPDATE':
        return `Updated ${collection}: ${id}`;
      case 'DELETE':
        return `Deleted ${collection}: ${id}`;
      case 'LOGIN':
        return `User logged in`;
      case 'LOGOUT':
        return `User logged out`;
      case 'EXPORT':
        return `Exported ${collection}: ${id}`;
      case 'PRINT':
        return `Printed ${collection}: ${id}`;
      case 'VIEW':
        return `Viewed ${collection}: ${id}`;
      case 'APPROVE':
        return `Approved ${collection}: ${id}`;
      case 'REJECT':
        return `Rejected ${collection}: ${id}`;
      default:
        return `${actionType} on ${collection}: ${id}`;
    }
  }

  /**
   * Sleep utility
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recent audit logs with pagination
   * @param {Object} options
   */
  async getRecentLogs(options = {}) {
    const { limit = 50, skip = 0, collectionName, actionType } = options;

    const query = {};
    if (collectionName) query.collectionName = collectionName;
    if (actionType) query.actionType = actionType;

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email')
      .lean();
  }

  /**
   * Get document history
   * @param {string} collectionName
   * @param {string} documentId
   * @param {Object} options
   */
  async getDocumentHistory(collectionName, documentId, options = {}) {
    return AuditLog.getDocumentHistory(collectionName, documentId, options);
  }

  /**
   * Get transaction history by correlation ID
   * @param {string} correlationId
   */
  async getTransactionHistory(correlationId) {
    return AuditLog.getTransactionHistory(correlationId);
  }

  /**
   * Get activity summary for date range
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {string} groupBy
   */
  async getActivitySummary(startDate, endDate, groupBy = 'actionType') {
    return AuditLog.getActivitySummary(startDate, endDate, groupBy);
  }

  /**
   * Search audit logs
   * @param {string} query
   * @param {Object} options
   */
  async search(query, options = {}) {
    return AuditLog.search(query, options);
  }

  /**
   * Middleware for Express to setup audit context
   * Should be used early in the middleware chain
   */
  middleware() {
    return (req, res, next) => {
      const store = new Map();
      
      // Generate or get correlation ID
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      store.set('correlationId', correlationId);
      
      // Make correlation ID available in response headers
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Store request context
      store.set('requestId', req.id || uuidv4());
      store.set('ipAddress', req.ip);
      store.set('userAgent', req.headers['user-agent']);
      
      // Run rest of middleware chain in this context
      auditContext.run(store, () => {
        next();
      });
    };
  }
}

// Export singleton instance
module.exports = new AuditService();
