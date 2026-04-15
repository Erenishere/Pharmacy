const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Letter date is required'],
    default: Date.now,
  },
  letterType: {
    type: String,
    required: [true, 'Letter type is required'],
    enum: {
      values: ['Employment', 'SupplierContract', 'CustomerAgreement', 'Other'],
      message: 'Letter type must be one of: Employment, SupplierContract, CustomerAgreement, Other',
    },
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  attachmentPath: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Final'],
    default: 'Draft',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

letterSchema.index({ date: -1 });
letterSchema.index({ letterType: 1 });
letterSchema.index({ status: 1 });
letterSchema.index({ accountId: 1 });

module.exports = mongoose.model('Letter', letterSchema);
