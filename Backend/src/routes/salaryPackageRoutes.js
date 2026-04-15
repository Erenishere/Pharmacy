const express = require('express');

const router = express.Router();
const salaryPackageController = require('../controllers/salaryPackageController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validatePackageCreation,
  validatePackageUpdate,
  validateEmployeeExists,
  validateNoOverlappingPackages,
  validateBrandIncentiveItems,
  validateBrandIncentiveAddition,
} = require('../middleware/salaryPackageValidation');

/**
 * Salary Package Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/salary-packages
 * @desc    Create salary package
 * @access  Private (admin, hr)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'hr']),
  validatePackageCreation,
  validateEmployeeExists,
  validateNoOverlappingPackages,
  validateBrandIncentiveItems,
  salaryPackageController.createPackage,
);

/**
 * @route   GET /api/v1/salary-packages
 * @desc    Get all salary packages with filters
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  salaryPackageController.getAllPackages,
);

/**
 * @route   GET /api/v1/salary-packages/employee/:employeeId
 * @desc    Get salary packages by employee ID
 * @access  Private
 */
router.get(
  '/employee/:employeeId',
  authenticate,
  salaryPackageController.getPackagesByEmployee,
);

/**
 * @route   GET /api/v1/salary-packages/:id
 * @desc    Get salary package by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  salaryPackageController.getPackageById,
);

/**
 * @route   PUT /api/v1/salary-packages/:id
 * @desc    Update salary package
 * @access  Private (admin, hr)
 */
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'hr']),
  validatePackageUpdate,
  validateNoOverlappingPackages,
  validateBrandIncentiveItems,
  salaryPackageController.updatePackage,
);

/**
 * @route   DELETE /api/v1/salary-packages/:id
 * @desc    Delete salary package
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  salaryPackageController.deletePackage,
);

/**
 * @route   POST /api/v1/salary-packages/:id/brand-incentives
 * @desc    Add brand incentive to salary package
 * @access  Private (admin, hr)
 */
router.post(
  '/:id/brand-incentives',
  authenticate,
  authorize(['admin', 'hr']),
  validateBrandIncentiveAddition,
  salaryPackageController.addBrandIncentive,
);

/**
 * @route   DELETE /api/v1/salary-packages/:id/brand-incentives/:incentiveId
 * @desc    Remove brand incentive from salary package
 * @access  Private (admin, hr)
 */
router.delete(
  '/:id/brand-incentives/:incentiveId',
  authenticate,
  authorize(['admin', 'hr']),
  salaryPackageController.removeBrandIncentive,
);

module.exports = router;
