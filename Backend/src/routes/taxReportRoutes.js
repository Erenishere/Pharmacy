const express = require('express');
const taxReportController = require('../controllers/taxReportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin/accountant role
router.use(authenticate);
router.use(authorize(['admin', 'accountant']));

// Get GST sales report
router.get('/gst-sales', taxReportController.getGSTSalesReport);

// Get GST purchase report
router.get('/gst-purchases', taxReportController.getGSTPurchaseReport);

// Get withholding tax report
router.get('/withholding-tax', taxReportController.getWHTReport);

// Get tax compliance summary
router.get('/compliance-summary', taxReportController.getTaxComplianceSummary);

module.exports = router;
