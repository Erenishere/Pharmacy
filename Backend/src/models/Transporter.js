const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Transporter code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Transporter name is required'],
      trim: true,
      maxlength: [200, 'Transporter name cannot exceed 200 characters'],
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    vehicleDetails: {
      type: String,
      trim: true,
      maxlength: [500, 'Vehicle details cannot exceed 500 characters'],
      description: 'Information about vehicles owned/operated',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
transporterSchema.index({ code: 1 }, { unique: true });
transporterSchema.index({ name: 1 });
transporterSchema.index({ isActive: 1 });

// Pre-save middleware to generate code if not provided
transporterSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `TR${String(count + 1).padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Static method to find active transporters
transporterSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to generate transporter code
transporterSchema.statics.generateTransporterCode = async function () {
  const count = await this.countDocuments();
  return `TR${String(count + 1).padStart(4, '0')}`;
};

const Transporter = mongoose.models.Transporter || mongoose.model('Transporter', transporterSchema);

module.exports = Transporter;
