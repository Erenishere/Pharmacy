const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
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
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
  },
  // Batch tracking support
  batchNumber: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  // Reserved quantity (allocated to orders but not yet fulfilled)
  reservedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Reserved quantity cannot be negative'],
  },
  // Legacy field for backward compatibility
  allocated: {
    type: Number,
    default: 0,
    min: [0, 'Allocated quantity cannot be negative'],
  },
  // Available quantity (calculated: quantity - reservedQuantity)
  available: {
    type: Number,
    default: 0,
    min: [0, 'Available quantity cannot be negative'],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: [0, 'Reorder point cannot be negative'],
  },
  lastCounted: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for available quantity (calculated field)
inventorySchema.virtual('availableQuantity').get(function () {
  // Use reservedQuantity if set, otherwise fall back to allocated for backward compatibility
  const reserved = this.reservedQuantity || this.allocated || 0;
  return Math.max(0, this.quantity - reserved);
});

// Indexes
inventorySchema.index(
  {
    item: 1, warehouse: 1, location: 1, batchNumber: 1,
  },
  { unique: true, sparse: true, name: 'item_warehouse_location_batch_unique' },
);

// Compound index for common queries
inventorySchema.index({ warehouse: 1, item: 1 });
inventorySchema.index({ item: 1, quantity: 1 });
inventorySchema.index({ warehouse: 1, quantity: 1 });
inventorySchema.index({ batchNumber: 1 });
inventorySchema.index({ item: 1, batchNumber: 1 });

// Pre-save hook to update available quantity
inventorySchema.pre('save', function (next) {
  // Sync reservedQuantity with allocated for backward compatibility
  if (this.isModified('allocated') && !this.isModified('reservedQuantity')) {
    this.reservedQuantity = this.allocated;
  }
  if (this.isModified('reservedQuantity') && !this.isModified('allocated')) {
    this.allocated = this.reservedQuantity;
  }

  const reserved = this.reservedQuantity || this.allocated || 0;
  this.available = Math.max(0, this.quantity - reserved);
  this.lastUpdated = Date.now();
  next();
});

/**
 * Update global item stock after any change to per-warehouse inventory
 */
const syncGlobalItemStock = async function (itemId) {
  if (!itemId) return;

  try {
    const Inventory = mongoose.model('Inventory');
    const Item = mongoose.model('Item');

    const result = await Inventory.aggregate([
      { $match: { item: new mongoose.Types.ObjectId(itemId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    const totalStock = result.length > 0 ? result[0].total : 0;
    await Item.findByIdAndUpdate(itemId, {
      'inventory.currentStock': Math.max(0, totalStock),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Failed to sync global stock for item ${itemId}:`, error.message);
  }
};

// Post-save hook to trigger sync
inventorySchema.post('save', async (doc) => {
  await syncGlobalItemStock(doc.item);
});

// Post-remove hook to trigger sync
inventorySchema.post('remove', async (doc) => {
  await syncGlobalItemStock(doc.item);
});

// Post-findOneAndUpdate hook to trigger sync (important for atomic updates)
inventorySchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    await syncGlobalItemStock(doc.item);
  }
});


/**
 * Reserve stock for an order
 * @param {number} quantity - Quantity to reserve
 * @returns {boolean} True if reservation was successful
 */
inventorySchema.methods.reserve = function (quantity) {
  if (this.available < quantity) {
    return false;
  }
  this.reservedQuantity = (this.reservedQuantity || 0) + quantity;
  this.allocated = this.reservedQuantity; // Keep in sync
  return true;
};

/**
 * Release reserved stock
 * @param {number} quantity - Quantity to release
 * @returns {boolean} True if release was successful
 */
inventorySchema.methods.releaseReservation = function (quantity) {
  if (this.reservedQuantity < quantity) {
    return false;
  }
  this.reservedQuantity -= quantity;
  this.allocated = this.reservedQuantity; // Keep in sync
  return true;
};

/**
 * Check if there's sufficient stock available
 * @param {number} requiredQuantity - The quantity needed
 * @returns {boolean} True if sufficient stock is available
 */
inventorySchema.methods.hasSufficientStock = function (requiredQuantity) {
  return this.available >= requiredQuantity;
};

/**
 * Allocate stock (legacy method - use reserve instead)
 * @param {number} quantity - Quantity to allocate
 * @returns {boolean} True if allocation was successful
 */
inventorySchema.methods.allocate = function (quantity) {
  return this.reserve(quantity);
};

/**
 * Release allocated stock (legacy method - use releaseReservation instead)
 * @param {number} quantity - Quantity to release
 * @returns {boolean} True if release was successful
 */
inventorySchema.methods.release = function (quantity) {
  return this.releaseReservation(quantity);
};

/**
 * Add to stock
 * @param {number} quantity - Quantity to add
 */
inventorySchema.methods.addStock = function (quantity) {
  this.quantity += quantity;
};

/**
 * Remove from stock
 * @param {number} quantity - Quantity to remove
 * @returns {boolean} True if removal was successful
 */
inventorySchema.methods.removeStock = function (quantity) {
  if (this.quantity < quantity) {
    return false;
  }
  this.quantity -= quantity;
  return true;
};

// Static method to get inventory for an item in a warehouse
inventorySchema.statics.findByItemAndWarehouse = async function (itemId, warehouseId, locationId = null, batchNumber = null) {
  const query = { item: itemId, warehouse: warehouseId };
  if (locationId) {
    query.location = locationId;
  }
  if (batchNumber) {
    query.batchNumber = batchNumber;
  }
  return this.findOne(query);
};

// Static method to get all inventory for a warehouse
inventorySchema.statics.findByWarehouse = function (warehouseId, options = {}) {
  const query = { warehouse: warehouseId };

  if (options.itemId) {
    query.item = options.itemId;
  }

  if (options.locationId) {
    query.location = options.locationId;
  }

  if (options.batchNumber) {
    query.batchNumber = options.batchNumber;
  }

  if (options.lowStock) {
    query.quantity = { $lte: options.lowStockThreshold || 10 };
  }

  if (options.onlyAvailable) {
    query.quantity = { $gt: 0 };
  }

  return this.find(query).populate('item', 'name code unit');
};

// Static method to get total stock across all warehouses
inventorySchema.statics.getTotalStock = function (itemId, batchNumber = null) {
  const matchQuery = { item: new mongoose.Types.ObjectId(itemId) };
  if (batchNumber) {
    matchQuery.batchNumber = batchNumber;
  }

  return this.aggregate([
    { $match: matchQuery },
    { $group: { _id: null, total: { $sum: '$quantity' }, totalReserved: { $sum: '$reservedQuantity' } } },
  ]).then((results) => ({
    total: results[0]?.total || 0,
    reserved: results[0]?.totalReserved || 0,
    available: (results[0]?.total || 0) - (results[0]?.totalReserved || 0),
  }));
};

// Static method to get inventory by batch
inventorySchema.statics.findByBatch = function (batchNumber, options = {}) {
  const query = { batchNumber };

  if (options.itemId) {
    query.item = options.itemId;
  }

  if (options.warehouseId) {
    query.warehouse = options.warehouseId;
  }

  return this.find(query).populate('item warehouse');
};

module.exports = mongoose.model('Inventory', inventorySchema);
