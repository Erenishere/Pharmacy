const express = require('express');
const inventoryReportController = require('../controllers/inventoryReportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get stock level report
router.get('/stock-level', authorize(['admin', 'accountant', 'manager']), inventoryReportController.getStockLevelReport);

// Get stock movement report
router.get('/stock-movement', authorize(['admin', 'accountant', 'manager']), inventoryReportController.getStockMovementReport);

// Get batch expiry report
router.get('/batch-expiry', authorize(['admin', 'accountant', 'manager']), inventoryReportController.getBatchExpiryReport);

// Get stock valuation report
router.get('/stock-valuation', authorize(['admin', 'accountant']), inventoryReportController.getStockValuationReport);

// Get ABC analysis report
router.get('/abc-analysis', authorize(['admin', 'accountant', 'manager']), inventoryReportController.getABCAnalysisReport);

// Get slow-moving items report
router.get('/slow-moving', authorize(['admin', 'accountant', 'manager']), inventoryReportController.getSlowMovingItemsReport);

module.exports = router;
