const { body, param, query } = require('express-validator');
const { validate, isValidObjectId } = require('../../middleware/validation');

/**
 * Account Validators
 * Input validation rules for account management endpoints
 * Requirements: 3.1-3.22
 */

/**
 * Validation rules for creating a new account
 */
const createAccountValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Account name must be between 2 and 200 characters'),

  body('accountType')
    .notEmpty()
    .withMessage('Account type is required')
    .isIn(['customer', 'supplier', 'employee', 'investor', 'both'])
    .withMessage('Invalid account type'),

  body('parentAccountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid parent account ID'),

  body('dimensionId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid dimension ID'),

  body('townId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('areaId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid area ID'),

  body('contactInfo.phone1')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('contactInfo.phone2')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('contactInfo.phone3')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

  body('contactInfo.nicNumber')
    .optional()
    .matches(/^[0-9]{5}-[0-9]{7}-[0-9]$/)
    .withMessage('Invalid CNIC format (xxxxx-xxxxxxx-x)'),

  body('employeeBiodata.dateOfAppointment')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('employeeBiodata.bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),

  body('employeeBiodata.basicPay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Basic pay must be a non-negative number'),

  body('businessDetails.customerType')
    .optional()
    .isIn(['retailer', 'wholesaler', 'distributor', 'hospital', 'pharmacy'])
    .withMessage('Invalid customer type'),

  body('businessDetails.creditDaysLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Credit days limit must be a non-negative integer'),

  body('businessDetails.creditAmountLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit amount limit must be a non-negative number'),

  body('businessDetails.openingBalance')
    .optional()
    .isFloat()
    .withMessage('Opening balance must be a number'),

  body('businessDetails.balanceType')
    .optional()
    .isIn(['debit', 'credit'])
    .withMessage('Balance type must be debit or credit'),

  body('businessDetails.assignedSalesmanId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid salesman ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for updating an account
 */
const updateAccountValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Account name must be between 2 and 200 characters'),

  body('accountType')
    .optional()
    .isIn(['customer', 'supplier', 'employee', 'investor', 'both'])
    .withMessage('Invalid account type'),

  body('parentAccountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid parent account ID'),

  body('dimensionId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid dimension ID'),

  body('townId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid town ID'),

  body('areaId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid area ID'),

  body('contactInfo.phone1')
    .optional()
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Invalid phone number format'),

  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

  body('businessDetails.creditDaysLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Credit days limit must be a non-negative integer'),

  body('businessDetails.creditAmountLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit amount limit must be a non-negative number'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for getting account by ID
 */
const getAccountByIdValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),
  validate,
];

/**
 * Validation rules for updating account balance
 */
const updateAccountBalanceValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat()
    .withMessage('Amount must be a number'),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['debit', 'credit'])
    .withMessage('Type must be debit or credit'),

  validate,
];

/**
 * Validation rules for credit limit check
 */
const creditLimitCheckValidation = [
  query('accountId')
    .notEmpty()
    .withMessage('Account ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),

  query('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a non-negative number'),

  validate,
];

module.exports = {
  createAccountValidation,
  updateAccountValidation,
  getAccountByIdValidation,
  updateAccountBalanceValidation,
  creditLimitCheckValidation,
};
