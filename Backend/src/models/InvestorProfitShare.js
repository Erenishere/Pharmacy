const mongoose = require('mongoose');

const profitShareDetailSchema = new mongoose.Schema({
  investorAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  capitalContribution: {
    type: Number,
    required: true,
    min: 0,
  },
  sharePercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  profitAmount: {
    type: Number,
    required: true,
  },
}, { _id: true });

const investorProfitShareSchema = new mongoose.Schema({
  periodFrom: {
    type: Date,
    required: [true, 'Period from date is required'],
  },
  periodTo: {
    type: Date,
    required: [true, 'Period to date is required'],
  },
  totalProfit: {
    type: Number,
    required: [true, 'Total profit is required'],
  },
  distributionDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Draft', 'Distributed'],
    default: 'Draft',
  },
  details: [profitShareDetailSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

investorProfitShareSchema.index({ periodFrom: 1, periodTo: 1 });
investorProfitShareSchema.index({ status: 1 });
investorProfitShareSchema.index({ distributionDate: -1 });

module.exports = mongoose.model('InvestorProfitShare', investorProfitShareSchema);
