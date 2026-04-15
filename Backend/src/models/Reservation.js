const mongoose = require('mongoose');

/**
 * Reservation Schema
 * Tracks stock reservations with expiration support
 * Requirement 10: Stock Reservation
 */
const reservationSchema = new mongoose.Schema({
  // Reference Information
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Order ID is required'],
  },
  orderNumber: {
    type: String,
    trim: true,
  },

  // Item and Location
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required'],
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse reference is required'],
  },

  // Batch Information (optional)
  batchNumber: {
    type: String,
    trim: true,
  },

  // Quantity
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'cancelled', 'expired'],
    default: 'active',
  },

  // Expiration
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
  },

  // Fulfillment tracking
  fulfilledAt: {
    type: Date,
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Cancellation tracking
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
    trim: true,
  },

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient queries
reservationSchema.index({ status: 1 });
reservationSchema.index({ expiresAt: 1 });
reservationSchema.index({ orderNumber: 1 });
reservationSchema.index({ batchNumber: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 }); // For finding expired reservations
reservationSchema.index({ item: 1, warehouse: 1, status: 1 }); // For item-warehouse queries
reservationSchema.index({ orderId: 1, status: 1 }); // For order queries
reservationSchema.index({ createdAt: 1 }); // For time-based queries

// Virtual for checking if reservation is expired
reservationSchema.virtual('isExpired').get(function () {
  return this.status === 'active' && this.expiresAt < new Date();
});

// Virtual for remaining time
reservationSchema.virtual('remainingTime').get(function () {
  if (this.status !== 'active') return 0;
  const now = new Date();
  return Math.max(0, this.expiresAt - now);
});

/**
 * Mark reservation as fulfilled
 * @param {string} userId - User ID who fulfilled the reservation
 */
reservationSchema.methods.fulfill = function (userId) {
  if (this.status !== 'active') {
    throw new Error(`Cannot fulfill reservation with status: ${this.status}`);
  }
  this.status = 'fulfilled';
  this.fulfilledAt = new Date();
  this.fulfilledBy = userId;
};

/**
 * Cancel reservation
 * @param {string} userId - User ID who cancelled the reservation
 * @param {string} reason - Reason for cancellation
 */
reservationSchema.methods.cancel = function (userId, reason) {
  if (this.status !== 'active') {
    throw new Error(`Cannot cancel reservation with status: ${this.status}`);
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
};

/**
 * Mark reservation as expired
 */
reservationSchema.methods.expire = function () {
  if (this.status !== 'active') {
    throw new Error(`Cannot expire reservation with status: ${this.status}`);
  }
  this.status = 'expired';
};

/**
 * Static method to find expired reservations
 * @param {number} limit - Maximum number of reservations to return
 * @returns {Promise<Array>} Array of expired reservations
 */
reservationSchema.statics.findExpired = function (limit = 100) {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() },
  })
    .limit(limit)
    .populate('item', 'code name')
    .populate('warehouse', 'code name')
    .populate('createdBy', 'username');
};

/**
 * Static method to find active reservations for an item
 * @param {string} itemId - Item ID
 * @param {string} warehouseId - Warehouse ID (optional)
 * @returns {Promise<Array>} Array of active reservations
 */
reservationSchema.statics.findActiveByItem = function (itemId, warehouseId = null) {
  const query = {
    item: itemId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  return this.find(query)
    .populate('warehouse', 'code name')
    .populate('orderId', 'invoiceNumber')
    .sort({ expiresAt: 1 });
};

/**
 * Static method to get total reserved quantity for an item
 * @param {string} itemId - Item ID
 * @param {string} warehouseId - Warehouse ID (optional)
 * @returns {Promise<number>} Total reserved quantity
 */
reservationSchema.statics.getTotalReserved = async function (itemId, warehouseId = null) {
  const query = {
    item: new mongoose.Types.ObjectId(itemId),
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (warehouseId) {
    query.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const result = await this.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);

  return result[0]?.total || 0;
};

module.exports = mongoose.model('Reservation', reservationSchema);
