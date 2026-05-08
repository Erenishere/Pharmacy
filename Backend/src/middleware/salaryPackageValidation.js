const { body, param, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const SalaryPackage = require('../models/SalaryPackage');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = [];
    errors.array().map((err) => extractedErrors.push({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid input data',
      details: extractedErrors,
    });
  }

  next();
};

/**
 * Valid incentive types
 */
const VALID_INCENTIVE_TYPES = ['Fix Amount', 'Amount', '%'];

/**
 * Valid month names
 */
const VALID_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Validation rules for creating salary package
 */
const validatePackageCreation = [
  // Employee validation
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isMongoId()
    .withMessage('Invalid employee ID format'),

  // Duration validation
  body('duration.fromDate')
    .notEmpty()
    .withMessage('Duration from date is required')
    .isISO8601()
    .withMessage('Invalid from date format'),

  body('duration.toDate')
    .notEmpty()
    .withMessage('Duration to date is required')
    .isISO8601()
    .withMessage('Invalid to date format')
    .custom((toDate, { req }) => {
      const fromDate = new Date(req.body.duration.fromDate);
      const endDate = new Date(toDate);
      if (endDate <= fromDate) {
        throw new Error('To date must be after from date');
      }
      return true;
    }),

  // Sales Target validation
  body('salesTarget.targetAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sales target amount must be a positive number'),

  body('salesTarget.incentiveType')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('salesTarget.incentiveValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sales incentive value must be a positive number'),

  // Recovery Target validation
  body('recoveryTarget.targetAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Recovery target amount must be a positive number'),

  body('recoveryTarget.incentiveType')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('recoveryTarget.incentiveValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Recovery incentive value must be a positive number'),

  // Daily Allowance validation
  body('dailyAllowance.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Daily allowance type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('dailyAllowance.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily allowance value must be a positive number'),

  // Petrol Allowance validation
  body('petrolAllowance.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Petrol allowance type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('petrolAllowance.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Petrol allowance value must be a positive number'),

  // Mobile Package validation
  body('mobilePackage.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Mobile package type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('mobilePackage.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mobile package value must be a positive number'),

  // Mobile Order Incentive validation
  body('mobileOrderIncentive.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Mobile order incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('mobileOrderIncentive.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mobile order incentive value must be a positive number'),

  // Mobile Cash Recovery Incentive validation
  body('mobileCashRecoveryIncentive.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(
      `Mobile cash recovery incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`,
    ),

  body('mobileCashRecoveryIncentive.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mobile cash recovery incentive value must be a positive number'),

  // Party Visit Target validation
  body('partyVisitTarget.numberOfOrders')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Party visit target must be a positive integer'),

  body('partyVisitTarget.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Party visit target type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('partyVisitTarget.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Party visit target value must be a positive number'),

  // Eid Fitr Bonus validation
  body('eidFitrBonus.month')
    .optional()
    .isIn(VALID_MONTHS)
    .withMessage(`Eid Fitr bonus month must be one of: ${VALID_MONTHS.join(', ')}`),

  body('eidFitrBonus.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Eid Fitr bonus type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('eidFitrBonus.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Eid Fitr bonus value must be a positive number'),

  // Eid Adha Bonus validation
  body('eidAdhaBonus.month')
    .optional()
    .isIn(VALID_MONTHS)
    .withMessage(`Eid Adha bonus month must be one of: ${VALID_MONTHS.join(', ')}`),

  body('eidAdhaBonus.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Eid Adha bonus type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('eidAdhaBonus.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Eid Adha bonus value must be a positive number'),

  // Other Bonus validation
  body('otherBonus.detail').optional().isString().withMessage('Other bonus detail must be a string'),

  body('otherBonus.month')
    .optional()
    .isIn(VALID_MONTHS)
    .withMessage(`Other bonus month must be one of: ${VALID_MONTHS.join(', ')}`),

  body('otherBonus.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Other bonus type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('otherBonus.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Other bonus value must be a positive number'),

  // Brand Incentives validation
  body('brandIncentives')
    .optional()
    .isArray()
    .withMessage('Brand incentives must be an array'),

  body('brandIncentives.*.itemId')
    .optional()
    .isMongoId()
    .withMessage('Brand incentive item ID must be a valid MongoDB ID'),

  body('brandIncentives.*.quantityTarget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Brand incentive quantity target must be a positive number'),

  body('brandIncentives.*.duration.fromDate')
    .optional()
    .isISO8601()
    .withMessage('Brand incentive from date must be a valid date'),

  body('brandIncentives.*.duration.toDate')
    .optional()
    .isISO8601()
    .withMessage('Brand incentive to date must be a valid date'),

  body('brandIncentives.*.type')
    .optional()
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Brand incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('brandIncentives.*.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Brand incentive value must be a positive number'),

  handleValidationErrors,
];

/**
 * Middleware to validate employee exists and is active
 */
const validateEmployeeExists = async (req, res, next) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return next(); // Let express-validator handle missing employeeId
    }

    // Check if employee exists
    const employee = await Customer.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        message: `Employee with ID ${employeeId} does not exist`,
      });
    }

    // Check if account is an employee
    if (employee.accountType !== 'employee') {
      return res.status(400).json({
        success: false,
        error: 'Invalid account type',
        message: 'Selected account is not an employee',
      });
    }

    // Check if employee is active
    if (!employee.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Inactive employee',
        message: 'Cannot create salary package for inactive employee',
      });
    }

    // Attach employee to request for later use
    req.employee = employee;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Middleware to validate no overlapping packages for same employee
 */
const validateNoOverlappingPackages = async (req, res, next) => {
  try {
    const { employeeId, duration } = req.body;
    const packageId = req.params.id; // For updates

    if (!employeeId || !duration) {
      return next(); // Let express-validator handle missing fields
    }

    const fromDate = new Date(duration.fromDate);
    const toDate = new Date(duration.toDate);

    // Build query to find overlapping packages
    const query = {
      employeeId,
      status: 'Active',
      $or: [
        // New package starts during existing package
        {
          'duration.fromDate': { $lte: fromDate },
          'duration.toDate': { $gte: fromDate },
        },
        // New package ends during existing package
        {
          'duration.fromDate': { $lte: toDate },
          'duration.toDate': { $gte: toDate },
        },
        // New package completely contains existing package
        {
          'duration.fromDate': { $gte: fromDate },
          'duration.toDate': { $lte: toDate },
        },
      ],
    };

    // Exclude current package when updating
    if (packageId) {
      query._id = { $ne: packageId };
    }

    const overlappingPackage = await SalaryPackage.findOne(query);

    if (overlappingPackage) {
      return res.status(400).json({
        success: false,
        error: 'Overlapping package',
        message: `Employee already has an active salary package for overlapping period (${new Date(
          overlappingPackage.duration.fromDate,
        ).toLocaleDateString()} - ${new Date(
          overlappingPackage.duration.toDate,
        ).toLocaleDateString()})`,
        overlappingPackageId: overlappingPackage.packageId,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Middleware to validate brand incentive items exist
 */
const validateBrandIncentiveItems = async (req, res, next) => {
  try {
    const { brandIncentives } = req.body;

    if (!brandIncentives || brandIncentives.length === 0) {
      return next(); // No brand incentives to validate
    }

    // Extract all item IDs
    const itemIds = brandIncentives.map((incentive) => incentive.itemId).filter(Boolean);

    if (itemIds.length === 0) {
      return next();
    }

    // Check if all items exist
    const items = await Item.find({ _id: { $in: itemIds } });

    if (items.length !== itemIds.length) {
      const foundItemIds = items.map((item) => item._id.toString());
      const missingItemIds = itemIds.filter((id) => !foundItemIds.includes(id.toString()));

      return res.status(404).json({
        success: false,
        error: 'Items not found',
        message: 'One or more brand incentive items do not exist',
        missingItemIds,
      });
    }

    // Attach items to request for later use (to get item names)
    req.brandIncentiveItems = items;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }
};

/**
 * Validation rules for updating salary package
 */
const validatePackageUpdate = [
  param('id').isMongoId().withMessage('Invalid package ID format'),

  // All fields are optional for updates, but must be valid if provided
  body('duration.fromDate').optional().isISO8601().withMessage('Invalid from date format'),

  body('duration.toDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid to date format')
    .custom((toDate, { req }) => {
      if (req.body.duration && req.body.duration.fromDate) {
        const fromDate = new Date(req.body.duration.fromDate);
        const endDate = new Date(toDate);
        if (endDate <= fromDate) {
          throw new Error('To date must be after from date');
        }
      }
      return true;
    }),

  // Apply same validation rules as creation for other fields
  ...validatePackageCreation.slice(2, -1), // Exclude employeeId and handleValidationErrors

  handleValidationErrors,
];

/**
 * Validation rules for adding brand incentive
 */
const validateBrandIncentiveAddition = [
  param('id').isMongoId().withMessage('Invalid package ID format'),

  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .isMongoId()
    .withMessage('Invalid item ID format'),

  body('quantityTarget')
    .notEmpty()
    .withMessage('Quantity target is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity target must be a positive number'),

  body('duration.fromDate')
    .notEmpty()
    .withMessage('Duration from date is required')
    .isISO8601()
    .withMessage('Invalid from date format'),

  body('duration.toDate')
    .notEmpty()
    .withMessage('Duration to date is required')
    .isISO8601()
    .withMessage('Invalid to date format'),

  body('type')
    .notEmpty()
    .withMessage('Incentive type is required')
    .isIn(VALID_INCENTIVE_TYPES)
    .withMessage(`Incentive type must be one of: ${VALID_INCENTIVE_TYPES.join(', ')}`),

  body('value')
    .notEmpty()
    .withMessage('Incentive value is required')
    .isFloat({ min: 0 })
    .withMessage('Incentive value must be a positive number'),

  handleValidationErrors,
];

module.exports = {
  validatePackageCreation,
  validatePackageUpdate,
  validateEmployeeExists,
  validateNoOverlappingPackages,
  validateBrandIncentiveItems,
  validateBrandIncentiveAddition,
  handleValidationErrors,
};
