const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  // Sales Management - Item details (Requirement 4.5)
  itemName: {
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
  // Sales Management - Unit retail price (Requirement 4.5)
  unitRetail: {
    type: Number,
    default: 0,
    min: [0, 'Unit retail cannot be negative'],
  },
  // Sales Management - Unit TP (Requirement 4.5)
  unitTP: {
    type: Number,
    default: 0,
    min: [0, 'Unit TP cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  // Sales Management - Unit rate offered (Requirement 4.6)
  unitRateOffered: {
    type: Number,
    default: 0,
    min: [0, 'Unit rate offered cannot be negative'],
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
  lineTotal: {
    type: Number,
    default: 0,
    min: [0, 'Line total cannot be negative'],
  },
}, { _id: false });

const quotationSchema = new mongoose.Schema(
  {
    // Sales Management - Auto-generated quotation number (Requirement 4.1)
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Quotation number cannot exceed 50 characters'],
    },
    // Sales Management - Quotation date (Requirement 4.1)
    quotationDate: {
      type: Date,
      required: [true, 'Quotation date is required'],
      default: Date.now,
    },
    // Sales Management - Validity period (Requirement 4.8)
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
    },
    validityPeriod: {
      type: String,
      default: 'One Month',
      trim: true,
    },
    // Sales Management - Customer selection (Requirement 4.2)
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
    // Sales Management - Reference number (Requirement 4.3)
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
    },
    tenderNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Tender number cannot exceed 100 characters'],
    },
    customerReference: {
      type: String,
      trim: true,
      maxlength: [100, 'Customer reference cannot exceed 100 characters'],
    },
    salesmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman',
    },
    items: {
      type: [quotationItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator(items) {
          return items && items.length > 0;
        },
        message: 'Quotation must have at least one item',
      },
    },
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
    // Sales Management - Terms and conditions (Requirement 4.9)
    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: [2000, 'Terms and conditions cannot exceed 2000 characters'],
    },
    // Sales Management - Column visibility settings (Requirement 4.4, 4.7)
    columnVisibility: {
      company: { type: Boolean, default: true },
      boxPacking: { type: Boolean, default: true },
      unitRetail: { type: Boolean, default: true },
      unitTP: { type: Boolean, default: true },
      discount: { type: Boolean, default: true },
      unitRateOffered: { type: Boolean, default: true },
      boxQuantity: { type: Boolean, default: true },
      unitQuantity: { type: Boolean, default: true },
      unitPrice: { type: Boolean, default: true },
      gstRate: { type: Boolean, default: true },
      gstAmount: { type: Boolean, default: true },
      lineTotal: { type: Boolean, default: true },
    },
    // Sales Management - Status workflow (Requirement 4.14, 4.15)
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['draft', 'sent', 'approved', 'converted', 'expired', 'cancelled'],
        message: 'Status must be one of: draft, sent, approved, converted, expired, cancelled',
      },
      default: 'draft',
    },
    // Sales Management - Conversion tracking (Requirement 4.14, 4.15)
    convertedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    convertedAt: {
      type: Date,
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EOrder',
    },
    convertedOrderAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Sales Management - Created by user (Requirement 4.10)
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

quotationSchema.index({ customerId: 1 });
quotationSchema.index({ salesmanId: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ quotationDate: -1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ isDeleted: 1 });
quotationSchema.index({ convertedInvoiceId: 1 });
quotationSchema.index({ convertedOrderId: 1 });

quotationSchema.pre('save', async function (next) {
  if (!this.quotationNumber && this.isNew) {
    this.quotationNumber = await this.constructor.generateQuotationNumber();
  }
  next();
});

quotationSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGST = 0;

    this.items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
      const taxableAmount = itemSubtotal - discountAmount;
      const gstAmount = (taxableAmount * (item.gstRate || 0)) / 100;

      // Sales Management - Calculate unit rate offered (Requirement 4.6)
      if (!item.unitRateOffered || item.unitRateOffered === 0) {
        item.unitRateOffered = item.unitTP - (item.unitTP * (item.discount || 0)) / 100;
      }

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
  }
  next();
});

quotationSchema.statics.generateQuotationNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    quotationNumber: new RegExp(`^QT${year}`),
  });
  return `QT${year}${String(count + 1).padStart(6, '0')}`;
};

quotationSchema.set('toJSON', { virtuals: true });
quotationSchema.set('toObject', { virtuals: true });

const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);

module.exports = Quotation;
