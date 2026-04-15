const { body, param } = require('express-validator');
const { validate, isValidObjectId } = require('../../middleware/validation');

/**
 * Master Data Validators
 * Input validation rules for supporting master data entities
 * Requirements: 4.1-12.7
 */

// ============ Warehouse Validators (Requirements: 5.1-5.8) ============

const createWarehouseValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Warehouse name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Warehouse name must be between 2 and 100 characters'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('townId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('inchargeUserId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid incharge user ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateWarehouseValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid warehouse ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Warehouse name must be between 2 and 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('townId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('inchargeUserId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid incharge user ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Town Validators (Requirements: 6.1-6.9) ============

const createTownValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Town name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Town name must be between 2 and 100 characters'),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region must not exceed 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateTownValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Town name must be between 2 and 100 characters'),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region must not exceed 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Area Validators (Requirements: 6.1-6.9) ============

const createAreaValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Area name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),

  body('townId')
    .notEmpty()
    .withMessage('Town is required')
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateAreaValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid area ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),

  body('townId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Category Validators (Requirements: 7.1-7.7) ============

const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),

  body('parentCategoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid parent category ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateCategoryValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),

  body('parentCategoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid parent category ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ SubCategory Validators (Requirements: 7.1-7.7) ============

const createSubCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Sub-category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Sub-category name must be between 2 and 100 characters'),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateSubCategoryValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid sub-category ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Sub-category name must be between 2 and 100 characters'),

  body('categoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Formula Validators (Requirements: 8.1-8.7) ============

const createFormulaValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Formula name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Formula name must be between 2 and 100 characters'),

  body('composition')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Composition must not exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateFormulaValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid formula ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Formula name must be between 2 and 100 characters'),

  body('composition')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Composition must not exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ FormulaSize Validators (Requirements: 8.1-8.7) ============

const createFormulaSizeValidation = [
  body('formulaId')
    .notEmpty()
    .withMessage('Formula is required')
    .custom(isValidObjectId)
    .withMessage('Invalid formula ID'),

  body('size')
    .trim()
    .notEmpty()
    .withMessage('Size is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Size must be between 1 and 50 characters'),

  body('strength')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Strength must not exceed 50 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateFormulaSizeValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid formula size ID'),

  body('formulaId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid formula ID'),

  body('size')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Size must be between 1 and 50 characters'),

  body('strength')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Strength must not exceed 50 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Business Type Validators (Requirements: 9.1-9.6) ============

const createBusinessTypeValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Business type name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Business type name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateBusinessTypeValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid business type ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business type name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Salesman Validators (Requirements: 4.1-4.7) ============

const createSalesmanValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Salesman name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Salesman name must be between 2 and 100 characters'),

  body('employeeAccountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid employee account ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateSalesmanValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid salesman ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Salesman name must be between 2 and 100 characters'),

  body('employeeAccountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid employee account ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Transporter Validators (Requirements: 11.1-11.7) ============

const createTransporterValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Transporter name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Transporter name must be between 2 and 100 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name must not exceed 100 characters'),

  body('phone')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateTransporterValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid transporter ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Transporter name must be between 2 and 100 characters'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name must not exceed 100 characters'),

  body('phone')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Claim Account Validators (Requirements: 12.1-12.7) ============

const createClaimAccountValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Claim account name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Claim account name must be between 2 and 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

const updateClaimAccountValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid claim account ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Claim account name must be between 2 and 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

// ============ Common Validators ============

const getByIdValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid ID'),
  validate,
];

module.exports = {
  // Warehouse
  createWarehouseValidation,
  updateWarehouseValidation,

  // Town
  createTownValidation,
  updateTownValidation,

  // Area
  createAreaValidation,
  updateAreaValidation,

  // Category
  createCategoryValidation,
  updateCategoryValidation,

  // SubCategory
  createSubCategoryValidation,
  updateSubCategoryValidation,

  // Formula
  createFormulaValidation,
  updateFormulaValidation,

  // FormulaSize
  createFormulaSizeValidation,
  updateFormulaSizeValidation,

  // Business Type
  createBusinessTypeValidation,
  updateBusinessTypeValidation,

  // Salesman
  createSalesmanValidation,
  updateSalesmanValidation,

  // Transporter
  createTransporterValidation,
  updateTransporterValidation,

  // Claim Account
  createClaimAccountValidation,
  updateClaimAccountValidation,

  // Common
  getByIdValidation,
};
