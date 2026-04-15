const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Customer code cannot exceed 20 characters'],
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters'],
  },
  nameUrdu: {
    type: String,
    trim: true,
    maxlength: [200, 'Urdu name cannot exceed 200 characters'],
  },
  type: {
    type: String,
    required: [true, 'Customer type is required'],
    enum: {
      values: ['retail', 'wholesale', 'distributor', 'regular', 'customer', 'supplier', 'both'],
      message: 'Type must be one of: retail, wholesale, distributor, regular, customer, supplier, both',
    },
    default: 'regular',
  },
  // Master Data Management - Requirement 3.1: Account Type
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: {
      values: ['customer', 'supplier', 'employee', 'investor', 'both', 'account_manager', 'sub_account'],
      message: 'Account type must be one of: customer, supplier, employee, investor, both, account_manager, sub_account',
    },
    default: 'customer',
  },
  // Master Data Management - Requirement 3.3: Employee/Account Manager/Sub Account type
  employeeAccountType: {
    type: String,
    enum: {
      values: ['account_manager', 'sub_account', 'employee_account', ''],
      message: 'Employee account type must be one of: account_manager, sub_account, employee_account',
    },
    default: '',
    description: 'Specific type for employee accounts',
  },
  // Master Data Management - Requirement 3.4: Sub-account hierarchy
  parentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  // Master Data Management - Requirement 3.2: Dimension/Territory
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DimensionBranch',
    default: null,
  },
  // Master Data Management - Requirement 3.5, 3.6: Town and Area
  townId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Town',
    default: null,
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    default: null,
  },
  accountHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHead',
    default: null,
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    mobile: {
      type: String,
      trim: true,
      maxlength: [20, 'Mobile number cannot exceed 20 characters'],
    },
    // Master Data Management - Requirement 3.8: Multiple phone numbers
    phone1: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    phone2: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    phone3: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: [20, 'WhatsApp number cannot exceed 20 characters'],
    },
    proprietorWhatsapp: {
      type: String,
      trim: true,
      maxlength: [20, 'Proprietor WhatsApp cannot exceed 20 characters'],
    },
    storeInchargeWhatsapp: {
      type: String,
      trim: true,
      maxlength: [20, 'Store Incharge WhatsApp cannot exceed 20 characters'],
    },
    messageNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Message/call number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    guarantorAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Guarantor address cannot exceed 500 characters'],
    },
    // Master Data Management - Requirement 3.7: Delivery location
    deliveryLocation: {
      type: String,
      trim: true,
      maxlength: [500, 'Delivery location cannot exceed 500 characters'],
    },
    locationPinPoint: {
      type: String,
      trim: true,
      maxlength: [200, 'Location pin point cannot exceed 200 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    town: {
      type: String,
      trim: true,
      maxlength: [100, 'Town cannot exceed 100 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Pakistan',
    },
    // Master Data Management - Requirement 3.10: NIC/CNIC number
    nicNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'CNIC number cannot exceed 20 characters'],
    },
  },
  // Master Data Management - Requirement 3.11-3.13: Employee Biodata
  employeeBiodata: {
    fatherName: {
      type: String,
      trim: true,
      maxlength: [200, 'Father name cannot exceed 200 characters'],
    },
    fatherNIC: {
      type: String,
      trim: true,
      maxlength: [20, 'Father NIC cannot exceed 20 characters'],
    },
    dateOfAppointment: {
      type: Date,
    },
    guarantorName: {
      type: String,
      trim: true,
      maxlength: [200, 'Guarantor name cannot exceed 200 characters'],
    },
    guarantorNIC: {
      type: String,
      trim: true,
      maxlength: [20, 'Guarantor NIC cannot exceed 20 characters'],
    },
    emergencyContact: {
      type: String,
      trim: true,
      maxlength: [20, 'Emergency contact cannot exceed 20 characters'],
    },
    bloodGroup: {
      type: String,
      trim: true,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
        message: 'Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
      },
    },
    permanentAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Permanent address cannot exceed 500 characters'],
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [200, 'Designation cannot exceed 200 characters'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [200, 'Department cannot exceed 200 characters'],
    },
    dateOfBirth: {
      type: Date,
    },
    dateOfJoining: {
      type: Date,
    },
    basicPay: {
      type: Number,
      min: [0, 'Basic pay cannot be negative'],
    },
    experience: {
      type: String,
      trim: true,
      maxlength: [100, 'Experience cannot exceed 100 characters'],
    },
    guarantorPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Guarantor phone cannot exceed 20 characters'],
    },
    salaryPosition: {
      type: String,
      trim: true,
      maxlength: [100, 'Salary position cannot exceed 100 characters'],
    },
    proprietorName: {
      type: String,
      trim: true,
      maxlength: [200, 'Proprietor name cannot exceed 200 characters'],
    },
    storeInchargeName: {
      type: String,
      trim: true,
      maxlength: [200, 'Store incharge name cannot exceed 200 characters'],
    },
  },
  // Master Data Management - Requirement 3.14-3.17: Business Details
  businessDetails: {
  },
  customerTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerType',
    default: null,
  },
  creditDaysLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit days limit cannot be negative'],
    max: [365, 'Credit days limit cannot exceed 365'],
  },
  creditAmountLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit amount limit cannot be negative'],
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  balanceType: {
    type: String,
    enum: {
      values: ['debit', 'credit', ''],
      message: 'Balance type must be either debit or credit',
    },
  },
  assignedSalesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
  },
  linkedAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  // Master Data Management - Requirement 3.18: Banking Information (Multiple accounts)
  bankingInfo: {
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
    },
    branch: {
      type: String,
      trim: true,
      maxlength: [100, 'Branch cannot exceed 100 characters'],
    },
    iban: {
      type: String,
      trim: true,
      maxlength: [50, 'IBAN cannot exceed 50 characters'],
    },
    swiftCode: {
      type: String,
      trim: true,
      maxlength: [20, 'SWIFT code cannot exceed 20 characters'],
    },
  },
  bankingInfo2: {
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
    },
    branch: {
      type: String,
      trim: true,
      maxlength: [100, 'Branch cannot exceed 100 characters'],
    },
    iban: {
      type: String,
      trim: true,
      maxlength: [50, 'IBAN cannot exceed 50 characters'],
    },
    swiftCode: {
      type: String,
      trim: true,
      maxlength: [20, 'SWIFT code cannot exceed 20 characters'],
    },
  },
  bankingInfo3: {
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
    },
    branch: {
      type: String,
      trim: true,
      maxlength: [100, 'Branch cannot exceed 100 characters'],
    },
    iban: {
      type: String,
      trim: true,
      maxlength: [50, 'IBAN cannot exceed 50 characters'],
    },
    swiftCode: {
      type: String,
      trim: true,
      maxlength: [20, 'SWIFT code cannot exceed 20 characters'],
    },
  },
  financialInfo: {
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative'],
    },
    paymentTerms: {
      type: Number,
      default: 30,
      min: [0, 'Payment terms cannot be negative'],
      max: [365, 'Payment terms cannot exceed 365 days'],
    },
    taxNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax number cannot exceed 50 characters'],
    },
    // Phase 2 - Requirement 16.1: Tax Registration Fields
    licenseNo: {
      type: String,
      trim: true,
      maxlength: [50, 'License number cannot exceed 50 characters'],
    },
    licenseExpiryDate: {
      type: Date,
    },
    srbNo: {
      type: String,
      trim: true,
      maxlength: [50, 'SRB number cannot exceed 50 characters'],
    },
    ntn: {
      type: String,
      trim: true,
      maxlength: [50, 'NTN cannot exceed 50 characters'],
    },
    strn: {
      type: String,
      trim: true,
      maxlength: [50, 'STRN cannot exceed 50 characters'],
    },
    nicNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'CNIC number cannot exceed 20 characters'],
    },
    whtPercent: {
      type: Number,
      default: 0,
      min: [0, 'WHT percent cannot be negative'],
      max: [100, 'WHT percent cannot exceed 100'],
    },
    advanceWhtPercent: {
      type: Number,
      default: 0,
      min: [0, 'Advance WHT percent cannot be negative'],
      max: [100, 'Advance WHT percent cannot exceed 100'],
      description: 'Advance withholding tax % for filer/non-filer',
    },
    incomeTaxDeductionPercent: {
      type: Number,
      default: 0,
      min: [0, 'Income tax deduction cannot be negative'],
      max: [100, 'Income tax deduction cannot exceed 100'],
    },
    profitSharePercent: {
      type: Number,
      default: 0,
      min: [0, 'Profit share cannot be negative'],
      max: [100, 'Profit share cannot exceed 100'],
    },
    // Phase 2 - Requirement 16.2: Credit and Route Fields
    creditDays: {
      type: Number,
      default: 0,
      min: [0, 'Credit days cannot be negative'],
      max: [365, 'Credit days cannot exceed 365'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PKR',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    // Phase 2 - Account-based tax determination (Requirement 6.3, 6.4)
    advanceTaxRate: {
      type: Number,
      enum: [0, 0.5, 2.5],
      default: 0,
    },
    isNonFiler: {
      type: Boolean,
      default: false,
    },
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    default: null,
  },
  // Phase 2 - Due invoice tracking (Requirement 30)
  dueInvoiceQty: {
    type: Number,
    default: 0,
    min: [0, 'Due invoice quantity cannot be negative'],
  },
  // Master Data Management: Current balance tracking
  currentBalance: {
    type: Number,
    default: 0,
  },
  // Signatures for document verification
  signatures: {
    indusTraders: {
      type: String,
      trim: true,
      maxlength: [200, 'Signature cannot exceed 200 characters'],
    },
    employee: {
      type: String,
      trim: true,
      maxlength: [200, 'Signature cannot exceed 200 characters'],
    },
    guarantor: {
      type: String,
      trim: true,
      maxlength: [200, 'Signature cannot exceed 200 characters'],
    },
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes (unique indexes already handled by schema 'unique: true')
customerSchema.index({ name: 1 });
customerSchema.index({ type: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ 'contactInfo.city': 1 });
customerSchema.index({ 'contactInfo.town': 1 });
customerSchema.index({ 'financialInfo.creditLimit': 1 });
customerSchema.index({ dueInvoiceQty: 1 });
customerSchema.index({
  name: 'text', code: 'text', 'contactInfo.phone': 'text', 'contactInfo.email': 'text',
});
customerSchema.index({ code: 1 }, { unique: true });
customerSchema.index({ code: 1, name: 1, isActive: 1 });
// Master Data Management - Additional indexes for performance
customerSchema.index({ accountType: 1 });
customerSchema.index({ parentAccountId: 1 });
customerSchema.index({ dimensionId: 1 });
customerSchema.index({ townId: 1 });
customerSchema.index({ areaId: 1 });
customerSchema.index({ 'businessDetails.assignedSalesmanId': 1 });
customerSchema.index({ 'employeeBiodata.designationId': 1 });
customerSchema.index({ currentBalance: 1 });
customerSchema.index({ accountType: 1, isActive: 1 });
customerSchema.index({ townId: 1, areaId: 1 });
customerSchema.index({ dimensionId: 1, accountType: 1 });

// Virtual for full contact info
customerSchema.virtual('fullAddress').get(function () {
  const parts = [];
  if (this.contactInfo.address) parts.push(this.contactInfo.address);
  if (this.contactInfo.city) parts.push(this.contactInfo.city);
  if (this.contactInfo.country) parts.push(this.contactInfo.country);
  return parts.join(', ');
});

// Instance method to check credit availability
customerSchema.methods.checkCreditAvailability = function (amount) {
  return this.financialInfo.creditLimit >= amount;
};

// Instance method to get available credit
customerSchema.methods.getAvailableCredit = function () {
  // This would need to be calculated with actual receivables
  // For now, returning the credit limit
  return this.financialInfo.creditLimit;
};

// Phase 2 - Instance method to get advance tax rate (Requirement 6.3)
customerSchema.methods.getAdvanceTaxRate = function () {
  return this.financialInfo.advanceTaxRate || 0;
};

// Phase 2 - Instance method to check if customer is non-filer (Requirement 6.4)
customerSchema.methods.isNonFilerAccount = function () {
  return this.financialInfo.isNonFiler === true;
};

// Phase 2 - Instance method to calculate advance tax amount (Requirement 6.3)
customerSchema.methods.calculateAdvanceTax = function (amount) {
  const rate = this.getAdvanceTaxRate();
  return (amount * rate) / 100;
};

// Phase 2 - Instance method to calculate non-filer GST amount (Requirement 6.4)
customerSchema.methods.calculateNonFilerGST = function (amount) {
  if (this.isNonFilerAccount()) {
    return (amount * 0.1) / 100; // 0.1% additional GST for non-filers
  }
  return 0;
};

// Static method to find customers with credit limit
customerSchema.statics.findWithCreditLimit = function (minLimit = 0) {
  return this.find({
    'financialInfo.creditLimit': { $gte: minLimit },
    isActive: true,
  });
};

// Static method to find by type
customerSchema.statics.findByType = function (type) {
  return this.find({ type, isActive: true });
};

// Master Data Management - Static method to find by account type
customerSchema.statics.findByAccountType = function (accountType) {
  return this.find({ accountType, isActive: true });
};

// Master Data Management - Static method to find sub-accounts
customerSchema.statics.findSubAccounts = function (parentAccountId) {
  return this.find({ parentAccountId, isActive: true });
};

// Master Data Management - Static method to find by dimension
customerSchema.statics.findByDimension = function (dimensionId) {
  return this.find({ dimensionId, isActive: true });
};

// Master Data Management - Static method to find by town
customerSchema.statics.findByTown = function (townId) {
  return this.find({ townId, isActive: true });
};

// Master Data Management - Static method to find by area
customerSchema.statics.findByArea = function (areaId) {
  return this.find({ areaId, isActive: true });
};

// Master Data Management - Instance method to check if account is employee
customerSchema.methods.isEmployee = function () {
  return this.accountType === 'employee';
};

// Master Data Management - Instance method to check if account is customer
customerSchema.methods.isCustomer = function () {
  return this.accountType === 'customer' || this.accountType === 'both';
};

// Master Data Management - Instance method to check if account is supplier
customerSchema.methods.isSupplier = function () {
  return this.accountType === 'supplier' || this.accountType === 'both';
};

// Master Data Management - Instance method to check credit limit (Requirement 3.21)
customerSchema.methods.checkCreditLimitExceeded = function (additionalAmount = 0) {
  if (!this.businessDetails || !this.businessDetails.creditAmountLimit) {
    return false;
  }
  const totalAmount = Math.abs(this.currentBalance) + additionalAmount;
  return totalAmount > this.businessDetails.creditAmountLimit;
};

// Master Data Management - Instance method to get available credit
customerSchema.methods.getAvailableCreditAmount = function () {
  if (!this.businessDetails || !this.businessDetails.creditAmountLimit) {
    return 0;
  }
  const available = this.businessDetails.creditAmountLimit - Math.abs(this.currentBalance);
  return Math.max(0, available);
};

// Master Data Management - Instance method to check credit days exceeded (Requirement 3.22)
customerSchema.methods.checkCreditDaysExceeded = function (invoiceDate) {
  if (!this.businessDetails || !this.businessDetails.creditDaysLimit) {
    return false;
  }
  const currentDate = new Date();
  const daysDiff = Math.floor((currentDate - new Date(invoiceDate)) / (1000 * 60 * 60 * 24));
  return daysDiff > this.businessDetails.creditDaysLimit;
};

// Pre-save middleware to generate code if not provided
customerSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
