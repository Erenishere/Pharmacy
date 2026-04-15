const inventoryReportService = require('../services/inventoryReportService');

/**
 * Inventory Report Controller
 * Handles HTTP requests for inventory reports
 */
class InventoryReportController {
  /**
   * Get stock level report
   */
  async getStockLevelReport(req, res) {
    try {
      const { warehouseId, itemId, lowStockOnly } = req.query;

      const filters = {};
      if (warehouseId) filters.warehouseId = warehouseId;
      if (itemId) filters.itemId = itemId;
      if (lowStockOnly === 'true') filters.lowStockOnly = true;

      const report = await inventoryReportService.getStockLevelReport(filters);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating stock level report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate stock level report',
        error: error.message,
      });
    }
  }

  /**
   * Get stock movement report
   */
  async getStockMovementReport(req, res) {
    try {
      const {
        startDate, endDate, warehouseId, itemId, movementType,
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const filters = {};
      if (warehouseId) filters.warehouseId = warehouseId;
      if (itemId) filters.itemId = itemId;
      if (movementType) filters.movementType = movementType;

      const report = await inventoryReportService.getStockMovementReport(
        new Date(startDate),
        new Date(endDate),
        filters,
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating stock movement report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate stock movement report',
        error: error.message,
      });
    }
  }

  /**
   * Get batch expiry report
   */
  async getBatchExpiryReport(req, res) {
    try {
      const { daysAhead = 90 } = req.query;

      const report = await inventoryReportService.getBatchExpiryReport(parseInt(daysAhead));

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating batch expiry report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate batch expiry report',
        error: error.message,
      });
    }
  }

  /**
   * Get stock valuation report
   */
  async getStockValuationReport(req, res) {
    try {
      const { asOfDate, method = 'WAC' } = req.query;

      const report = await inventoryReportService.getStockValuationReport(
        asOfDate ? new Date(asOfDate) : new Date(),
        method,
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating stock valuation report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate stock valuation report',
        error: error.message,
      });
    }
  }

  /**
   * Get ABC analysis report
   */
  async getABCAnalysisReport(req, res) {
    try {
      const report = await inventoryReportService.getABCAnalysisReport();

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating ABC analysis report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate ABC analysis report',
        error: error.message,
      });
    }
  }

  /**
   * Get slow-moving items report
   */
  async getSlowMovingItemsReport(req, res) {
    try {
      const { days = 90 } = req.query;

      const report = await inventoryReportService.getSlowMovingItemsReport(parseInt(days));

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating slow-moving items report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate slow-moving items report',
        error: error.message,
      });
    }
  }
}

module.exports = new InventoryReportController();
