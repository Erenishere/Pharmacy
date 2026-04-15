const mongoose = require('mongoose');

/**
 * DimensionBranch Schema
 * Represents organizational dimensions/branches for territory-based access control
 * Used for segmenting data access by region, branch, or cost center
 */
const dimensionBranchSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Dimension code is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Dimension code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Dimension name is required'],
      trim: true,
      maxlength: [100, 'Dimension name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['BRANCH', 'REGION', 'TERRITORY', 'COST_CENTER', 'DEPARTMENT'],
      default: 'BRANCH',
    },
    parentDimensionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DimensionBranch',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
dimensionBranchSchema.index({ code: 1 }, { unique: true });
dimensionBranchSchema.index({ name: 1 });
dimensionBranchSchema.index({ type: 1 });
dimensionBranchSchema.index({ parentDimensionId: 1 });
dimensionBranchSchema.index({ isActive: 1 });
dimensionBranchSchema.index({ type: 1, isActive: 1 });

// Virtual for child dimensions
dimensionBranchSchema.virtual('children', {
  ref: 'DimensionBranch',
  localField: '_id',
  foreignField: 'parentDimensionId',
  justOne: false,
});

// Pre-save middleware to generate code if not provided
dimensionBranchSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `DIM${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Static method to find active dimensions
dimensionBranchSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find dimensions by type
dimensionBranchSchema.statics.findByType = function (type) {
  return this.find({
    type,
    isActive: true,
  }).sort({ name: 1 });
};

// Static method to find root dimensions (no parent)
dimensionBranchSchema.statics.findRoots = function () {
  return this.find({
    parentDimensionId: null,
    isActive: true,
  }).sort({ name: 1 });
};

const DimensionBranch = mongoose.models.DimensionBranch || mongoose.model('DimensionBranch', dimensionBranchSchema);

module.exports = DimensionBranch;
