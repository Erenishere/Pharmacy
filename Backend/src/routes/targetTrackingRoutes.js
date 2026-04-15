const express = require('express');

const router = express.Router();
const targetTrackingController = require('../controllers/targetTrackingController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/v1/targets/achievement/:employeeId
 * @desc    Get target achievement for specific employee
 * @access  Private (Admin, HR, Manager)
 * @query   month (required) - Month name (e.g., 'January')
 * @query   year (required) - Year (e.g., 2025)
 */
router.get(
  '/achievement/:employeeId',
  authenticate,
  authorize(['admin', 'hr', 'manager']),
  targetTrackingController.getEmployeeTargets,
);

/**
 * @route   GET /api/v1/targets/dashboard
 * @desc    Get target achievement dashboard for all employees
 * @access  Private (Admin, HR, Manager)
 * @query   month (required) - Month name (e.g., 'January')
 * @query   year (required) - Year (e.g., 2025)
 * @query   page (optional) - Page number for pagination (default: 1)
 * @query   limit (optional) - Records per page (default: 50)
 */
router.get(
  '/dashboard',
  authenticate,
  authorize(['admin', 'hr', 'manager']),
  targetTrackingController.getTargetDashboard,
);

module.exports = router;
