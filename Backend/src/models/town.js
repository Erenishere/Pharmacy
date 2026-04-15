const mongoose = require('mongoose');

const townSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Town name is required'],
      trim: true,
      maxlength: [100, 'Town name cannot exceed 100 characters'],
    },
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region cannot exceed 100 characters'],
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
townSchema.index({ name: 1 }, { unique: true });
townSchema.index({ isActive: 1 });
townSchema.index({ region: 1 });

// Virtual for areas in this town
townSchema.virtual('areas', {
  ref: 'Area',
  localField: '_id',
  foreignField: 'townId',
  justOne: false,
});

// Pre-save middleware
townSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active towns
townSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find towns by region
townSchema.statics.findByRegion = function (region) {
  return this.find({
    region: new RegExp(region, 'i'),
    isActive: true,
  }).sort({ name: 1 });
};

const Town = mongoose.models.Town || mongoose.model('Town', townSchema);

module.exports = Town;
