const { body, param } = require('express-validator');
const { validate, isValidObjectId } = require('../../middleware/validation');

/**
 * Company Validators
 * Input validation rules for company management endpoints
 * Requirements: 2.1-2.10
 */

/**
 * Validation rules for creating a new company
 */
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),

  body('groupType')
    .optional()
    .isIn(['A', 'B', 'C'])
    .withMessage('Group type must be A, B, or C'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name must not exceed 100 characters'),

  body('phone')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for updating a company
 */
const updateCompanyValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid company ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),

  body('groupType')
    .optional()
    .isIn(['A', 'B', 'C'])
    .withMessage('Group type must be A, B, or C'),

  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name must not exceed 100 characters'),

  body('phone')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for getting company by ID
 */
const getCompanyByIdValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid company ID'),
  validate,
];

/**
 * Validation rules for toggling company status
 */
const toggleCompanyStatusValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid company ID'),
  validate,
];

module.exports = {
  createCompanyValidation,
  updateCompanyValidation,
  getCompanyByIdValidation,
  toggleCompanyStatusValidation,
};
