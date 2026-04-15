const mongoose = require('mongoose');

const formulaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Formula/Generic name is required'],
      trim: true,
      maxlength: [200, 'Formula name cannot exceed 200 characters'],
    },
    composition: {
      type: String,
      trim: true,
      maxlength: [500, 'Composition cannot exceed 500 characters'],
      description: 'Salt composition or active ingredients',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
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
formulaSchema.index({ name: 1 }, { unique: true });
formulaSchema.index({ isActive: 1 });

// Virtual for formula sizes
formulaSchema.virtual('sizes', {
  ref: 'FormulaSize',
  localField: '_id',
  foreignField: 'formulaId',
  justOne: false,
});

// Pre-save middleware
formulaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find active formulas
formulaSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to search formulas by name or composition
formulaSchema.statics.search = function (searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { composition: new RegExp(searchTerm, 'i') },
    ],
    isActive: true,
  }).sort({ name: 1 });
};

const Formula = mongoose.models.Formula || mongoose.model('Formula', formulaSchema);

module.exports = Formula;
