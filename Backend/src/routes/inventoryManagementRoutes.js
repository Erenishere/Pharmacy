const express = require('express');

const router = express.Router();
const inventoryManagementController = require('../controllers/inventoryManagementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stock', authorize(['admin', 'inventory', 'sales', 'accountant']), inventoryManagementController.getStock);

router.get('/stock/valuation', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getStockValuation);

router.get('/valuation', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getStockValuation);

router.get('/stock/valuation/compare', authorize(['admin', 'accountant']), inventoryManagementController.compareValuationMethods);

router.get('/stock/summary', authorize(['admin', 'inventory', 'sales', 'accountant']), inventoryManagementController.getStockSummary);

router.get('/stock/overview', authorize(['admin', 'inventory', 'sales', 'accountant']), inventoryManagementController.getStockSummary);

router.get('/stock/warehouse', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getWarehouseStockReport);

router.get('/movements', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getStockMovementReport);

// Low stock endpoint - alias for frontend compatibility
router.get('/low-stock', authorize(['admin', 'inventory', 'purchase']), inventoryManagementController.getLowStockReport);

router.post('/physical-count', authorize(['admin', 'inventory']), inventoryManagementController.createPhysicalCount);

router.get('/physical-count', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getPhysicalCounts);

router.get('/physical-count/:id', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getPhysicalCountById);

router.put('/physical-count/:id', authorize(['admin', 'inventory']), inventoryManagementController.updatePhysicalCount);

router.post('/physical-count/:id/approve', authorize(['admin', 'inventory']), inventoryManagementController.approvePhysicalCount);

router.post('/physical-count/:id/cancel', authorize(['admin', 'inventory']), inventoryManagementController.cancelPhysicalCount);

router.get('/reports/variance', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getVarianceReport);

router.get('/reports/discrepancies', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getDiscrepancyItems);

router.get('/reports/fast-moving', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getFastMovingItems);

router.get('/reports/slow-moving', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getSlowMovingItems);

router.get('/reports/dead-stock', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getDeadStockReport);

router.get('/reports/aging', authorize(['admin', 'inventory', 'accountant']), inventoryManagementController.getStockAgingReport);

router.get('/reports/turnover', authorize(['admin', 'accountant']), inventoryManagementController.getInventoryTurnover);

router.get('/reports/low-stock', authorize(['admin', 'inventory', 'purchase']), inventoryManagementController.getLowStockReport);

router.get('/reports/reorder-suggestions', authorize(['admin', 'inventory', 'purchase']), inventoryManagementController.getReorderSuggestions);

router.get('/reports/stockout-history', authorize(['admin', 'inventory']), inventoryManagementController.getStockoutHistory);

// Stock Transfer Routes
router.post('/transfer', authorize(['admin', 'inventory']), inventoryManagementController.createTransfer);
router.get('/transfers', authorize(['admin', 'inventory', 'sales']), inventoryManagementController.getTransfers);
router.get('/transfer/:id', authorize(['admin', 'inventory']), inventoryManagementController.getTransferById);
router.patch('/transfer/:id/status', authorize(['admin', 'inventory']), inventoryManagementController.updateTransferStatus);
router.post('/transfer/:id/receive', authorize(['admin', 'inventory']), inventoryManagementController.receiveTransfer);
router.post('/transfer/:id/cancel', authorize(['admin', 'inventory']), inventoryManagementController.cancelTransfer);

// Stock Adjustment Routes
router.post('/adjustment', authorize(['admin', 'inventory', 'manager']), inventoryManagementController.createAdjustment);
router.get('/adjustments', authorize(['admin', 'inventory', 'manager', 'accountant']), inventoryManagementController.getAdjustments);
router.get('/adjustment/:id', authorize(['admin', 'inventory', 'manager']), inventoryManagementController.getAdjustmentById);
router.patch('/adjustment/:id/approve', authorize(['admin', 'manager']), inventoryManagementController.approveAdjustment);
router.patch('/adjustment/:id/reject', authorize(['admin', 'manager']), inventoryManagementController.rejectAdjustment);
router.get('/adjustments/pending', authorize(['admin', 'manager']), inventoryManagementController.getPendingAdjustments);

module.exports = router;
