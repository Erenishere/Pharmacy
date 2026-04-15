const mongoose = require('mongoose');

const claimAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Claim account name is required'],
      trim: true,
      maxlength: [200, 'Claim account name cannot exceed 200 characters'],
      description: 'e.g., "GSK Scheme Account", "Discount Claims"',
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
claimAccountSchema.index({ name: 1 });
claimAccountSchema.index({ isActive: 1 });
claimAccountSchema.index({ accountNumber: 1 });

// Pre-save middleware
claimAccountSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active claim accounts
claimAccountSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to check if claim account has transactions
claimAccountSchema.statics.hasTransactions = async function (claimAccountId) {
  const Scheme = mongoose.model('Scheme');
  const Invoice = mongoose.model('Invoice');

  // Check if any schemes reference this claim account
  const schemeCount = await Scheme.countDocuments({ claimAccountId });

  // Check if any invoices reference this claim account
  const invoiceCount = await Invoice.countDocuments({ claimAccountId });

  return schemeCount > 0 || invoiceCount > 0;
};

const ClaimAccount = mongoose.models.ClaimAccount || mongoose.model('ClaimAccount', claimAccountSchema);

module.exports = ClaimAccount;
