const stockReconciliationService = require('../services/stockReconciliationService');

/**
 * Stock Reconciliation Controller
 * Handles HTTP requests for stock reconciliation and data integrity operations
 */
class StockReconciliationController {
  /**
   * Run stock reconciliation analysis
   * Compares stock values across all tracking mechanisms
   */
  async runReconciliation(req, res, next) {
    try {
      const { autoFix, itemId, warehouseId } = req.query;

      const options = {
        autoFix: autoFix === 'true',
        itemId,
        warehouseId,
      };

      const report = await stockReconciliationService.runReconciliation(options);

      res.status(200).json({
        success: true,
        message: `Reconciliation completed. Found ${report.discrepanciesFound} discrepancies.`,
        data: report,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock health summary
   * Quick health check for stock data integrity
   */
  async getStockHealth(req, res, next) {
    try {
      const summary = await stockReconciliationService.getStockHealthSummary();

      res.status(200).json({
        success: true,
        data: summary,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync all Item.inventory.currentStock from Inventory collection
   * Use after bulk imports or data migrations
   */
  async syncAllItemStocks(req, res, next) {
    try {
      const { dryRun } = req.query;

      const options = {
        dryRun: dryRun !== 'false', // Default to dry run for safety
      };

      const report = await stockReconciliationService.syncAllItemStocks(options);

      res.status(200).json({
        success: true,
        message: options.dryRun
          ? `Dry run completed. ${report.itemsUpdated} items would be updated.`
          : `Sync completed. ${report.itemsUpdated} items updated.`,
        data: report,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Migrate orphaned stock from Item model to Inventory collection
   * Creates Inventory records for items that have stock but no warehouse assignment
   */
  async migrateOrphanedStock(req, res, next) {
    try {
      const { defaultWarehouseId, dryRun } = req.body;

      if (!defaultWarehouseId) {
        return res.status(400).json({
          success: false,
          message: 'Default warehouse ID is required',
        });
      }

      const options = {
        dryRun: dryRun !== false, // Default to dry run for safety
      };

      const report = await stockReconciliationService.migrateOrphanedStock(
        defaultWarehouseId,
        options,
      );

      res.status(200).json({
        success: true,
        message: options.dryRun
          ? `Dry run completed. ${report.recordsCreated} records would be created.`
          : `Migration completed. ${report.recordsCreated} records created.`,
        data: report,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fix a single item's stock discrepancy
   * Syncs Item.inventory.currentStock from Inventory collection for specific item
   */
  async fixItemStock(req, res, next) {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
      }

      // Run reconciliation for single item with autoFix
      const report = await stockReconciliationService.runReconciliation({
        autoFix: true,
        itemId,
      });

      const itemReport = report.details[0];

      res.status(200).json({
        success: true,
        message: itemReport?.fixed
          ? `Stock for item ${itemId} fixed successfully`
          : itemReport?.hasDiscrepancy
            ? 'Discrepancy found but could not be fixed'
            : 'No discrepancy found for this item',
        data: itemReport || { itemId, hasDiscrepancy: false },
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reconciliation status for a specific item
   */
  async getItemReconciliationStatus(req, res, next) {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
      }

      const report = await stockReconciliationService.runReconciliation({
        autoFix: false,
        itemId,
      });

      const itemReport = report.details[0];

      res.status(200).json({
        success: true,
        data: itemReport || {
          itemId,
          hasDiscrepancy: false,
          message: 'No discrepancy found',
        },
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockReconciliationController();
