const mongoose = require('mongoose');

/**
 * Purchase Order Item Schema
 * Represents individual items in a purchase order
 * Requirements 4.5: Capture Item Name, Box Packing, Box Qty, Unit Qty, Box TP, Unit TP, Discount, Net Amount
 */
const purchaseOrderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  itemName: {
    type: String,
    trim: true,
    required: [true, 'Item name is required'],
  },
  boxPacking: {
    type: Number,
    default: 1,
    min: [1, 'Box packing must be at least 1'],
  },
  boxQty: {
    type: Number,
    default: 0,
    min: [0, 'Box quantity cannot be negative'],
  },
  unitQty: {
    type: Number,
    default: 0,
    min: [0, 'Unit quantity cannot be negative'],
  },
  boxTP: {
    type: Number,
    default: 0,
    min: [0, 'Box TP cannot be negative'],
  },
  unitTP: {
    type: Number,
    default: 0,
    min: [0, 'Unit TP cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  netAmount: {
    type: Number,
    default: 0,
    min: [0, 'Net amount cannot be negative'],
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative'],
  },
  pendingQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Pending quantity cannot be negative'],
  },
}, { _id: false });

/**
 * Purchase Order Schema
 * Requirement 4: Purchase Order Management
 * Requirements 4.1-4.18: Complete PO lifecycle management
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      trim: true,
      maxlength: [50, 'PO number cannot exceed 50 characters'],
    },
    poDate: {
      type: Date,
      required: [true, 'PO date is required'],
      default: Date.now,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
    },
    supplierName: {
      type: String,
      trim: true,
    },
    supplierTown: {
      type: String,
      trim: true,
    },
    billNo: {
      type: String,
      trim: true,
      maxlength: [100, 'Bill number cannot exceed 100 characters'],
    },
    items: {
      type: [purchaseOrderItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator(items) {
          return items && items.length > 0;
        },
        message: 'Purchase order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
        message: 'Status must be one of: draft, sent, confirmed, received, cancelled',
      },
      default: 'draft',
    },
    fulfillmentStatus: {
      type: String,
      enum: {
        values: ['pending', 'partial', 'fulfilled'],
        message: 'Fulfillment status must be one of: pending, partial, fulfilled',
      },
      default: 'pending',
    },
    convertedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    convertedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance (Requirements 4.16: Search and filter support)
purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ fulfillmentStatus: 1 });
purchaseOrderSchema.index({ poDate: 1 });
purchaseOrderSchema.index({ isDeleted: 1 });
purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ convertedInvoiceId: 1 });
purchaseOrderSchema.index({ supplierId: 1, status: 1 }); // Compound index for supplier + status queries
purchaseOrderSchema.index({ poDate: -1, status: 1 }); // Compound index for date range + status queries
purchaseOrderSchema.index({ status: 1, fulfillmentStatus: 1 }); // Compound index for status + fulfillment queries

// Pre-save middleware to calculate totals and pending quantities
// Requirement 4.6: Calculate line totals
// Requirement 4.7: Calculate total amount
purchaseOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    let totalAmount = 0;
    let allFulfilled = true;
    let anyReceived = false;

    this.items.forEach((item) => {
      // Calculate amounts: boxAmount + unitAmount
      const boxAmount = (item.boxQty || 0) * (item.boxTP || 0);
      const unitAmount = (item.unitQty || 0) * (item.unitTP || 0);
      const grossAmount = boxAmount + unitAmount;

      // Apply discount
      const discountAmount = (grossAmount * (item.discount || 0)) / 100;
      item.netAmount = grossAmount - discountAmount;

      // Calculate pending quantity (total ordered - received)
      const totalOrdered = (item.boxQty || 0) * (item.boxPacking || 1) + (item.unitQty || 0);
      item.pendingQuantity = totalOrdered - (item.receivedQuantity || 0);

      // Track fulfillment status
      if (item.receivedQuantity > 0) {
        anyReceived = true;
      }
      if (item.pendingQuantity > 0) {
        allFulfilled = false;
      }

      totalAmount += item.netAmount;
    });

    this.totalAmount = totalAmount;

    // Auto-calculate fulfillment status
    if (allFulfilled && anyReceived) {
      this.fulfillmentStatus = 'fulfilled';
    } else if (anyReceived) {
      this.fulfillmentStatus = 'partial';
    } else {
      this.fulfillmentStatus = 'pending';
    }
  }
  next();
});

// Virtual for checking if PO is fully received
// Requirement 4.17: Track outstanding quantity
purchaseOrderSchema.virtual('isFullyReceived').get(function () {
  if (!this.items || this.items.length === 0) return false;
  return this.items.every((item) => {
    const totalOrdered = (item.boxQty || 0) * (item.boxPacking || 1) + (item.unitQty || 0);
    return (item.receivedQuantity || 0) >= totalOrdered;
  });
});

// Virtual for checking if PO is partially received
// Requirement 4.17: Track outstanding quantity
purchaseOrderSchema.virtual('isPartiallyReceived').get(function () {
  if (!this.items || this.items.length === 0) return false;
  const hasReceived = this.items.some((item) => (item.receivedQuantity || 0) > 0);
  const notFullyReceived = this.items.some((item) => {
    const totalOrdered = (item.boxQty || 0) * (item.boxPacking || 1) + (item.unitQty || 0);
    return (item.receivedQuantity || 0) < totalOrdered;
  });
  return hasReceived && notFullyReceived;
});

// Static method to generate next PO number
// Requirement 4.1: Auto-generate unique PO number
purchaseOrderSchema.statics.generatePONumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    poNumber: new RegExp(`^PO${year}`),
  });
  return `PO${year}${String(count + 1).padStart(6, '0')}`;
};

// Ensure virtuals are included in JSON output
purchaseOrderSchema.set('toJSON', { virtuals: true });
purchaseOrderSchema.set('toObject', { virtuals: true });

const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
