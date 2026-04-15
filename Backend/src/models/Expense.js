const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: [true, 'Expense category is required'],
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Expense account is required'],
  },
  cashAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Cash account is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than zero'],
  },
  detail: {
    type: String,
    trim: true,
    maxlength: [500, 'Detail cannot exceed 500 characters'],
  },
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dimension',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

expenseSchema.index({ date: -1 });
expenseSchema.index({ categoryId: 1 });
expenseSchema.index({ dimensionId: 1 });
expenseSchema.index({ accountId: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
