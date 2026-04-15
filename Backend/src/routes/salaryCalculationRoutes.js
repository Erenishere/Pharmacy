const express = require('express');

const router = express.Router();
const salaryCalculationController = require('../controllers/salaryCalculationController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Salary Calculation Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/salary/calculate
 * @desc    Calculate salary for a specific month
 * @access  Private (admin, hr)
 */
router.post(
  '/calculate',
  authenticate,
  authorize(['admin', 'hr']),
  salaryCalculationController.calculateSalary,
);

/**
 * @route   GET /api/v1/salary/sheet/:employeeId
 * @desc    Get salary sheet for an employee
 * @access  Private
 */
router.get(
  '/sheet/:employeeId',
  authenticate,
  salaryCalculationController.getSalarySheet,
);

/**
 * @route   GET /api/v1/salary/calculations
 * @desc    List all salary calculations with filters
 * @access  Private
 */
router.get(
  '/calculations',
  authenticate,
  salaryCalculationController.getAllCalculations,
);

module.exports = router;
