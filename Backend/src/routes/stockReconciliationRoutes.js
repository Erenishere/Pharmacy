const express = require('express');
const stockReconciliationController = require('../controllers/stockReconciliationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All stock reconciliation routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/stock-reconciliation/health
 * @desc    Get stock health summary - quick integrity check
 * @access  Private
 */
router.get('/health', stockReconciliationController.getStockHealth);

/**
 * @route   GET /api/v1/stock-reconciliation/run
 * @desc    Run full stock reconciliation analysis
 * @access  Private (Admin only)
 * @query   autoFix (optional, default: false) - automatically fix discrepancies
 * @query   itemId (optional) - limit to specific item
 * @query   warehouseId (optional) - limit to specific warehouse
 */
router.get(
  '/run',
  authorize(['admin', 'manager']),
  stockReconciliationController.runReconciliation,
);

/**
 * @route   GET /api/v1/stock-reconciliation/item/:itemId
 * @desc    Get reconciliation status for a specific item
 * @access  Private
 */
router.get('/item/:itemId', stockReconciliationController.getItemReconciliationStatus);

/**
 * @route   POST /api/v1/stock-reconciliation/item/:itemId/fix
 * @desc    Fix stock discrepancy for a specific item
 * @access  Private (Admin only)
 */
router.post(
  '/item/:itemId/fix',
  authorize(['admin', 'manager']),
  stockReconciliationController.fixItemStock,
);

/**
 * @route   POST /api/v1/stock-reconciliation/sync-all
 * @desc    Sync all Item.inventory.currentStock from Inventory collection
 * @access  Private (Admin only)
 * @query   dryRun (optional, default: true) - only report, don't make changes
 */
router.post(
  '/sync-all',
  authorize(['admin']),
  stockReconciliationController.syncAllItemStocks,
);

/**
 * @route   POST /api/v1/stock-reconciliation/migrate-orphaned
 * @desc    Migrate orphaned stock from Item model to Inventory collection
 * @access  Private (Admin only)
 * @body    defaultWarehouseId (required) - warehouse to assign orphaned stock
 * @body    dryRun (optional, default: true) - only report, don't make changes
 */
router.post(
  '/migrate-orphaned',
  authorize(['admin']),
  stockReconciliationController.migrateOrphanedStock,
);

module.exports = router;
