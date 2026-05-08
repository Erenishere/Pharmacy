const express = require('express');
const { body, param, query } = require('express-validator');
const accountController = require('../controllers/accountController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { validate, isValidObjectId } = require('../middleware/validation');

const router = express.Router();
const ACCOUNT_TYPE_VALUES = ['customer', 'supplier', 'employee', 'investor', 'both', 'account_manager', 'sub_account'];
const READ_ACCOUNT_TYPE_VALUES = [
  ...ACCOUNT_TYPE_VALUES,
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
  'adjustment',
  'claim',
];
const accountRegistrationLookupsCache = cacheMiddleware({
  duration: 'short',
  ttl: 120,
  keyGenerator: () => 'accounts:registration-lookups',
});

/**
 * @route   GET /api/v1/accounts/registration-lookups
 * @desc    Get cached account-registration lookup bundle
 * @access  Private
 */
router.get(
  '/registration-lookups',
  authenticate,
  accountRegistrationLookupsCache,
  accountController.getAccountRegistrationLookups,
);

/**
 * @route   GET /api/v1/accounts/credit-limit-exceeded
 * @desc    Get accounts with credit limit exceeded
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/credit-limit-exceeded',
  authenticate,
  requireRoles(['admin', 'accountant']),
  accountController.getAccountsWithCreditLimitExceeded,
);

/**
 * @route   GET /api/v1/accounts/search
 * @desc    Advanced search for accounts
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  [
    query('searchText')
      .optional()
      .trim()
      .isString()
      .withMessage('Search text must be a string'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortField')
      .optional()
      .trim()
      .isString()
      .withMessage('Sort field must be a string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query('accountType')
      .optional()
      .isIn(READ_ACCOUNT_TYPE_VALUES)
      .withMessage('Invalid account type'),
    query('townId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid town ID format'),
    query('areaId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid area ID format'),
    query('dimensionId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid dimension ID format'),
    query('salesmanId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid salesman ID format'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate,
  ],
  accountController.searchAccounts,
);

/**
 * @route   GET /api/v1/accounts/credit-days-exceeded
 * @desc    Get accounts with credit days exceeded
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/credit-days-exceeded',
  authenticate,
  requireRoles(['admin', 'accountant']),
  accountController.getAccountsWithCreditDaysExceeded,
);

/**
 * @route   GET /api/v1/accounts/credit-limit-check
 * @desc    Check credit limit for an account
 * @access  Private
 */
router.get(
  '/credit-limit-check',
  authenticate,
  [
    query('accountId')
      .notEmpty()
      .withMessage('Account ID is required')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    query('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    validate,
  ],
  accountController.checkCreditLimit,
);

/**
 * @route   GET /api/v1/accounts/type/:type
 * @desc    Get accounts by type
 * @access  Private
 */
router.get(
  '/type/:type',
  authenticate,
  [
    param('type')
      .isIn(READ_ACCOUNT_TYPE_VALUES)
      .withMessage(`Invalid account type. Must be one of: ${READ_ACCOUNT_TYPE_VALUES.join(', ')}`),
    validate,
  ],
  accountController.getAccountsByType,
);

/**
 * @route   GET /api/v1/accounts
 * @desc    Get all accounts with optional filters and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('accountType')
      .optional()
      .isIn(READ_ACCOUNT_TYPE_VALUES)
      .withMessage('Invalid account type'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('dimensionId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid dimension ID format'),
    query('townId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid town ID format'),
    query('areaId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid area ID format'),
    validate,
  ],
  accountController.getAccounts,
);

/**
 * @route   POST /api/v1/accounts
 * @desc    Create new account
 * @access  Private (Admin, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'data_entry']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Account name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Account name must be between 2 and 200 characters'),
    body('accountType')
      .notEmpty()
      .withMessage('Account type is required')
      .isIn(ACCOUNT_TYPE_VALUES)
      .withMessage(`Invalid account type. Must be one of: ${ACCOUNT_TYPE_VALUES.join(', ')}`),
    body('parentAccountId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid parent account ID format'),
    body('dimensionId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid dimension ID format'),
    body('townId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid town ID format'),
    body('areaId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid area ID format'),
    body('accountHeadId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid account head ID format'),
    body('customerTypeId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid customer type ID format'),
    body('routeId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid route ID format'),
    body('linkedAccountId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid linked account ID format'),
    body('assignedSalesmanId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid assigned salesman ID format'),
    body('employeeBiodata.designationId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid designation ID format'),
    body('contactInfo.email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('contactInfo.nicNumber')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('NIC number cannot exceed 20 characters'),
    body('employeeBiodata.basicPay')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Basic pay must be a positive number'),
    body('employeeBiodata.bloodGroup')
      .optional({ checkFalsy: true })
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('businessDetails.creditAmountLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit amount limit must be a positive number'),
    body('businessDetails.creditDaysLimit')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Credit days limit must be between 0 and 365'),
    body('businessDetails.customerType')
      .optional({ checkFalsy: true })
      .isString()
      .withMessage('Customer type must be a string'),
    body('businessDetails.balanceType')
      .optional()
      .isIn(['debit', 'credit'])
      .withMessage('Balance type must be either debit or credit'),
    body('businessDetails.openingBalance')
      .optional()
      .isFloat()
      .withMessage('Opening balance must be a number'),
    body('bankingInfo.accountNumber')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Account number cannot exceed 50 characters'),
    validate,
  ],
  accountController.createAccount,
);

/**
 * @route   GET /api/v1/accounts/:id
 * @desc    Get account by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    validate,
  ],
  accountController.getAccountById,
);

/**
 * @route   PUT /api/v1/accounts/:id
 * @desc    Update account
 * @access  Private (Admin, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Account name must be between 2 and 200 characters'),
    body('accountType')
      .optional()
      .isIn(ACCOUNT_TYPE_VALUES)
      .withMessage(`Invalid account type. Must be one of: ${ACCOUNT_TYPE_VALUES.join(', ')}`),
    body('parentAccountId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid parent account ID format'),
    body('dimensionId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid dimension ID format'),
    body('townId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid town ID format'),
    body('areaId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid area ID format'),
    body('accountHeadId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid account head ID format'),
    body('customerTypeId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid customer type ID format'),
    body('routeId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid route ID format'),
    body('linkedAccountId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid linked account ID format'),
    body('assignedSalesmanId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid assigned salesman ID format'),
    body('employeeBiodata.designationId')
      .optional({ checkFalsy: true })
      .custom(isValidObjectId)
      .withMessage('Invalid designation ID format'),
    body('contactInfo.email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('employeeBiodata.basicPay')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Basic pay must be a positive number'),
    body('employeeBiodata.bloodGroup')
      .optional({ checkFalsy: true })
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('businessDetails.creditAmountLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit amount limit must be a positive number'),
    body('businessDetails.creditDaysLimit')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Credit days limit must be between 0 and 365'),
    body('businessDetails.customerType')
      .optional({ checkFalsy: true })
      .isString()
      .withMessage('Customer type must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate,
  ],
  accountController.updateAccount,
);

/**
 * @route   DELETE /api/v1/accounts/:id
 * @desc    Delete account (soft delete with validation)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    validate,
  ],
  accountController.deleteAccount,
);

/**
 * @route   PATCH /api/v1/accounts/:id/balance
 * @desc    Update account balance
 * @access  Private (Admin, Accountant)
 */
router.patch(
  '/:id/balance',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than zero'),
    body('transactionType')
      .notEmpty()
      .withMessage('Transaction type is required')
      .isIn(['debit', 'credit'])
      .withMessage('Transaction type must be either debit or credit'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    body('referenceType')
      .optional()
      .isIn(['invoice', 'payment', 'adjustment', 'opening_balance', 'cash_receipt', 'cash_payment'])
      .withMessage('Invalid reference type'),
    body('referenceId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid reference ID format'),
    validate,
  ],
  accountController.updateAccountBalance,
);

/**
 * @route   GET /api/v1/accounts/:id/ledger
 * @desc    Get account ledger
 * @access  Private
 */
router.get(
  '/:id/ledger',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    validate,
  ],
  accountController.getAccountLedger,
);

/**
 * @route   GET /api/v1/accounts/:id/transactions
 * @desc    Get account transactions
 * @access  Private
 */
router.get(
  '/:id/transactions',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('transactionType')
      .optional()
      .isIn(['debit', 'credit'])
      .withMessage('Transaction type must be either debit or credit'),
    query('referenceType')
      .optional()
      .isIn(['invoice', 'payment', 'adjustment', 'opening_balance', 'cash_receipt', 'cash_payment'])
      .withMessage('Invalid reference type'),
    validate,
  ],
  accountController.getAccountTransactions,
);

/**
 * @route   GET /api/v1/accounts/:id/sub-accounts
 * @desc    Get sub-accounts of an account
 * @access  Private
 */
router.get(
  '/:id/sub-accounts',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid account ID format'),
    validate,
  ],
  accountController.getSubAccounts,
);

module.exports = router;
