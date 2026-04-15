const mongoose = require('mongoose');

const formulaSizeSchema = new mongoose.Schema(
  {
    formulaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Formula',
      required: [true, 'Formula reference is required'],
    },
    size: {
      type: String,
      required: [true, 'Size/Strength is required'],
      trim: true,
      maxlength: [50, 'Size cannot exceed 50 characters'],
      description: 'e.g., 500mg, 10ml, 250mg/5ml',
    },
    strength: {
      type: String,
      trim: true,
      maxlength: [100, 'Strength cannot exceed 100 characters'],
      description: 'Additional strength information if needed',
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

// Compound index for unique size within a formula
formulaSizeSchema.index({ formulaId: 1, size: 1 }, { unique: true });
formulaSizeSchema.index({ formulaId: 1 });
formulaSizeSchema.index({ isActive: 1 });

// Pre-save middleware
formulaSizeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active formula sizes
formulaSizeSchema.statics.findActive = function () {
  return this.find({ isActive: true }).populate('formulaId').sort({ size: 1 });
};

// Static method to find sizes by formula
formulaSizeSchema.statics.findByFormula = function (formulaId) {
  return this.find({
    formulaId,
    isActive: true,
  }).sort({ size: 1 });
};

const FormulaSize = mongoose.models.FormulaSize || mongoose.model('FormulaSize', formulaSizeSchema);

module.exports = FormulaSize;
