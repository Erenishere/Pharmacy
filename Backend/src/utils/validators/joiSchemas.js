const Joi = require('joi');

/**
 * Comprehensive Joi Validation Schemas for Master Data Management
 * Requirements: All validation criteria from requirements document
 */

// Custom validators
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'valid ObjectId');
const pakistanPhone = Joi.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Pakistan phone format');
const pakistanCNIC = Joi.string().regex(/^[0-9]{5}-[0-9]{7}-[0-9]$/, 'Pakistan CNIC format');

/**
 * Item Validation Schema
 * Requirements: 1.1-1.20
 */
const itemSchema = Joi.object({
  code: Joi.string().max(50).optional(),
  name: Joi.string().min(3).max(200).required()
    .messages({
      'string.min': 'Item name must be at least 3 characters',
      'string.max': 'Item name must not exceed 200 characters',
      'any.required': 'Item name is required',
    }),
  description: Joi.string().max(1000).optional().allow(''),

  // Company & Classification
  companyId: objectId.required()
    .messages({ 'any.required': 'Company is required' }),
  sellingGroup: Joi.string().valid('A', 'B', 'C').optional()
    .messages({ 'any.only': 'Selling group must be A, B, or C' }),
  formulaId: objectId.optional(),
  formulaSizeId: objectId.optional(),
  categoryId: objectId.required()
    .messages({ 'any.required': 'Category is required' }),
  subCategoryId: objectId.optional(),
  businessTypeId: objectId.required()
    .messages({ 'any.required': 'Business type is required' }),

  // Pricing
  pricing: Joi.object({
    purchasePrice: Joi.number().min(0).optional(),
    salePrice: Joi.number().min(0).optional(),
    retailPrice: Joi.number().min(0).optional(),
    wholesalePrice: Joi.number().min(0).optional(),
    distributorPrice: Joi.number().min(0).optional(),
    mrp: Joi.number().min(0).optional(),
    discountPercentage: Joi.number().min(0).max(100).optional(),
  }).optional(),

  // Inventory
  inventory: Joi.object({
    openingStock: Joi.number().min(0).optional(),
    currentStock: Joi.number().min(0).optional(),
    minStockLevel: Joi.number().min(0).optional(),
    maxStockLevel: Joi.number().min(0).optional(),
    reorderPoint: Joi.number().min(0).optional(),
    leadTime: Joi.number().min(0).optional(),
  }).optional().custom((value, helpers) => {
    // Business rule: min <= reorder <= max
    if (value.minStockLevel !== undefined
        && value.maxStockLevel !== undefined
        && value.minStockLevel > value.maxStockLevel) {
      return helpers.error('inventory.minMaxOrder');
    }
    if (value.reorderPoint !== undefined) {
      if (value.minStockLevel !== undefined && value.reorderPoint < value.minStockLevel) {
        return helpers.error('inventory.minMaxOrder');
      }
      if (value.maxStockLevel !== undefined && value.reorderPoint > value.maxStockLevel) {
        return helpers.error('inventory.minMaxOrder');
      }
    }
    return value;
  }, 'Stock level validation').messages({
    'inventory.minMaxOrder': 'Stock levels must satisfy: min <= reorder <= max',
  }),

  // Tax & Regulatory
  tax: Joi.object({
    taxType: Joi.string().max(50).optional(),
    taxPercentage: Joi.number().valid(0, 4, 18).optional()
      .messages({ 'any.only': 'Tax percentage must be 0, 4, or 18' }),
    hsnCode: Joi.string().max(20).optional(),
    taxRegistrationNumber: Joi.string().max(50).optional(),
    regulatoryStatus: Joi.string().max(100).optional(),
    licenseNumbers: Joi.array().items(Joi.string().max(50)).optional(),
  }).optional(),

  // Product Specifications
  specifications: Joi.object({
    unitOfMeasurement: Joi.string().max(20).optional(),
    packingSize: Joi.number().min(0).optional(),
    batchTracking: Joi.boolean().optional(),
    expiryTracking: Joi.boolean().optional(),
    barcode: Joi.string().max(50).optional(),
    sku: Joi.string().max(50).optional(),
  }).optional(),

  // Supplier Information
  supplier: Joi.object({
    primarySupplierId: objectId.optional(),
    alternativeSuppliers: Joi.array().items(objectId).optional(),
    supplierItemCode: Joi.string().max(50).optional(),
    supplierLeadTime: Joi.number().min(0).optional(),
  }).optional(),

  // Additional
  productImage: Joi.string().uri().optional(),
  storageConditions: Joi.string().max(500).optional(),
  handlingInstructions: Joi.string().max(500).optional(),
  safetyInformation: Joi.string().max(500).optional(),

  isActive: Joi.boolean().optional(),
});

/**
 * Company Validation Schema
 * Requirements: 2.1-2.10
 */
const companySchema = Joi.object({
  code: Joi.string().max(50).optional(),
  name: Joi.string().min(2).max(200).required()
    .messages({
      'string.min': 'Company name must be at least 2 characters',
      'any.required': 'Company name is required',
    }),
  groupType: Joi.string().valid('A', 'B', 'C').optional()
    .messages({ 'any.only': 'Group type must be A, B, or C' }),
  contactPerson: Joi.string().max(100).optional(),
  phone: pakistanPhone.optional(),
  address: Joi.string().max(500).optional(),
  email: Joi.string().email().optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Account (Customer/Supplier/Employee) Validation Schema
 * Requirements: 3.1-3.22
 */
const accountSchema = Joi.object({
  code: Joi.string().max(50).optional(),
  name: Joi.string().min(2).max(200).required()
    .messages({
      'string.min': 'Account name must be at least 2 characters',
      'any.required': 'Account name is required',
    }),
  accountType: Joi.string()
    .valid('customer', 'supplier', 'employee', 'investor', 'both')
    .required()
    .messages({ 'any.required': 'Account type is required' }),
  parentAccountId: objectId.optional(),

  // Dimension & Territory
  dimensionId: objectId.optional(),
  townId: objectId.optional(),
  areaId: objectId.optional(),

  // Contact Information
  contactInfo: Joi.object({
    address: Joi.string().max(500).optional(),
    phone1: pakistanPhone.optional(),
    phone2: pakistanPhone.optional(),
    phone3: pakistanPhone.optional(),
    email: Joi.string().email().optional(),
    nicNumber: pakistanCNIC.optional(),
  }).optional(),

  // Employee Biodata
  employeeBiodata: Joi.object({
    fatherName: Joi.string().max(100).optional(),
    fatherNIC: pakistanCNIC.optional(),
    dateOfAppointment: Joi.date().optional(),
    guarantorName: Joi.string().max(100).optional(),
    guarantorNIC: pakistanCNIC.optional(),
    emergencyContact: pakistanPhone.optional(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    permanentAddress: Joi.string().max(500).optional(),
    designationId: objectId.optional(),
    basicPay: Joi.number().min(0).optional(),
    salaryPosition: Joi.string().max(100).optional(),
  }).optional(),

  // Business Details
  businessDetails: Joi.object({
    customerType: Joi.string()
      .valid('retailer', 'wholesaler', 'distributor', 'hospital', 'pharmacy')
      .optional(),
    creditDaysLimit: Joi.number().integer().min(0).optional(),
    creditAmountLimit: Joi.number().min(0).optional(),
    openingBalance: Joi.number().optional(),
    balanceType: Joi.string().valid('debit', 'credit').optional(),
    assignedSalesmanId: objectId.optional(),
  }).optional(),

  // Banking Information
  bankingInfo: Joi.object({
    bankName: Joi.string().max(100).optional(),
    accountNumber: Joi.string().max(50).optional(),
    branch: Joi.string().max(100).optional(),
  }).optional(),

  currentBalance: Joi.number().optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * User Validation Schema
 * Requirements: 10.1-10.14
 */
const userSchema = Joi.object({
  username: Joi.string().min(3).max(50).required()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'any.required': 'Username is required',
    }),
  email: Joi.string().email().required()
    .messages({ 'any.required': 'Email is required' }),
  password: Joi.string().min(6).max(100).optional()
    .messages({ 'string.min': 'Password must be at least 6 characters' }),

  accountId: objectId.optional(),
  dimensionId: objectId.optional(),

  role: Joi.string()
    .valid('admin', 'manager', 'salesman', 'accountant', 'store_keeper', 'data_entry')
    .required()
    .messages({ 'any.required': 'Role is required' }),

  permissions: Joi.object({
    modules: Joi.array().items(Joi.string()).optional(),
    features: Joi.array().items(Joi.string()).optional(),
    dataAccess: Joi.object({
      dimensionBased: Joi.boolean().optional(),
      allowedDimensions: Joi.array().items(objectId).optional(),
    }).optional(),
  }).optional(),

  isActive: Joi.boolean().optional(),
});

/**
 * Warehouse Validation Schema
 * Requirements: 5.1-5.8
 */
const warehouseSchema = Joi.object({
  code: Joi.string().max(50).optional(),
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Warehouse name must be at least 2 characters',
      'any.required': 'Warehouse name is required',
    }),
  address: Joi.string().max(500).required()
    .messages({ 'any.required': 'Address is required' }),
  townId: objectId.optional(),
  inchargeUserId: objectId.optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Town Validation Schema
 * Requirements: 6.1-6.9
 */
const townSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Town name must be at least 2 characters',
      'any.required': 'Town name is required',
    }),
  region: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Area Validation Schema
 * Requirements: 6.1-6.9
 */
const areaSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Area name must be at least 2 characters',
      'any.required': 'Area name is required',
    }),
  townId: objectId.required()
    .messages({ 'any.required': 'Town is required' }),
  isActive: Joi.boolean().optional(),
});

/**
 * Category Validation Schema
 * Requirements: 7.1-7.7
 */
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'any.required': 'Category name is required',
    }),
  parentCategoryId: objectId.optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * SubCategory Validation Schema
 * Requirements: 7.1-7.7
 */
const subCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Sub-category name must be at least 2 characters',
      'any.required': 'Sub-category name is required',
    }),
  categoryId: objectId.required()
    .messages({ 'any.required': 'Category is required' }),
  isActive: Joi.boolean().optional(),
});

/**
 * Formula Validation Schema
 * Requirements: 8.1-8.7
 */
const formulaSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Formula name must be at least 2 characters',
      'any.required': 'Formula name is required',
    }),
  composition: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * FormulaSize Validation Schema
 * Requirements: 8.1-8.7
 */
const formulaSizeSchema = Joi.object({
  formulaId: objectId.required()
    .messages({ 'any.required': 'Formula is required' }),
  size: Joi.string().min(1).max(50).required()
    .messages({
      'string.min': 'Size must be at least 1 character',
      'any.required': 'Size is required',
    }),
  strength: Joi.string().max(50).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Business Type Validation Schema
 * Requirements: 9.1-9.6
 */
const businessTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Business type name must be at least 2 characters',
      'any.required': 'Business type name is required',
    }),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Salesman Validation Schema
 * Requirements: 4.1-4.7
 */
const salesmanSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Salesman name must be at least 2 characters',
      'any.required': 'Salesman name is required',
    }),
  employeeAccountId: objectId.optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Transporter Validation Schema
 * Requirements: 11.1-11.7
 */
const transporterSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Transporter name must be at least 2 characters',
      'any.required': 'Transporter name is required',
    }),
  contactPerson: Joi.string().max(100).optional(),
  phone: pakistanPhone.optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Claim Account Validation Schema
 * Requirements: 12.1-12.7
 */
const claimAccountSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Claim account name must be at least 2 characters',
      'any.required': 'Claim account name is required',
    }),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  itemSchema,
  companySchema,
  accountSchema,
  userSchema,
  warehouseSchema,
  townSchema,
  areaSchema,
  categorySchema,
  subCategorySchema,
  formulaSchema,
  formulaSizeSchema,
  businessTypeSchema,
  salesmanSchema,
  transporterSchema,
  claimAccountSchema,
};
