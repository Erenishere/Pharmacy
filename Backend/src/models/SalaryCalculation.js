const mongoose = require('mongoose');

const salaryCalculationSchema = new mongoose.Schema(
  {
    calculationId: {
      type: String,
      required: true,
    },

    // Package Reference
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryPackage',
      required: true,
    },

    // Employee Information
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },

    // Period
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },

    // Fixed Components
    basicPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    petrolAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    mobilePackage: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Target-Based Incentives
    salesIncentive: {
      target: {
        type: Number,
        default: 0,
      },
      achieved: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },

    recoveryIncentive: {
      target: {
        type: Number,
        default: 0,
      },
      achieved: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },

    partyVisitIncentive: {
      target: {
        type: Number,
        default: 0,
      },
      achieved: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },

    // Mobile Incentives
    mobileOrderIncentive: {
      ordersCreated: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },

    mobileCashRecoveryIncentive: {
      amountRecovered: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },

    // Brand Incentives
    brandIncentives: [
      {
        itemName: {
          type: String,
          required: true,
        },
        target: {
          type: Number,
          required: true,
        },
        achieved: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],

    // Bonuses
    bonuses: [
      {
        type: {
          type: String,
          enum: ['Eid Fitr', 'Eid Adha', 'Other'],
          required: true,
        },
        detail: {
          type: String,
          default: '',
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Totals
    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Deductions
    deductions: {
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      advance: {
        type: Number,
        default: 0,
        min: 0,
      },
      loan: {
        type: Number,
        default: 0,
        min: 0,
      },
      other: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    netSalary: {
      type: Number,
      default: 0,
    },

    // Audit Trail
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-validate hook: Generate calculationId before required validation runs.
salaryCalculationSchema.pre('validate', async function (next) {
  if (!this.calculationId) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.calculationId = `SC${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
salaryCalculationSchema.index({ calculationId: 1 }, { unique: true });
salaryCalculationSchema.index({ packageId: 1 });
salaryCalculationSchema.index({ employeeId: 1, month: 1, year: 1 });
salaryCalculationSchema.index({ month: 1, year: 1 });

// Virtual: Total Deductions
salaryCalculationSchema.virtual('totalDeductions').get(function () {
  return (
    this.deductions.tax
    + this.deductions.advance
    + this.deductions.loan
    + this.deductions.other
  );
});

// Virtual: Calculated Net Salary (for verification)
salaryCalculationSchema.virtual('calculatedNetSalary').get(function () {
  return this.grossSalary - this.totalDeductions;
});

// Ensure virtuals are included in JSON
salaryCalculationSchema.set('toJSON', { virtuals: true });
salaryCalculationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SalaryCalculation', salaryCalculationSchema);
