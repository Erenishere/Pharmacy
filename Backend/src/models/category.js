const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
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

// Indexes
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ parentCategoryId: 1 });
categorySchema.index({ isActive: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'SubCategory',
  localField: '_id',
  foreignField: 'categoryId',
  justOne: false,
});

// Virtual for child categories (hierarchical)
categorySchema.virtual('childCategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategoryId',
  justOne: false,
});

// Pre-save middleware
categorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find root categories (no parent)
categorySchema.statics.findRootCategories = function () {
  return this.find({
    parentCategoryId: null,
    isActive: true,
  }).sort({ name: 1 });
};

// Static method to get category hierarchy
categorySchema.statics.getHierarchy = async function () {
  const categories = await this.find({ isActive: true })
    .populate('parentCategoryId')
    .sort({ name: 1 });

  // Build tree structure
  const categoryMap = {};
  const rootCategories = [];

  categories.forEach((cat) => {
    categoryMap[cat._id] = { ...cat.toObject(), children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parentCategoryId) {
      const parent = categoryMap[cat.parentCategoryId._id];
      if (parent) {
        parent.children.push(categoryMap[cat._id]);
      }
    } else {
      rootCategories.push(categoryMap[cat._id]);
    }
  });

  return rootCategories;
};

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

module.exports = Category;
