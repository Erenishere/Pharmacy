const mongoose = require('mongoose');

const salaryPackageSchema = new mongoose.Schema(
  {
    packageId: {
      type: String,
      required: true,
    },

    // Employee Information
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },

    // Package Duration
    duration: {
      fromDate: {
        type: Date,
        required: true,
      },
      toDate: {
        type: Date,
        required: true,
      },
    },

    // Component 3: Basic Pay (auto from biodata)
    basicPay: {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      source: {
        type: String,
        default: 'biodata',
        enum: ['biodata'],
      },
    },

    // Component 4: Sales Target
    salesTarget: {
      targetAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      incentiveType: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      incentiveValue: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 5: Cash Recovery Target
    recoveryTarget: {
      targetAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      incentiveType: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      incentiveValue: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 6: Daily Allowance (D.A)
    dailyAllowance: {
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 7: Petrol and Bike Maintenance
    petrolAllowance: {
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 8: Call Mobile & Internet Services Package
    mobilePackage: {
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 9: Incentive on Mobile Order Creation
    mobileOrderIncentive: {
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 10: Incentive on Mobile Cash Recovery
    mobileCashRecoveryIncentive: {
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      verifyWithCashBook: {
        type: Boolean,
        default: true,
      },
    },

    // Component 11: Total Target Visit To Parties Order Invoices
    partyVisitTarget: {
      numberOfOrders: {
        type: Number,
        default: 0,
        min: 0,
      },
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 12: Eid ul Fitr Bonus
    eidFitrBonus: {
      month: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 13: Eid Ul Adha Bonus
    eidAdhaBonus: {
      month: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 14: Other Bonus
    otherBonus: {
      detail: {
        type: String,
        default: '',
      },
      month: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: ['Fix Amount', 'Amount', '%'],
        default: 'Fix Amount',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Component 15: Incentive on Brand Item Sales (Multiple Entries)
    brandIncentives: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: true,
        },
        itemName: {
          type: String,
          required: true,
        },
        quantityTarget: {
          type: Number,
          required: true,
          min: 0,
        },
        duration: {
          fromDate: {
            type: Date,
            required: true,
          },
          toDate: {
            type: Date,
            required: true,
          },
        },
        type: {
          type: String,
          enum: ['Fix Amount', 'Amount', '%'],
          default: 'Fix Amount',
        },
        value: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// Validation: Duration dates
salaryPackageSchema.path('duration.toDate').validate(function (value) {
  return value > this.duration.fromDate;
}, 'To Date must be after From Date');

// Validation: Brand incentive duration
salaryPackageSchema.path('brandIncentives').validate((brandIncentives) => {
  for (const incentive of brandIncentives) {
    if (incentive.duration.toDate <= incentive.duration.fromDate) {
      return false;
    }
  }
  return true;
}, 'Brand incentive To Date must be after From Date');

// Pre-save hook: Generate packageId
salaryPackageSchema.pre('save', async function (next) {
  if (!this.packageId) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.packageId = `SP${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save hook: Fetch basic pay from Account model
salaryPackageSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('employeeId')) {
    try {
      const Account = mongoose.model('Account');
      const employee = await Account.findById(this.employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.accountType !== 'Employee') {
        throw new Error('Selected account is not an employee');
      }

      // Fetch basic pay from employee biodata
      if (employee.basicPay) {
        this.basicPay.amount = employee.basicPay;
      }

      this.employeeName = employee.accountName;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save hook: Check for overlapping packages
salaryPackageSchema.pre('save', async function (next) {
  try {
    const query = {
      employeeId: this.employeeId,
      status: 'Active',
      _id: { $ne: this._id },
      $or: [
        {
          'duration.fromDate': { $lte: this.duration.toDate },
          'duration.toDate': { $gte: this.duration.fromDate },
        },
      ],
    };

    const overlapping = await this.constructor.findOne(query);

    if (overlapping) {
      throw new Error(
        `Overlapping salary package exists for this employee (${overlapping.packageId})`,
      );
    }
  } catch (error) {
    return next(error);
  }
  next();
});

// Indexes
salaryPackageSchema.index({ packageId: 1 }, { unique: true });
salaryPackageSchema.index({ employeeId: 1, 'duration.fromDate': -1 });
salaryPackageSchema.index({ employeeId: 1, status: 1 });
salaryPackageSchema.index({ 'duration.fromDate': 1, 'duration.toDate': 1 });

module.exports = mongoose.model('SalaryPackage', salaryPackageSchema);
