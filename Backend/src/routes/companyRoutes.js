const express = require('express');

const router = express.Router();
const { body, param, query } = require('express-validator');
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const clearItemRegistrationLookupsCache = clearCacheMiddleware(['items:registration-lookups']);

/**
 * Company Routes
 * Requirements: 2.1-2.10
 *
 * All routes require authentication
 */

// Validation middleware
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('groupType')
    .optional()
    .isIn(['A', 'B', 'C']).withMessage('Group type must be A, B, or C'),
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
];

const updateCompanyValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('groupType')
    .optional()
    .isIn(['A', 'B', 'C']).withMessage('Group type must be A, B, or C'),
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
];

const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid company ID'),
];

const groupTypeParamValidation = [
  param('type').isIn(['A', 'B', 'C']).withMessage('Group type must be A, B, or C'),
];

/**
 * @route   GET /api/v1/companies/group/:type
 * @desc    Get companies by group type
 * @access  Private
 * Requirements: 2.2, 2.7
 */
router.get(
  '/group/:type',
  authenticate,
  groupTypeParamValidation,
  validate,
  companyController.getCompaniesByGroupType,
);

/**
 * @route   GET /api/v1/companies/search
 * @desc    Advanced search for companies
 * @access  Private
 * Requirements: 2.7-2.8
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
    query('groupType')
      .optional()
      .isIn(['A', 'B', 'C'])
      .withMessage('Group type must be A, B, or C'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validate,
  companyController.searchCompanies,
);

/**
 * @route   GET /api/v1/companies/:id
 * @desc    Get company by ID
 * @access  Private
 * Requirements: 2.7
 */
router.get(
  '/:id',
  authenticate,
  idParamValidation,
  validate,
  companyController.getCompanyById,
);

/**
 * @route   GET /api/v1/companies
 * @desc    Get all companies with filtering and pagination
 * @access  Private
 * Requirements: 2.7-2.8
 */
router.get(
  '/',
  authenticate,
  companyController.getAllCompanies,
);

/**
 * @route   POST /api/v1/companies
 * @desc    Create new company
 * @access  Private
 * Requirements: 2.1-2.7
 */
router.post(
  '/',
  authenticate,
  clearItemRegistrationLookupsCache,
  createCompanyValidation,
  validate,
  companyController.createCompany,
);

/**
 * @route   PUT /api/v1/companies/:id
 * @desc    Update company
 * @access  Private
 * Requirements: 2.1-2.8
 */
router.put(
  '/:id',
  authenticate,
  idParamValidation,
  clearItemRegistrationLookupsCache,
  updateCompanyValidation,
  validate,
  companyController.updateCompany,
);

/**
 * @route   PATCH /api/v1/companies/:id/status
 * @desc    Toggle company status (active/inactive)
 * @access  Private
 * Requirements: 2.8-2.9
 */
router.patch(
  '/:id/status',
  authenticate,
  clearItemRegistrationLookupsCache,
  idParamValidation,
  validate,
  companyController.toggleCompanyStatus,
);

/**
 * @route   DELETE /api/v1/companies/:id
 * @desc    Delete company (with validation)
 * @access  Private
 * Requirements: 2.9-2.10
 */
router.delete(
  '/:id',
  authenticate,
  clearItemRegistrationLookupsCache,
  idParamValidation,
  validate,
  companyController.deleteCompany,
);

module.exports = router;
