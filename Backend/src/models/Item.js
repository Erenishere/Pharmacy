const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Item code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Item code cannot exceed 20 characters'],
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [200, 'Item name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  // Company/Manufacturer Reference (Requirement 1.1)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
  // Selling Group for Scheme Eligibility (Requirement 1.2)
  sellingGroup: {
    type: String, // Kept for legacy compatibility
    default: null,
  },
  companyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyGroup',
    default: null
  },
  // Formula/Generic Reference (Requirement 1.3)
  formulaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formula',
  },
  // Generic Size Reference (Requirement 1.4)
  formulaSizeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormulaSize',
  },
  // Business Type (Requirement 1.5)
  businessTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business type is required'],
  },
  // Category and Sub-category References (Requirement 1.6)
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
  },
  // Legacy category field (kept for backward compatibility)
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters'],
    enum: {
      values: ['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen', 'bottle', 'tube', 'strip', 'tablet', 'capsule', 'pair'],
      message: 'Unit must be one of: piece, kg, gram, liter, ml, meter, cm, box, pack, dozen, bottle, tube, strip, tablet, capsule, pair',
    },
  },
  // Multiple Pricing Levels (Requirement 1.7)
  pricing: {
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Purchase price cannot be negative'],
    },
    boxPurchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Box purchase price cannot be negative'],
      description: 'Purchase price per box/dozen',
    },
    cartonPurchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Carton purchase price cannot be negative'],
      description: 'Purchase price per carton',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    salePrice: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Sale price cannot be negative'],
    },
    boxSalePrice: {
      type: Number,
      default: 0,
      min: [0, 'Box sale price cannot be negative'],
      description: 'Sale price per box/dozen',
    },
    cartonSalePrice: {
      type: Number,
      default: 0,
      min: [0, 'Carton sale price cannot be negative'],
      description: 'Sale price per carton',
    },
    tradePrice: {
      type: Number,
      default: 0,
      min: [0, 'Trade price cannot be negative'],
    },
    retailPrice: {
      type: Number,
      default: 0,
      min: [0, 'Retail price cannot be negative'],
    },
    boxRetailPrice: {
      type: Number,
      default: 0,
      min: [0, 'Box retail price cannot be negative'],
      description: 'Retail price per box/dozen',
    },
    wholesalePrice: {
      type: Number,
      default: 0,
      min: [0, 'Wholesale price cannot be negative'],
    },
    distributorPrice: {
      type: Number,
      default: 0,
      min: [0, 'Distributor price cannot be negative'],
    },
    mrp: {
      type: Number,
      default: 0,
      min: [0, 'MRP cannot be negative'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PKR',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    goodsChargesOnUnit: {
      type: Number,
      default: 0,
      min: [0, 'Goods charges cannot be negative'],
      description: 'Additional goods charges per unit',
    },
  },
  // Tax Configuration (Requirement 1.9)
  tax: {
    taxType: {
      type: String,
      enum: ['GST', 'VAT', 'Exempt', 'Zero-Rated'],
      default: 'GST',
    },
    gstRate: {
      type: Number,
      enum: [0, 4, 18],
      default: 18,
      min: [0, 'GST rate cannot be negative'],
      max: [100, 'GST rate cannot exceed 100%'],
    },
    gstRateNonFilter: {
      type: Number,
      enum: [0, 4, 18],
      default: 0,
      min: [0, 'GST non-filter rate cannot be negative'],
      max: [100, 'GST non-filter rate cannot exceed 100%'],
      description: 'GST rate for non-filter items',
    },
    whtRate: {
      type: Number,
      default: 0,
      min: [0, 'WHT rate cannot be negative'],
      max: [100, 'WHT rate cannot exceed 100%'],
    },
    taxCategory: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax category cannot exceed 50 characters'],
      default: 'standard',
    },
    hsnCode: {
      type: String,
      trim: true,
      maxlength: [20, 'HSN code cannot exceed 20 characters'],
    },
  },
  // Regulatory Fields (Requirement 1.10)
  regulatory: {
    taxRegistrationNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax registration number cannot exceed 50 characters'],
    },
    complianceStatus: {
      type: String,
      enum: ['Compliant', 'Pending', 'Non-Compliant', 'Not Applicable'],
      default: 'Not Applicable',
    },
    licenseNumbers: [{
      type: String,
      trim: true,
      maxlength: [50, 'License number cannot exceed 50 characters'],
    }],
  },
  // Inventory Parameters (Requirement 1.8)
  inventory: {
    openingStock: {
      type: Number,
      default: 0,
      min: [0, 'Opening stock cannot be negative'],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Current stock cannot be negative'],
    },
    batches: [{
      batchNumber: { type: String, required: true },
      expiryDate: { type: Date, required: true },
      stock: { type: Number, required: true, min: 0 },
      costPrice: { type: Number }, // Batch specific cost can vary
      salePrice: { type: Number }, // Batch specific sale price
    }],
    minimumStock: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock cannot be negative'],
    },
    maximumStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative'],
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: [0, 'Reorder point cannot be negative'],
    },
    leadTime: {
      type: Number,
      default: 0,
      min: [0, 'Lead time cannot be negative'],
      description: 'Lead time in days',
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      description: 'Bin/shelf location in warehouse',
    },
    alertNoSalesDays: {
      type: Number,
      default: 0,
      min: [0, 'Alert no sales days cannot be negative'],
      description: 'Days limit for no sales alert',
    },
    lastSaleDate: {
      type: Date,
      description: 'Last date this item was sold',
    },
  },
  // Product Specifications (Requirement 1.11)
  // Phase 2 - Barcode Integration (Requirement 13.1 - Task 46.1)
  barcode: {
    type: String,
    trim: true,
    maxlength: [50, 'Barcode cannot exceed 50 characters'],
  },
  sku: {
    type: String,
    trim: true,
    maxlength: [50, 'SKU cannot exceed 50 characters'],
  },
  // Phase 2 - Box/Unit System (Requirement 12.4 - Task 45.1)
  packSize: {
    type: Number,
    default: 1,
    min: [1, 'Pack size must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Pack size must be a whole number',
    },
    description: 'Number of units per pack/box',
  },
  packingSize: {
    type: String,
    trim: true,
    maxlength: [50, 'Packing size cannot exceed 50 characters'],
    description: 'e.g., 10x10 tablets, 100ml bottle',
  },
  // Carton Packaging Fields (Form Specification)
  carton: {
    size: {
      length: { type: Number, default: 0, min: 0 },
      width: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 },
    },
    unitsInCarton: {
      type: Number,
      default: 0,
      min: [0, 'Units in carton cannot be negative'],
      description: 'Number of units per carton',
    },
    boxInCarton: {
      type: Number,
      default: 0,
      min: [0, 'Box in carton cannot be negative'],
      description: 'Number of boxes per carton',
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, 'Carton weight cannot be negative'],
      description: 'Carton weight in kg',
    },
  },
  box: {
    unitsInBox: {
      type: Number,
      default: 0,
      min: [0, 'Units in box cannot be negative'],
      description: 'Number of units per box/dozen',
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, 'Box weight cannot be negative'],
      description: 'Box weight in kg',
    },
  },
  unitWeight: {
    type: Number,
    default: 0,
    min: [0, 'Unit weight cannot be negative'],
    description: 'Unit weight in kg',
  },
  // Batch and Expiry Tracking (Requirement 1.12)
  batchTrackingEnabled: {
    type: Boolean,
    default: true,
    description: 'Enable batch number tracking',
  },
  expiryTrackingEnabled: {
    type: Boolean,
    default: true,
    description: 'Enable expiry date management',
  },
  // Supplier Information (Requirement 1.13)
  supplier: {
    primarySupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer', // Using Customer model for suppliers (type='supplier')
    },
    alternativeSuppliers: [{
      supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
      supplierItemCode: {
        type: String,
        trim: true,
        maxlength: [50, 'Supplier item code cannot exceed 50 characters'],
      },
      leadTime: {
        type: Number,
        default: 0,
        min: [0, 'Lead time cannot be negative'],
      },
    }],
    supplierItemCode: {
      type: String,
      trim: true,
      maxlength: [50, 'Supplier item code cannot exceed 50 characters'],
    },
    leadTimeFromSupplier: {
      type: Number,
      default: 0,
      min: [0, 'Lead time cannot be negative'],
      description: 'Lead time in days from primary supplier',
    },
  },
  // Optional Fields (Requirement 1.14)
  productImage: {
    type: String,
    trim: true,
    maxlength: [500, 'Product image URL cannot exceed 500 characters'],
  },
  storageConditions: {
    type: String,
    trim: true,
    maxlength: [500, 'Storage conditions cannot exceed 500 characters'],
  },
  handlingInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Handling instructions cannot exceed 500 characters'],
  },
  safetyInformation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Safety information cannot exceed 1000 characters'],
  },
  // Phase 2 - Manufacturer (User Request)
  manufacturer: {
    type: String,
    trim: true,
  },
  // Phase 2 - Warranty Management (Requirement 32 - Task 76.5)
  defaultWarrantyMonths: {
    type: Number,
    default: 0,
    min: [0, 'Default warranty months cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Default warranty months must be a whole number',
    },
  },
  defaultWarrantyDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Default warranty details cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes (unique indexes already handled by schema 'unique: true')
itemSchema.index({ name: 1 });
itemSchema.index({ companyId: 1 });
itemSchema.index({ sellingGroup: 1 });
itemSchema.index({ formulaId: 1 });
itemSchema.index({ formulaSizeId: 1 });
itemSchema.index({ businessTypeId: 1 });
itemSchema.index({ categoryId: 1 });
itemSchema.index({ subCategoryId: 1 });
itemSchema.index({ category: 1 }); // Legacy field
itemSchema.index({ isActive: 1 });
itemSchema.index({ 'inventory.currentStock': 1 });
itemSchema.index({ 'inventory.batches.batchNumber': 1 });
itemSchema.index({ 'inventory.batches.expiryDate': 1 });
itemSchema.index({ 'pricing.salePrice': 1 });
itemSchema.index({ packSize: 1 });
itemSchema.index({ 'supplier.primarySupplierId': 1 });
itemSchema.index({
  name: 'text', code: 'text', category: 'text', description: 'text', barcode: 'text', sku: 'text',
});
itemSchema.index({ code: 1 }, { unique: true });
itemSchema.index({ barcode: 1 }, { unique: true, sparse: true });
itemSchema.index({ sku: 1 }, { unique: true, sparse: true });

// Virtual for profit margin
itemSchema.virtual('profitMargin').get(function () {
  if (this.pricing.costPrice === 0) return 0;
  return ((this.pricing.salePrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
});

// Virtual for stock status
itemSchema.virtual('stockStatus').get(function () {
  if (this.inventory.currentStock <= 0) return 'out_of_stock';
  if (this.inventory.currentStock <= this.inventory.minimumStock) return 'low_stock';
  if (this.inventory.currentStock >= this.inventory.maximumStock) return 'overstock';
  return 'in_stock';
});

// Instance method to check stock availability
itemSchema.methods.checkStockAvailability = function (quantity) {
  // Check total stock
  return this.inventory.currentStock >= quantity;
};

// Instance method to calculate tax amount
itemSchema.methods.calculateTaxAmount = function (baseAmount) {
  const gstAmount = (baseAmount * this.tax.gstRate) / 100;
  const whtAmount = (baseAmount * this.tax.whtRate) / 100;
  return {
    gst: gstAmount,
    wht: whtAmount,
    total: gstAmount + whtAmount,
  };
};

// Instance method to update stock
// DEPRECATED: Use Inventory collection instead for warehouse-specific tracking
itemSchema.methods.updateStock = function (quantity, operation = 'add') {
  console.warn(
    `[DEPRECATED] Item.updateStock() called for ${this.code}. ` +
    `Use Inventory collection methods for proper warehouse tracking.`
  );
  if (operation === 'add') {
    this.inventory.currentStock += quantity;
  } else if (operation === 'subtract') {
    this.inventory.currentStock = Math.max(0, this.inventory.currentStock - quantity);
  }
  return this.save();
};

// Instance method to update batch-specific stock (FEFO enforcement)
// DEPRECATED: Use Inventory + Batch collections for proper warehouse tracking
itemSchema.methods.updateBatchStock = function (batchNumber, quantity, operation = 'subtract') {
  console.warn(
    `[DEPRECATED] Item.updateBatchStock() called for ${this.code}. ` +
    `Use Inventory + Batch collections for proper warehouse tracking.`
  );
  // Find the batch by batchNumber
  const batch = this.inventory.batches.find((b) => b.batchNumber === batchNumber);

  if (batch) {
    // Update batch-specific stock
    if (operation === 'subtract') {
      batch.stock = Math.max(0, batch.stock - quantity);
    } else if (operation === 'add') {
      batch.stock += quantity;
    }
  } else {
    // If batch not found, log warning but still proceed with global stock update
    console.warn(`Batch ${batchNumber} not found for item ${this.code}. Updating global stock only.`);
  }

  // Also update global currentStock to keep it in sync
  if (operation === 'subtract') {
    this.inventory.currentStock = Math.max(0, this.inventory.currentStock - quantity);
  } else if (operation === 'add') {
    this.inventory.currentStock += quantity;
  }

  return this.save();
};

// Instance method to check batch stock availability
itemSchema.methods.checkBatchStockAvailability = function (batchNumber, quantity) {
  const batch = this.inventory.batches.find((b) => b.batchNumber === batchNumber);
  if (batch) {
    return batch.stock >= quantity;
  }
  // Fallback to global stock if batch not found
  return this.inventory.currentStock >= quantity;
};

// Instance method to check if item is near expiry
itemSchema.methods.isNearExpiry = function (daysThreshold = 30) {
  if (!this.expiryTrackingEnabled || !this.inventory.batches.length) {
    return false;
  }

  const today = new Date();
  const thresholdDate = new Date(today.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));

  return this.inventory.batches.some((batch) => new Date(batch.expiryDate) <= thresholdDate);
};

// Instance method to get expiring batches
itemSchema.methods.getExpiringBatches = function (daysThreshold = 30) {
  if (!this.expiryTrackingEnabled || !this.inventory.batches.length) {
    return [];
  }

  const today = new Date();
  const thresholdDate = new Date(today.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));

  return this.inventory.batches.filter((batch) => new Date(batch.expiryDate) <= thresholdDate && batch.stock > 0);
};

// Instance method to check if reorder is needed
itemSchema.methods.needsReorder = function () {
  return this.inventory.currentStock <= this.inventory.reorderPoint;
};

// Instance method to get price by type
itemSchema.methods.getPriceByType = function (priceType = 'salePrice') {
  const validTypes = ['purchasePrice', 'costPrice', 'salePrice', 'tradePrice', 'retailPrice', 'wholesalePrice', 'distributorPrice', 'mrp'];
  if (!validTypes.includes(priceType)) {
    return this.pricing.salePrice;
  }
  return this.pricing[priceType] || this.pricing.salePrice;
};

// Static method to find low stock items
itemSchema.statics.findLowStockItems = function () {
  return this.find({
    $expr: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] },
    isActive: true,
  });
};

// Static method to find by category
itemSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true });
};

// Static method to find items in price range
itemSchema.statics.findByPriceRange = function (minPrice, maxPrice) {
  return this.find({
    'pricing.salePrice': { $gte: minPrice, $lte: maxPrice },
    isActive: true,
  });
};

// Static method to find items by company
itemSchema.statics.findByCompany = function (companyId) {
  return this.find({ companyId, isActive: true });
};

// Static method to find items by selling group
itemSchema.statics.findBySellingGroup = function (sellingGroup) {
  return this.find({ sellingGroup, isActive: true });
};

// Static method to find items by business type
itemSchema.statics.findByBusinessType = function (businessTypeId) {
  return this.find({ businessTypeId, isActive: true });
};

// Static method to find items needing reorder
itemSchema.statics.findNeedingReorder = function () {
  return this.find({
    $expr: { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] },
    isActive: true,
  });
};

// Static method to find expiring items
itemSchema.statics.findExpiringItems = function (daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    expiryTrackingEnabled: true,
    'inventory.batches': {
      $elemMatch: {
        expiryDate: { $lte: thresholdDate },
        stock: { $gt: 0 },
      },
    },
    isActive: true,
  });
};

// Static method to find items by supplier
itemSchema.statics.findBySupplier = function (supplierId) {
  return this.find({
    'supplier.primarySupplierId': supplierId,
    isActive: true,
  });
};

// Pre-save middleware to generate code if not provided
itemSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `ITEM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save validation for stock levels
itemSchema.pre('save', function (next) {
  // Validate stock levels
  if (this.inventory.minimumStock > this.inventory.maximumStock) {
    return next(new Error('Minimum stock cannot be greater than maximum stock'));
  }

  // Validate reorder point
  if (this.inventory.reorderPoint > this.inventory.maximumStock) {
    return next(new Error('Reorder point cannot be greater than maximum stock'));
  }

  // Warn if cost price is higher than sale price
  if (this.pricing.costPrice > this.pricing.salePrice) {
    console.warn(`Item ${this.code}: Cost price is higher than sale price`);
  }

  // Validate price hierarchy (optional warning)
  if (this.pricing.wholesalePrice > 0 && this.pricing.retailPrice > 0) {
    if (this.pricing.wholesalePrice > this.pricing.retailPrice) {
      console.warn(`Item ${this.code}: Wholesale price is higher than retail price`);
    }
  }

  next();
});

// Pre-save hook to track and warn about direct currentStock modifications
// Stock should be managed via Inventory collection, not directly on Item
itemSchema.pre('save', function (next) {
  // Check if currentStock was modified
  if (this.isModified('inventory.currentStock') && !this.isNew) {
    // Allow if this is a sync operation (flagged by _isInventorySync)
    if (!this._isInventorySync) {
      console.warn(
        `[STOCK WARNING] Item ${this.code}: inventory.currentStock was modified directly. ` +
        `Stock should be managed via Inventory collection for proper warehouse tracking. ` +
        `Use inventoryService.syncItemCurrentStock() for reconciliation.`
      );
    }
  }
  next();
});

// Static method to update currentStock from Inventory sync (safe method)
itemSchema.statics.syncCurrentStockFromInventory = async function (itemId, newStock) {
  const item = await this.findById(itemId);
  if (item) {
    item._isInventorySync = true; // Flag to suppress warning
    item.inventory.currentStock = Math.max(0, newStock);
    await item.save();
  }
};

module.exports = mongoose.model('Item', itemSchema);
