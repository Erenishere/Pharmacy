const mongoose = require('mongoose');

const nugDetailSchema = new mongoose.Schema({
  nugType: {
    type: String,
    enum: ['Single', 'Double', 'Triple', 'Bundle of 4', 'Single Kata', 'Double Kata'],
    required: true,
  },
  qtyNug: { type: Number, default: 0, min: 0 },
  totalLooseNug: { type: Number, default: 0 },
}, { _id: false });

const biltyReceiptSchema = new mongoose.Schema({
  biltyType: {
    type: String,
    enum: ['receive', 'send'],
    required: [true, 'Bilty type is required'],
    default: 'receive',
  },
  biltyDate: {
    type: Date,
    required: [true, 'Bilty date is required'],
    default: Date.now,
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  partyName: { type: String, trim: true },
  partyTown: { type: String, trim: true },
  claimAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClaimAccount',
  },
  claimAccountName: { type: String, trim: true },
  transporterName: { type: String, trim: true },
  agentName: { type: String, trim: true },
  agentAmount: { type: Number, default: 0, min: 0 },
  biltyNo: { type: String, trim: true },
  totalNug: { type: Number, default: 0, min: 0 },
  nugDetail: [nugDetailSchema],
  biltyAmount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'received', 'sent'],
    default: 'pending',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

biltyReceiptSchema.index({ biltyDate: -1 });
biltyReceiptSchema.index({ partyId: 1 });
biltyReceiptSchema.index({ biltyType: 1 });
biltyReceiptSchema.index({ status: 1 });

module.exports = mongoose.model('BiltyReceipt', biltyReceiptSchema);
