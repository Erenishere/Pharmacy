const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business type name is required'],
      trim: true,
      maxlength: [100, 'Business type name cannot exceed 100 characters'],
      enum: [
        'Surgical',
        'Medicine',
        'Drip Infusion',
        'Consumer',
        'Diaper',
        'Electronics/Devices',
        'Medical Equipment',
        'Laboratory Supplies',
        'General Items',
      ],
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
businessSchema.index({ name: 1 }, { unique: true });
businessSchema.index({ isActive: 1 });

// Pre-save middleware
businessSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active business types
businessSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get predefined business types
businessSchema.statics.getPredefinedTypes = function () {
  return [
    'Surgical',
    'Medicine',
    'Drip Infusion',
    'Consumer',
    'Diaper',
    'Electronics/Devices',
    'Medical Equipment',
    'Laboratory Supplies',
    'General Items',
  ];
};

const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);

module.exports = Business;
