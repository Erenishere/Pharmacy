const mongoose = require('mongoose');

const cashAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: [true, 'Adjustment number is required'],
      trim: true,
      maxlength: [50, 'Adjustment number cannot exceed 50 characters'],
    },
    adjustmentDate: {
      type: Date,
      required: [true, 'Adjustment date is required'],
      default: Date.now,
    },
    adjustmentType: {
      type: String,
      required: [true, 'Adjustment type is required'],
      enum: {
        values: ['account_to_account', 'user_to_user', 'employee_adjustment'],
        message: 'Adjustment type must be one of: account_to_account, user_to_user, employee_adjustment',
      },
    },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'From account/user ID is required'],
      refPath: 'fromAccountType',
    },
    fromAccountType: {
      type: String,
      required: true,
      enum: ['Account', 'User'],
      default: 'Account',
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'To account/user ID is required'],
      refPath: 'toAccountType',
    },
    toAccountType: {
      type: String,
      required: true,
      enum: ['Account', 'User'],
      default: 'Account',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    detailReference: {
      type: String,
      trim: true,
      maxlength: [200, 'Detail reference cannot exceed 200 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'completed', 'cancelled'],
        message: 'Status must be one of: pending, completed, cancelled',
      },
      default: 'completed',
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

// Indexes
cashAdjustmentSchema.index({ adjustmentDate: -1 });
cashAdjustmentSchema.index({ adjustmentType: 1 });
cashAdjustmentSchema.index({ status: 1 });
cashAdjustmentSchema.index({ fromAccountId: 1 });
cashAdjustmentSchema.index({ toAccountId: 1 });
cashAdjustmentSchema.index({ createdBy: 1 });
cashAdjustmentSchema.index({ adjustmentNumber: 1 }, { unique: true });

// Virtual for days since adjustment
cashAdjustmentSchema.virtual('daysSinceAdjustment').get(function () {
  const today = new Date();
  const diffTime = today - this.adjustmentDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to complete adjustment
cashAdjustmentSchema.methods.completeAdjustment = function () {
  if (this.status === 'pending') {
    this.status = 'completed';
    return this.save();
  }
  throw new Error('Only pending adjustments can be completed');
};

// Instance method to cancel adjustment
cashAdjustmentSchema.methods.cancelAdjustment = function () {
  if (this.status === 'pending') {
    this.status = 'cancelled';
    return this.save();
  }
  throw new Error('Only pending adjustments can be cancelled');
};

// Static method to generate adjustment number
cashAdjustmentSchema.statics.generateAdjustmentNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    adjustmentNumber: new RegExp(`^CA${year}`),
  });
  return `CA${year}${String(count + 1).padStart(6, '0')}`;
};

// Static method to find adjustments by date range
cashAdjustmentSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    adjustmentDate: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate('fromAccountId')
    .populate('toAccountId')
    .populate('createdBy', 'username');
};

// Static method to find adjustments by type
cashAdjustmentSchema.statics.findByType = function (adjustmentType) {
  return this.find({ adjustmentType })
    .populate('fromAccountId')
    .populate('toAccountId')
    .sort({ adjustmentDate: -1 });
};

// Pre-save middleware to set account types based on adjustment type
cashAdjustmentSchema.pre('save', function (next) {
  if (this.isNew) {
    if (this.adjustmentType === 'user_to_user') {
      this.fromAccountType = 'User';
      this.toAccountType = 'User';
    } else if (this.adjustmentType === 'employee_adjustment') {
      this.fromAccountType = 'Account'; // money from company account
      this.toAccountType = 'User';      // to employee
    } else {
      this.fromAccountType = 'Account';
      this.toAccountType = 'Account';
    }
  }
  next();
});

// Pre-save validation
cashAdjustmentSchema.pre('save', function (next) {
  // Validate that from and to accounts are different
  if (this.fromAccountId.toString() === this.toAccountId.toString()) {
    return next(new Error('From and To accounts must be different'));
  }
  next();
});

module.exports = mongoose.model('CashAdjustment', cashAdjustmentSchema);
