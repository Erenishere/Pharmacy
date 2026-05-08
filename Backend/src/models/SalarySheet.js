const mongoose = require('mongoose');

const salarySheetSchema = new mongoose.Schema({
  // Reference Number - Auto generated
  referenceNumber: {
    type: String,
  },

  // Dimension/Position
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DimensionBranch',
  },

  // Employee Information
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Employee is required'],
    index: true,
  },
  employeeName: {
    type: String,
    trim: true,
  },

  // Salary Period
  month: {
    type: Number, // 1-12
    required: [true, 'Month is required'],
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000,
    max: 2100,
  },
  monthYear: {
    type: String, // Format: "January 2026"
    trim: true,
  },

  // Basic Pay (auto from employee profile)
  basicPay: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Targets and Incentives
  targets: {
    // 4. Basic Sales Target
    basicSalesTarget: {
      amount: { type: Number, default: 0, min: 0 },
      incentivePercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    // 5. Cash Recovery Target
    cashRecoveryTarget: {
      amount: { type: Number, default: 0, min: 0 },
      incentivePercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    // 6. Zero Credit of Town - Take incentive on complete Town sale
    zeroCreditTownTarget: {
      amount: { type: Number, default: 0, min: 0 },
      incentivePercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    // 7. Basic Profit Achievement Target / Extra Earn Allowance
    profitAchievementTarget: {
      amount: { type: Number, default: 0, min: 0 },
      incentivePercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    // 8. Total Target Visit To Parties Order Invoices
    partyVisitTarget: {
      count: { type: Number, default: 0, min: 0 },
      incentivePercent: { type: Number, default: 0, min: 0, max: 100 },
    },
  },

  // Allowances and Benefits
  allowances: {
    // 10. Working Days
    workingDays: {
      type: Number,
      default: 26,
      min: 0,
      max: 31,
    },
    // 11. Daily Allowance D.A
    dailyAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 12. Petrol and Bike Maintenance
    petrolAndMaintenance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 13. Call Mobile & Internet Services Package
    mobileInternetPackage: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 14. Yearly Bonus On Good Performances (K)
    yearlyBonus: {
      amount: { type: Number, default: 0, min: 0 },
      percent: { type: Number, default: 0, min: 0, max: 100 },
    },
    // 15. Eid UI Fitr and Eid Al Adha Bonus
    eidBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
  },

  // Special Item Sales Incentive
  specialItemSales: {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
    },
    itemName: {
      type: String,
      trim: true,
    },
    incentivePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },

  // New Incentive (Optional)
  newIncentive: {
    detail: {
      type: String,
      trim: true,
      maxlength: [200, 'Detail cannot exceed 200 characters'],
    },
    percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },

  // Calculated Totals
  calculations: {
    totalTarget: { type: Number, default: 0, min: 0 },
    totalIncentive: { type: Number, default: 0, min: 0 },
    totalAllowances: { type: Number, default: 0, min: 0 },
    grossSalary: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0, min: 0 },
  },

  // Actual Performance (for tracking)
  actualPerformance: {
    salesAchieved: { type: Number, default: 0, min: 0 },
    cashRecoveryAchieved: { type: Number, default: 0, min: 0 },
    partiesVisited: { type: Number, default: 0, min: 0 },
    partiesOrdered: { type: Number, default: 0, min: 0 },
  },

  // Status
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'paid', 'cancelled'],
      message: 'Status must be one of: draft, active, paid, cancelled',
    },
    default: 'draft',
  },

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },

  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Timestamps
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
salarySheetSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salarySheetSchema.index({ referenceNumber: 1 }, { unique: true });
salarySheetSchema.index({ dimensionId: 1 });
salarySheetSchema.index({ month: 1, year: 1 });
salarySheetSchema.index({ status: 1 });
salarySheetSchema.index({ isActive: 1 });
salarySheetSchema.index({ employeeName: 'text', referenceNumber: 'text' });

// Pre-save middleware to generate reference number
salarySheetSchema.pre('save', async function (next) {
  if (this.isNew && !this.referenceNumber) {
    const count = await this.constructor.countDocuments();
    this.referenceNumber = `SAL${String(count + 1).padStart(6, '0')}`;
  }

  // Set monthYear string
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
  if (this.month && this.year) {
    this.monthYear = `${months[this.month - 1]} ${this.year}`;
  }

  // Calculate totals
  if (this.isModified('targets') || this.isModified('allowances') || this.isModified('basicPay')) {
    this.calculations = this.calculateTotals();
  }

  next();
});

// Instance method to calculate totals
salarySheetSchema.methods.calculateTotals = function () {
  const t = this.targets || {};
  const a = this.allowances || {};

  // Total allowances
  const totalAllowances =
    (a.dailyAllowance || 0) +
    (a.petrolAndMaintenance || 0) +
    (a.mobileInternetPackage || 0) +
    ((a.yearlyBonus && a.yearlyBonus.amount) || 0) +
    (a.eidBonus || 0);

  // Gross salary = basic + allowances
  const grossSalary = (this.basicPay || 0) + totalAllowances;

  return {
    totalTarget: 0, // Will be calculated based on actual targets
    totalIncentive: 0, // Will be calculated based on performance
    totalAllowances,
    grossSalary,
    deductions: 0,
    netSalary: grossSalary,
  };
};

// Static method to find by employee and period
salarySheetSchema.statics.findByEmployeeAndPeriod = function (employeeId, month, year) {
  return this.findOne({ employeeId, month, year, isActive: true });
};

// Static method to find by dimension
salarySheetSchema.statics.findByDimension = function (dimensionId) {
  return this.find({ dimensionId, isActive: true }).populate('employeeId', 'name code');
};

// Static method to find by period
salarySheetSchema.statics.findByPeriod = function (month, year) {
  return this.find({ month, year, isActive: true }).populate('employeeId', 'name code');
};

// Virtual for month name
salarySheetSchema.virtual('monthName').get(function () {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[(this.month || 1) - 1];
});

module.exports = mongoose.model('SalarySheet', salarySheetSchema);
