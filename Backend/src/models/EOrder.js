const mongoose = require('mongoose');

const eOrderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  itemName: {
    type: String,
    trim: true,
  },
  // Sales Management - Formula size for item selection (Requirement 3.4)
  formulaSize: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  boxPacking: {
    type: Number,
    default: 1,
    min: [1, 'Box packing must be at least 1'],
  },
  // Sales Management - Sale box quantity (Requirement 3.5)
  boxQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Box quantity cannot be negative'],
  },
  // Sales Management - Sale unit quantity (Requirement 3.5)
  unitQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Unit quantity cannot be negative'],
  },
  // Sales Management - Rate with GST (Requirement 3.7)
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  rateWithGST: {
    type: Number,
    default: 0,
    min: [0, 'Rate with GST cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  gstRate: {
    type: Number,
    enum: [0, 4, 18],
    default: 18,
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: [0, 'GST amount cannot be negative'],
  },
  // Sales Management - Scheme unit quantity (Requirement 3.6)
  scheme1Quantity: {
    type: Number,
    default: 0,
    min: [0, 'Scheme 1 quantity cannot be negative'],
  },
  scheme2Quantity: {
    type: Number,
    default: 0,
    min: [0, 'Scheme 2 quantity cannot be negative'],
  },
  schemeUnitQty: {
    type: Number,
    default: 0,
    min: [0, 'Scheme unit quantity cannot be negative'],
  },
  // Sales Management - Available quantity display (Requirement 3.4)
  availableQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Available quantity cannot be negative'],
  },
  lineTotal: {
    type: Number,
    default: 0,
    min: [0, 'Line total cannot be negative'],
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters'],
  },
  expiryDate: {
    type: Date,
  },
}, { _id: false });

const eOrderSchema = new mongoose.Schema(
  {
    // Sales Management - Auto-generated order number (Requirement 3.1)
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Order number cannot exceed 50 characters'],
    },
    // Sales Management - Order date (Requirement 3.3)
    orderDate: {
      type: Date,
      required: [true, 'Order date is required'],
      default: Date.now,
    },
    // Sales Management - Customer selection (Requirement 3.2)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerTown: {
      type: String,
      trim: true,
    },
    // Sales Management - Created by salesman (Requirement 3.12)
    salesmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman',
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    items: {
      type: [eOrderItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator(items) {
          return items && items.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },
    // Sales Management - Estimated order amount (Requirement 3.11)
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Total discount cannot be negative'],
    },
    totalGST: {
      type: Number,
      default: 0,
      min: [0, 'Total GST cannot be negative'],
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: [0, 'Grand total cannot be negative'],
    },
    estimatedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Estimated amount cannot be negative'],
    },
    // Sales Management - Status workflow (Requirement 3.13-3.18)
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'approved', 'converted', 'cancelled'],
        message: 'Status must be one of: pending, approved, converted, cancelled',
      },
      default: 'pending',
    },
    // Sales Management - Converted invoice reference (Requirement 3.17)
    convertedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    convertedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    // Sales Management - Mobile offline support (Requirement 3.20)
    mobileSync: {
      isSynced: {
        type: Boolean,
        default: false,
      },
      syncedAt: {
        type: Date,
      },
      deviceId: {
        type: String,
        trim: true,
      },
      offlineCreated: {
        type: Boolean,
        default: false,
      },
    },
    // Sales Management - Low stock warning (Requirement 3.14)
    lowStockWarning: {
      type: Boolean,
      default: false,
    },
    lowStockItems: [{
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
      itemName: String,
      requestedQty: Number,
      availableQty: Number,
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
  },
  {
    timestamps: true,
  },
);

eOrderSchema.index({ customerId: 1 });
eOrderSchema.index({ salesmanId: 1 });
eOrderSchema.index({ routeId: 1 });
eOrderSchema.index({ status: 1 });
eOrderSchema.index({ orderDate: -1 });
eOrderSchema.index({ isDeleted: 1 });
eOrderSchema.index({ convertedInvoiceId: 1 });
eOrderSchema.index({ 'mobileSync.deviceId': 1 });

eOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber && this.isNew) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }
  next();
});

eOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGST = 0;

    this.items.forEach((item) => {
      const boxTotal = (item.boxQuantity || 0) * (item.unitPrice || 0);
      const unitTotal = (item.unitQuantity || 0) * (item.unitPrice || 0);
      const itemSubtotal = boxTotal + unitTotal;
      const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
      const taxableAmount = itemSubtotal - discountAmount;
      const gstAmount = (taxableAmount * (item.gstRate || 0)) / 100;

      // Sales Management - Calculate rate with GST (Requirement 3.7)
      item.rateWithGST = item.unitPrice + (item.unitPrice * (item.gstRate || 0)) / 100;

      item.lineTotal = taxableAmount + gstAmount;
      item.gstAmount = gstAmount;

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalGST += gstAmount;
    });

    this.subtotal = subtotal;
    this.totalDiscount = totalDiscount;
    this.totalGST = totalGST;
    this.grandTotal = subtotal - totalDiscount + totalGST;
    this.estimatedAmount = this.grandTotal; // Sales Management - Estimated amount (Requirement 3.11)
  }
  next();
});

eOrderSchema.statics.generateOrderNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    orderNumber: new RegExp(`^EO${year}`),
  });
  return `EO${year}${String(count + 1).padStart(6, '0')}`;
};

eOrderSchema.set('toJSON', { virtuals: true });
eOrderSchema.set('toObject', { virtuals: true });

const EOrder = mongoose.models.EOrder || mongoose.model('EOrder', eOrderSchema);

module.exports = EOrder;
