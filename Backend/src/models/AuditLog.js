/**
 * AuditLog Model
 * Comprehensive audit trail for tracking all significant data modifications
 * Optimized for write-heavy operations with appropriate indexing
 */

const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },

  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userName: {
    type: String,
  },
  userRole: {
    type: String,
  },

  // Action Details
  actionType: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'VIEW', 'APPROVE', 'REJECT'],
    required: true,
    index: true,
  },

  // Entity Information
  collectionName: {
    type: String,
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  documentIdentifier: {
    type: String, // Human-readable identifier (e.g., invoice number, customer code)
  },

  // Change Details (for UPDATE actions)
  changes: [changeSchema],

  // Additional Metadata
  summary: {
    type: String, // Brief description of the action
  },

  // Request Context
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  requestId: {
    type: String, // HTTP request ID for correlation
  },

  // Transaction Correlation
  correlationId: {
    type: String,
    index: true, // Links related operations in a single business transaction
  },
  parentCorrelationId: {
    type: String, // For nested operations
  },

  // Entity State Snapshots (for critical entities)
  beforeState: {
    type: mongoose.Schema.Types.Mixed, // Full document state before change (optional)
  },
  afterState: {
    type: mongoose.Schema.Types.Mixed, // Full document state after change (optional)
  },

  // Custom metadata for domain-specific tracking
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Status tracking
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending'],
    default: 'completed',
  },
  errorMessage: {
    type: String, // If status is 'failed'
  },
}, {
  timestamps: { createdAt: 'recordedAt', updatedAt: false },
  collection: 'auditlogs',
});

// Compound indexes for common query patterns
auditLogSchema.index({ collectionName: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ documentId: 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1, timestamp: -1 });
auditLogSchema.index({ actionType: 1, timestamp: -1 });
auditLogSchema.index({ collectionName: 1, actionType: 1, timestamp: -1 });

// TTL index for automatic cleanup of old audit logs (configurable)
// By default, keep logs for 7 years (2555 days)
auditLogSchema.index({
  timestamp: 1,
}, {
  expireAfterSeconds: 60 * 60 * 24 * 2555, // 7 years
  partialFilterExpression: { status: 'completed' },
});

// Static methods for querying audit logs
auditLogSchema.statics = {
  /**
   * Get audit history for a specific document
   */
  async getDocumentHistory(collectionName, documentId, options = {}) {
    const { limit = 50, skip = 0, actionTypes } = options;

    const query = { collectionName, documentId };
    if (actionTypes && actionTypes.length > 0) {
      query.actionType = { $in: actionTypes };
    }

    return this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  },

  /**
   * Get recent activity for a user
   */
  async getUserActivity(userId, options = {}) {
    const { limit = 50, skip = 0, since } = options;

    const query = { userId };
    if (since) {
      query.timestamp = { $gte: since };
    }

    return this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  },

  /**
   * Get all operations in a transaction
   */
  async getTransactionHistory(correlationId) {
    return this.find({ correlationId })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  },

  /**
   * Get activity summary for a date range
   */
  async getActivitySummary(startDate, endDate, groupBy = 'actionType') {
    return this.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: `$${groupBy}`,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueDocuments: { $addToSet: '$documentId' },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          uniqueDocumentCount: { $size: '$uniqueDocuments' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  },

  /**
   * Search audit logs with text matching
   */
  async search(query, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({
      $or: [
        { documentIdentifier: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { userName: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  },
};

// Instance methods
auditLogSchema.methods = {
  /**
   * Add a change record to an existing audit log
   */
  addChange(field, oldValue, newValue) {
    this.changes.push({ field, oldValue, newValue });
    return this;
  },

  /**
   * Mark audit log as failed with error message
   */
  markFailed(errorMessage) {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    return this.save();
  },
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
