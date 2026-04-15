const express = require('express');

const router = express.Router();
const salesReportController = require('../controllers/salesReportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesSummary);

router.get('/by-customer', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesByCustomer);

router.get('/by-item', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesByItem);

router.get('/by-salesman', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesBySalesman);

router.get('/by-route', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesByRoute);

router.get('/by-category', authorize('admin', 'sales', 'accountant'), salesReportController.getSalesByCategory);

router.get('/gst-summary', authorize('admin', 'accountant'), salesReportController.getGSTSummary);

router.get('/scheme-analysis', authorize('admin', 'accountant'), salesReportController.getSchemeAnalysis);

router.get('/daily-trend', authorize('admin', 'sales', 'accountant'), salesReportController.getDailySalesTrend);

router.get('/profit-analysis', authorize('admin', 'accountant'), salesReportController.getProfitAnalysis);

// Export report endpoint
router.post('/export', authorize('admin', 'sales', 'accountant'), salesReportController.exportReport);

module.exports = router;
