const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      maxlength: [100, 'Area name cannot exceed 100 characters'],
    },
    townId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Town',
      required: [true, 'Town reference is required'],
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

// Compound index for unique area name within a town
areaSchema.index({ name: 1, townId: 1 }, { unique: true });
areaSchema.index({ townId: 1 });
areaSchema.index({ isActive: 1 });

// Pre-save middleware
areaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active areas
areaSchema.statics.findActive = function () {
  return this.find({ isActive: true }).populate('townId').sort({ name: 1 });
};

// Static method to find areas by town
areaSchema.statics.findByTown = function (townId) {
  return this.find({
    townId,
    isActive: true,
  }).sort({ name: 1 });
};

const Area = mongoose.models.Area || mongoose.model('Area', areaSchema);

module.exports = Area;
