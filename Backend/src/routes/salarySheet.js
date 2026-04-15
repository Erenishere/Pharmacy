const express = require('express');
const router = express.Router();
const salarySheetController = require('../controllers/salarySheetController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create new salary sheet
router.post('/', authorize(['admin', 'manager', 'hr']), salarySheetController.create);

// Get all salary sheets (with pagination)
router.get('/', salarySheetController.getAll);

// Get employee basic pay (auto-populate)
router.get('/employee-basic-pay/:employeeId', salarySheetController.getEmployeeBasicPay);

// Get salary sheets by dimension
router.get('/by-dimension/:dimensionId', salarySheetController.getByDimension);

// Get salary sheets by period
router.get('/by-period/:month/:year', salarySheetController.getByPeriod);

// Get employee salary history
router.get('/employee-history/:employeeId', salarySheetController.getEmployeeHistory);

// Get salary sheet by ID
router.get('/:id', salarySheetController.getById);

// Update salary sheet
router.put('/:id', authorize(['admin', 'manager', 'hr']), salarySheetController.update);

// Update salary sheet status
router.patch('/:id/status', authorize(['admin', 'manager', 'hr']), salarySheetController.updateStatus);

// Delete salary sheet
router.delete('/:id', authorize(['admin', 'manager']), salarySheetController.delete);

module.exports = router;
