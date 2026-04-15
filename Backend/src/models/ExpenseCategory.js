const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, {
  timestamps: true,
});

expenseCategorySchema.index({ categoryName: 1 });
expenseCategorySchema.index({ status: 1 });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
