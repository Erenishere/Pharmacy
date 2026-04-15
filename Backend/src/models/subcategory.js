const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sub-category name is required'],
      trim: true,
      maxlength: [100, 'Sub-category name cannot exceed 100 characters'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
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

// Compound index for unique subcategory name within a category
subCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });
subCategorySchema.index({ categoryId: 1 });
subCategorySchema.index({ isActive: 1 });

// Pre-save middleware
subCategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active subcategories
subCategorySchema.statics.findActive = function () {
  return this.find({ isActive: true }).populate('categoryId').sort({ name: 1 });
};

// Static method to find subcategories by category
subCategorySchema.statics.findByCategory = function (categoryId) {
  return this.find({
    categoryId,
    isActive: true,
  }).sort({ name: 1 });
};

const SubCategory = mongoose.models.SubCategory || mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;
