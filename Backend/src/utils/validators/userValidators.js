const { body, param } = require('express-validator');
const { validate, isValidObjectId } = require('../../middleware/validation');

/**
 * User Validators
 * Input validation rules for user management endpoints
 * Requirements: 10.1-10.14
 */

/**
 * Validation rules for creating a new user
 */
const createUserValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('accountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),

  body('dimensionId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid dimension ID'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'salesman', 'accountant', 'store_keeper', 'data_entry'])
    .withMessage('Invalid role'),

  body('permissions.modules')
    .optional()
    .isArray()
    .withMessage('Modules must be an array'),

  body('permissions.features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  body('permissions.dataAccess.dimensionBased')
    .optional()
    .isBoolean()
    .withMessage('Dimension based access must be a boolean'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for updating a user
 */
const updateUserValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('accountId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid account ID'),

  body('dimensionId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid dimension ID'),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'salesman', 'accountant', 'store_keeper', 'data_entry'])
    .withMessage('Invalid role'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for getting user by ID
 */
const getUserByIdValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),
  validate,
];

/**
 * Validation rules for changing password
 */
const changePasswordValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('New password must be between 6 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),

  validate,
];

/**
 * Validation rules for updating user role
 */
const updateUserRoleValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'salesman', 'accountant', 'store_keeper', 'data_entry'])
    .withMessage('Invalid role'),

  validate,
];

/**
 * Validation rules for updating user permissions
 */
const updateUserPermissionsValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  body('permissions')
    .notEmpty()
    .withMessage('Permissions object is required')
    .isObject()
    .withMessage('Permissions must be an object'),

  body('permissions.modules')
    .optional()
    .isArray()
    .withMessage('Modules must be an array'),

  body('permissions.features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  validate,
];

/**
 * Validation rules for forgot password
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  validate,
];

/**
 * Validation rules for reset password
 */
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('New password must be between 6 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),

  validate,
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  getUserByIdValidation,
  changePasswordValidation,
  updateUserRoleValidation,
  updateUserPermissionsValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
