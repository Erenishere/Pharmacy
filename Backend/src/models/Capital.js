const mongoose = require('mongoose');

const capitalSchema = new mongoose.Schema({
  capitalDate: {
    type: Date,
    required: [true, 'Capital date is required'],
    default: Date.now,
  },
  capitalAssetName: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    maxlength: [200, 'Asset name cannot exceed 200 characters'],
  },
  cashAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Cash account is required'],
  },
  cashAccountName: {
    type: String,
    trim: true,
  },
  cashAccountBalance: {
    type: Number,
    default: 0,
  },
  investorAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Investor account is required'],
  },
  investorAccountName: {
    type: String,
    trim: true,
  },
  investorAccountBalance: {
    type: Number,
    default: 0,
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['in', 'out'],
      message: 'Transaction type must be "in" or "out"',
    },
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  effectiveAmount: {
    type: Number,
    default: 0,
  },
  detailReference: {
    type: String,
    trim: true,
    maxlength: [500, 'Detail/Reference cannot exceed 500 characters'],
  },
  status: {
    type: String,
    enum: {
      values: ['Proprietor', 'Investor'],
      message: 'Status must be "Proprietor" or "Investor"',
    },
    default: 'Investor',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

// Indexes
capitalSchema.index({ investorAccountId: 1, capitalDate: -1 });
capitalSchema.index({ transactionType: 1 });
capitalSchema.index({ status: 1 });
capitalSchema.index({ capitalDate: -1 });

module.exports = mongoose.model('Capital', capitalSchema);
