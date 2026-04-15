const mongoose = require('mongoose');

/**
 * PhysicalCount Schema
 * Supports physical inventory count sessions, variance tracking, and adjustments
 * Implements Requirement 7: Physical Inventory Count
 */

const countItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required'],
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters'],
  },
  // System stock quantity at the time of count
  systemQuantity: {
    type: Number,
    required: [true, 'System quantity is required'],
    default: 0,
  },
  // Physical count quantity entered by user
  physicalQuantity: {
    type: Number,
    default: null, // null means not yet counted
  },
  // Calculated variance (physical - system)
  variance: {
    type: Number,
    default: 0,
  },
  // Notes for this specific item count
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  // User who counted this item
  countedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  countedAt: {
    type: Date,
  },
  // Whether this item has been counted
  isCounted: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const physicalCountSchema = new mongoose.Schema({
  // Count session identifier
  countNumber: {
    type: String,
    required: [true, 'Count number is required'],
    trim: true,
  },
  // Count session name/description
  countName: {
    type: String,
    required: [true, 'Count name is required'],
    trim: true,
    maxlength: [200, 'Count name cannot exceed 200 characters'],
  },
  // Warehouse where count is being conducted
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse reference is required'],
  },
  // Count date/time
  countDate: {
    type: Date,
    required: [true, 'Count date is required'],
    default: Date.now,
  },
  // Status of the count session
  status: {
    type: String,
    enum: {
      values: ['draft', 'in_progress', 'completed', 'approved', 'cancelled'],
      message: 'Status must be one of: draft, in_progress, completed, approved, cancelled',
    },
    default: 'draft',
  },
  // Whether to freeze stock movements during count
  freezeMovements: {
    type: Boolean,
    default: false,
  },
  // Items being counted
  items: [countItemSchema],
  // Overall count statistics
  statistics: {
    totalItems: {
      type: Number,
      default: 0,
    },
    itemsCounted: {
      type: Number,
      default: 0,
    },
    itemsWithVariance: {
      type: Number,
      default: 0,
    },
    totalVarianceValue: {
      type: Number,
      default: 0,
    },
  },
  // Approval workflow
  approvalInfo: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    approvalNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Approval notes cannot exceed 500 characters'],
    },
  },
  // General notes for the count session
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
physicalCountSchema.index({ countNumber: 1 }, { unique: true });
physicalCountSchema.index({ warehouse: 1, countDate: -1 });
physicalCountSchema.index({ status: 1, countDate: -1 });
physicalCountSchema.index({ createdBy: 1 });
physicalCountSchema.index({ 'items.item': 1 });

// Virtual for count progress percentage
physicalCountSchema.virtual('progressPercentage').get(function () {
  if (this.statistics.totalItems === 0) return 0;
  return Math.round((this.statistics.itemsCounted / this.statistics.totalItems) * 100);
});

// Virtual for whether count is complete
physicalCountSchema.virtual('isComplete').get(function () {
  return this.statistics.itemsCounted === this.statistics.totalItems;
});

// Virtual for whether count has variances
physicalCountSchema.virtual('hasVariances').get(function () {
  return this.statistics.itemsWithVariance > 0;
});

/**
 * Start the count session
 * Changes status from draft to in_progress
 */
physicalCountSchema.methods.start = function () {
  if (this.status !== 'draft') {
    throw new Error('Only draft counts can be started');
  }
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

/**
 * Complete the count session
 * Changes status from in_progress to completed
 */
physicalCountSchema.methods.complete = function () {
  if (this.status !== 'in_progress') {
    throw new Error('Only in-progress counts can be completed');
  }
  if (!this.isComplete) {
    throw new Error('Cannot complete count - not all items have been counted');
  }
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

/**
 * Approve the count and create adjustments
 * @param {ObjectId} userId - User approving the count
 * @param {string} notes - Approval notes
 */
physicalCountSchema.methods.approve = async function (userId, notes = '') {
  if (this.status !== 'completed') {
    throw new Error('Only completed counts can be approved');
  }

  this.status = 'approved';
  this.approvalInfo = {
    approvedBy: userId,
    approvedAt: new Date(),
    approvalNotes: notes,
  };

  return this.save();
};

/**
 * Cancel the count session
 */
physicalCountSchema.methods.cancel = function () {
  if (['approved', 'cancelled'].includes(this.status)) {
    throw new Error('Cannot cancel an approved or already cancelled count');
  }
  this.status = 'cancelled';
  return this.save();
};

/**
 * Add an item to the count
 * @param {Object} itemData - Item data including item, batchNumber, systemQuantity
 */
physicalCountSchema.methods.addItem = function (itemData) {
  if (this.status !== 'draft') {
    throw new Error('Can only add items to draft counts');
  }

  // Check if item already exists
  const existingItem = this.items.find((i) => i.item.equals(itemData.item)
    && i.batchNumber === itemData.batchNumber);

  if (existingItem) {
    throw new Error('Item with this batch number already exists in the count');
  }

  this.items.push({
    item: itemData.item,
    batchNumber: itemData.batchNumber || null,
    systemQuantity: itemData.systemQuantity,
    physicalQuantity: null,
    variance: 0,
    isCounted: false,
  });

  this.statistics.totalItems = this.items.length;
  return this;
};

/**
 * Remove an item from the count
 * @param {string} itemId - Item _id to remove
 */
physicalCountSchema.methods.removeItem = function (itemId) {
  if (this.status !== 'draft') {
    throw new Error('Can only remove items from draft counts');
  }

  this.items = this.items.filter((i) => !i._id.equals(itemId));
  this.statistics.totalItems = this.items.length;
  this.updateStatistics();
  return this;
};

/**
 * Record physical count for an item
 * @param {string} itemId - Item _id in the count
 * @param {number} physicalQuantity - Physical count quantity
 * @param {ObjectId} userId - User who counted
 * @param {string} notes - Notes for this count
 */
physicalCountSchema.methods.recordCount = function (itemId, physicalQuantity, userId, notes = '') {
  if (!['draft', 'in_progress'].includes(this.status)) {
    throw new Error('Can only record counts for draft or in-progress counts');
  }

  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in count');
  }

  // Update item count
  item.physicalQuantity = physicalQuantity;
  item.variance = physicalQuantity - item.systemQuantity;
  item.isCounted = true;
  item.countedBy = userId;
  item.countedAt = new Date();
  if (notes) {
    item.notes = notes;
  }

  // Update statistics
  this.updateStatistics();

  return this;
};

/**
 * Update count statistics
 */
physicalCountSchema.methods.updateStatistics = function () {
  this.statistics.totalItems = this.items.length;
  this.statistics.itemsCounted = this.items.filter((i) => i.isCounted).length;
  this.statistics.itemsWithVariance = this.items.filter((i) => i.isCounted && i.variance !== 0).length;

  // Calculate total variance value (would need item prices for accurate calculation)
  // For now, just sum the variance quantities
  this.statistics.totalVarianceValue = this.items
    .filter((i) => i.isCounted)
    .reduce((sum, i) => sum + Math.abs(i.variance), 0);

  return this;
};

/**
 * Get variance report
 * Returns items with variances
 */
physicalCountSchema.methods.getVarianceReport = function () {
  return this.items
    .filter((i) => i.isCounted && i.variance !== 0)
    .map((i) => ({
      item: i.item,
      batchNumber: i.batchNumber,
      systemQuantity: i.systemQuantity,
      physicalQuantity: i.physicalQuantity,
      variance: i.variance,
      variancePercentage: i.systemQuantity !== 0
        ? Math.round((i.variance / i.systemQuantity) * 100)
        : 0,
      notes: i.notes,
      countedBy: i.countedBy,
      countedAt: i.countedAt,
    }));
};

/**
 * Get count sheet
 * Returns all items with system quantities for counting
 */
physicalCountSchema.methods.getCountSheet = function () {
  return this.items.map((i) => ({
    _id: i._id,
    item: i.item,
    batchNumber: i.batchNumber,
    systemQuantity: i.systemQuantity,
    physicalQuantity: i.physicalQuantity,
    isCounted: i.isCounted,
    variance: i.variance,
    notes: i.notes,
  }));
};

/**
 * Check if count can be edited
 */
physicalCountSchema.methods.canBeEdited = function () {
  return ['draft', 'in_progress'].includes(this.status);
};

/**
 * Check if count can be approved
 */
physicalCountSchema.methods.canBeApproved = function () {
  return this.status === 'completed' && this.isComplete;
};

// Static method to generate count number
physicalCountSchema.statics.generateCountNumber = async function () {
  const prefix = 'PC';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Find the last count number for this month
  const lastCount = await this.findOne({
    countNumber: new RegExp(`^${prefix}${year}${month}`),
  }).sort({ countNumber: -1 });

  let sequence = 1;
  if (lastCount) {
    const lastSequence = parseInt(lastCount.countNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
};

// Static method to find counts by warehouse
physicalCountSchema.statics.findByWarehouse = function (warehouseId, options = {}) {
  const {
    status, startDate, endDate, limit = 50, page = 1,
  } = options;
  const skip = (page - 1) * limit;

  const query = { warehouse: warehouseId };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.countDate = {};
    if (startDate) query.countDate.$gte = new Date(startDate);
    if (endDate) query.countDate.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ countDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('warehouse', 'name code')
    .populate('createdBy', 'username')
    .populate('approvalInfo.approvedBy', 'username');
};

// Static method to find counts by status
physicalCountSchema.statics.findByStatus = function (status, options = {}) {
  const { limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  return this.find({ status })
    .sort({ countDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('warehouse', 'name code')
    .populate('createdBy', 'username')
    .populate('approvalInfo.approvedBy', 'username');
};

// Static method to find pending approvals
physicalCountSchema.statics.findPendingApprovals = function () {
  return this.find({ status: 'completed' })
    .sort({ completedAt: -1 })
    .populate('warehouse', 'name code')
    .populate('createdBy', 'username');
};

// Static method to get count history for an item
physicalCountSchema.statics.getItemCountHistory = function (itemId, options = {}) {
  const { warehouseId, limit = 10 } = options;

  const match = {
    'items.item': new mongoose.Types.ObjectId(itemId),
    status: { $in: ['completed', 'approved'] },
  };

  if (warehouseId) {
    match.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  return this.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $match: { 'items.item': new mongoose.Types.ObjectId(itemId) } },
    {
      $project: {
        countNumber: 1,
        countName: 1,
        countDate: 1,
        warehouse: 1,
        status: 1,
        systemQuantity: '$items.systemQuantity',
        physicalQuantity: '$items.physicalQuantity',
        variance: '$items.variance',
        batchNumber: '$items.batchNumber',
        notes: '$items.notes',
      },
    },
    { $sort: { countDate: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'warehouses',
        localField: 'warehouse',
        foreignField: '_id',
        as: 'warehouse',
      },
    },
    { $unwind: '$warehouse' },
  ]);
};

// Pre-save hook to update statistics
physicalCountSchema.pre('save', function (next) {
  // Update statistics if items have changed
  if (this.isModified('items')) {
    this.updateStatistics();
  }

  // Validate that all items are counted before completing
  if (this.status === 'completed' && !this.isComplete) {
    return next(new Error('Cannot complete count - not all items have been counted'));
  }

  next();
});

// Pre-save validation
physicalCountSchema.pre('save', function (next) {
  // Ensure count date is not in the future
  if (this.countDate > new Date()) {
    return next(new Error('Count date cannot be in the future'));
  }

  // Ensure approved counts have approval info
  if (this.status === 'approved' && !this.approvalInfo?.approvedBy) {
    return next(new Error('Approved counts must have approval information'));
  }

  next();
});

module.exports = mongoose.model('PhysicalCount', physicalCountSchema);
