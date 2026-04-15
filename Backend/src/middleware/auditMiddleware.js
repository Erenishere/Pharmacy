/**
 * Audit Middleware for Mongoose
 * Automatically logs all database operations on critical models
 * Integrates with AuditService for centralized logging
 */

const auditService = require('../services/auditService');
const { getRequestContext } = require('../utils/requestContext');

/**
 * Create audit middleware for a Mongoose schema
 * @param {mongoose.Schema} schema - The schema to instrument
 * @param {Object} options - Configuration options
 * @param {string} options.collectionName - Collection name override
 * @param {string} options.identifierField - Field to use as document identifier
 * @param {Array<string>} options.excludedFields - Fields to exclude from change tracking
 * @param {boolean} options.logViews - Whether to log view operations
 * @param {boolean} options.storeFullState - Whether to store full document state
 */
function createAuditMiddleware(schema, options = {}) {
  const {
    collectionName,
    identifierField = '_id',
    excludedFields = ['__v', 'updatedAt', 'createdAt'],
    logViews = false,
    storeFullState = false,
  } = options;

  const getCollectionName = () => collectionName || schema.options.collection || schema.collection?.name || 'unknown';
  const getDocumentIdentifier = (doc) => doc[identifierField] || doc._id?.toString() || 'unknown';
  const getContext = () => getRequestContext() || {};

  // Hook: Post-save for CREATE
  schema.post('save', async function(doc) {
    try {
      const context = getContext();
      if (!context.userId && !context.isSystem) return;

      await auditService.logCreate({
        collectionName: getCollectionName(),
        documentId: doc._id,
        documentIdentifier: getDocumentIdentifier(doc),
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        correlationId: context.correlationId,
        afterState: storeFullState ? doc.toObject() : undefined,
      });
    } catch (error) {
      console.error('Audit middleware error on save:', error);
    }
  });

  // Hook: Pre-findOneAndUpdate to capture old state
  schema.pre('findOneAndUpdate', async function() {
    try {
      const doc = await this.model.findOne(this.getQuery()).lean();
      this._oldDoc = doc;
    } catch (error) {
      console.error('Audit middleware error on pre-update:', error);
    }
  });

  // Hook: Post-findOneAndUpdate for UPDATE
  schema.post('findOneAndUpdate', async function(doc) {
    try {
      if (!doc) return;
      
      const context = getContext();
      if (!context.userId && !context.isSystem) return;

      const changes = calculateChanges(this._oldDoc, doc, excludedFields);
      if (changes.length === 0) return; // No actual changes

      await auditService.logUpdate({
        collectionName: getCollectionName(),
        documentId: doc._id,
        documentIdentifier: getDocumentIdentifier(doc),
        changes,
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        correlationId: context.correlationId,
        beforeState: storeFullState ? this._oldDoc : undefined,
        afterState: storeFullState ? doc.toObject() : undefined,
      });
    } catch (error) {
      console.error('Audit middleware error on update:', error);
    }
  });

  // Hook: Pre-updateOne to capture old state
  schema.pre('updateOne', async function() {
    try {
      const doc = await this.model.findOne(this.getQuery()).lean();
      this._oldDoc = doc;
    } catch (error) {
      console.error('Audit middleware error on pre-updateOne:', error);
    }
  });

  // Hook: Post-updateOne for UPDATE
  schema.post('updateOne', async function(result) {
    try {
      if (result.modifiedCount === 0) return;

      const doc = await this.model.findOne(this.getQuery());
      if (!doc) return;

      const context = getContext();
      if (!context.userId && !context.isSystem) return;

      const changes = calculateChanges(this._oldDoc, doc, excludedFields);

      await auditService.logUpdate({
        collectionName: getCollectionName(),
        documentId: doc._id,
        documentIdentifier: getDocumentIdentifier(doc),
        changes,
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        correlationId: context.correlationId,
      });
    } catch (error) {
      console.error('Audit middleware error on updateOne:', error);
    }
  });

  // Hook: Post-deleteOne for DELETE
  schema.post('deleteOne', async function(result) {
    try {
      if (result.deletedCount === 0) return;

      const context = getContext();
      if (!context.userId && !context.isSystem) return;

      await auditService.logDelete({
        collectionName: getCollectionName(),
        documentId: this.getQuery()._id,
        documentIdentifier: this._oldDoc ? getDocumentIdentifier(this._oldDoc) : 'unknown',
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        correlationId: context.correlationId,
        beforeState: storeFullState ? this._oldDoc : undefined,
      });
    } catch (error) {
      console.error('Audit middleware error on deleteOne:', error);
    }
  });

  // Hook: Post-findOneAndDelete for DELETE
  schema.post('findOneAndDelete', async function(doc) {
    try {
      if (!doc) return;

      const context = getContext();
      if (!context.userId && !context.isSystem) return;

      await auditService.logDelete({
        collectionName: getCollectionName(),
        documentId: doc._id,
        documentIdentifier: getDocumentIdentifier(doc),
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        correlationId: context.correlationId,
        beforeState: storeFullState ? doc.toObject() : undefined,
      });
    } catch (error) {
      console.error('Audit middleware error on findOneAndDelete:', error);
    }
  });
}

/**
 * Calculate differences between two objects
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - Updated object
 * @param {Array<string>} excludedFields - Fields to exclude
 * @returns {Array<Object>} Array of change objects
 */
function calculateChanges(oldObj, newObj, excludedFields = []) {
  const changes = [];
  
  if (!oldObj || !newObj) return changes;

  // Convert mongoose documents to plain objects
  const oldData = oldObj.toObject ? oldObj.toObject() : oldObj;
  const newData = newObj.toObject ? newObj.toObject() : newObj;

  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ]);

  for (const key of allKeys) {
    // Skip excluded fields
    if (excludedFields.includes(key)) continue;
    if (key.startsWith('_')) continue; // Skip internal fields

    const oldValue = oldData[key];
    const newValue = newData[key];

    // Compare values (handle dates, objects, arrays)
    if (!isEqual(oldValue, newValue)) {
      changes.push({
        field: key,
        oldValue: sanitizeValue(oldValue),
        newValue: sanitizeValue(newValue),
      });
    }
  }

  return changes;
}

/**
 * Deep equality check for values
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function isEqual(a, b) {
  if (a === b) return true;
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => isEqual(val, b[idx]));
  }
  
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => isEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Sanitize values for audit log (remove sensitive data, truncate large values)
 * @param {any} value
 * @returns {any}
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) return value;
  
  // Truncate long strings
  if (typeof value === 'string' && value.length > 1000) {
    return value.substring(0, 1000) + '...[truncated]';
  }
  
  // Handle arrays
  if (Array.isArray(value) && value.length > 10) {
    return [...value.slice(0, 10), `...and ${value.length - 10} more items`];
  }
  
  return value;
}

/**
 * Apply audit middleware to multiple models
 * @param {Object} models - Object containing mongoose models
 * @param {Object} options - Configuration options per model
 */
function applyAuditToModels(models, options = {}) {
  const modelOptions = {
    Invoice: { storeFullState: true, identifierField: 'invoiceNumber' },
    Customer: { storeFullState: false, identifierField: 'code' },
    Supplier: { storeFullState: false, identifierField: 'code' },
    Item: { storeFullState: false, identifierField: 'code' },
    StockMovement: { storeFullState: false },
    CashReceipt: { storeFullState: true },
    CashPayment: { storeFullState: true },
    Batch: { storeFullState: false, identifierField: 'batchNumber' },
    User: { storeFullState: false, identifierField: 'username' },
    LedgerEntry: { storeFullState: false },
    ...options,
  };

  for (const [modelName, model] of Object.entries(models)) {
    if (model.schema && modelOptions[modelName]) {
      createAuditMiddleware(model.schema, {
        collectionName: model.collection?.name,
        ...modelOptions[modelName],
      });
    }
  }
}

module.exports = {
  createAuditMiddleware,
  applyAuditToModels,
  calculateChanges,
  isEqual,
  sanitizeValue,
};
