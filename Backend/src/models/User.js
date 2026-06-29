const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    // Master Data Management - Requirement 10.1: Link to employee account
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    // Master Data Management - Requirement 10.2: Dimension for territory-based access
    dimensionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DimensionBranch',
      default: null,
    },
    // Master Data Management - Requirement 10.6: Role assignment
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['admin', 'manager', 'hr', 'salesman', 'accountant', 'store_keeper', 'store_incharge', 'deliveryman', 'driver', 'it_support', 'data_entry', 'custom', 'sales', 'inventory', 'purchase'],
        message: 'Role must be one of: admin, manager, hr, salesman, accountant, store_keeper, store_incharge, deliveryman, driver, it_support, data_entry, custom, sales, inventory, purchase',
      },
    },
    // Master Data Management - Requirement 10.7: Access control settings
    permissions: {
      modules: {
        type: [String],
        default: [],
      },
      features: {
        type: [String],
        default: [],
      },
      dataAccess: {
        dimensionBased: {
          type: Boolean,
          default: false,
        },
        allowedDimensions: {
          type: [mongoose.Schema.Types.ObjectId],
          ref: 'DimensionBranch',
          default: [],
        },
      },
    },
    // Master Data Management - Requirement 10.14: Active status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Master Data Management - Requirement 10.10: Last login tracking
    lastLogin: {
      type: Date,
      default: null,
    },
    // Master Data Management - Requirement 10.12: Password reset fields
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    // New OTP fields for password reset
    passwordResetOTP: {
      type: String,
      default: null,
    },
    passwordResetOTPExpires: {
      type: Date,
      default: null,
    },
    isOTPVerified: {
      type: Boolean,
      default: false,
    },
    // Master Data Management - Requirement 10.1: Created by tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // SMS OTP Code Sending Number
    smsOtpNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'SMS OTP number cannot exceed 20 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Indexes (unique indexes already created by schema 'unique: true')
// Master Data Management - Requirement 10.3, 10.5: Username and email indexes (unique via schema)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
// Master Data Management - Additional indexes for performance
userSchema.index({ accountId: 1 });
userSchema.index({ dimensionId: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'permissions.dataAccess.dimensionBased': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Master Data Management - Requirement 10.7: Check if user has module access
userSchema.methods.hasModuleAccess = function (moduleName) {
  if (this.role === 'admin') return true;
  return this.permissions.modules.includes(moduleName);
};

// Master Data Management - Requirement 10.7: Check if user has feature access
userSchema.methods.hasFeatureAccess = function (featureName) {
  if (this.role === 'admin') return true;
  return this.permissions.features.includes(featureName);
};

// Master Data Management - Requirement 10.8: Check if user has dimension-based access
userSchema.methods.hasDimensionAccess = function (dimensionId) {
  if (this.role === 'admin') return true;
  if (!this.permissions.dataAccess.dimensionBased) return true;

  // Convert dimensionId to string for comparison
  const dimIdStr = dimensionId ? dimensionId.toString() : null;
  return this.permissions.dataAccess.allowedDimensions.some(
    (allowedDim) => allowedDim.toString() === dimIdStr,
  );
};

// Master Data Management - Requirement 10.8: Get dimension filter for queries
userSchema.methods.getDimensionFilter = function () {
  if (this.role === 'admin') return {};
  if (!this.permissions.dataAccess.dimensionBased) return {};

  return {
    dimensionId: { $in: this.permissions.dataAccess.allowedDimensions },
  };
};

// Master Data Management - Requirement 10.12: Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token before storing
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiry to 1 hour from now
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;

  return resetToken; // Return unhashed token to send via email
};

// Generate 6-digit OTP for password reset
userSchema.methods.generatePasswordResetOTP = function () {
  const crypto = require('crypto');
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Hash OTP before storing
  this.passwordResetOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expiry to 10 minutes from now
  this.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000;
  this.isOTPVerified = false;

  return otp; // Return unhashed OTP to send via email
};

// Master Data Management - Requirement 10.12: Clear password reset fields
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = null;
  this.passwordResetExpires = null;
  this.isOTPVerified = false;
};

// Clear OTP fields
userSchema.methods.clearPasswordResetOTP = function () {
  this.passwordResetOTP = null;
  this.passwordResetOTPExpires = null;
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function (role) {
  return this.find({ role, isActive: true });
};

// Master Data Management - Static method to find by account
userSchema.statics.findByAccount = function (accountId) {
  return this.findOne({ accountId, isActive: true });
};

// Master Data Management - Static method to find by dimension
userSchema.statics.findByDimension = function (dimensionId) {
  return this.find({ dimensionId, isActive: true });
};

// Master Data Management - Requirement 10.12: Find user by password reset token
userSchema.statics.findByPasswordResetToken = function (token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    isOTPVerified: true, // MUST be verified via OTP first
    isActive: true,
  });
};

// Find user by OTP
userSchema.statics.findByPasswordResetOTP = function (email, otp) {
  const crypto = require('crypto');
  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  return this.findOne({
    email: email.toLowerCase().trim(),
    passwordResetOTP: hashedOTP,
    passwordResetOTPExpires: { $gt: Date.now() },
    isActive: true,
  });
};

module.exports = mongoose.model('User', userSchema);
