const taxReportService = require('../services/taxReportService');

/**
 * Tax Report Controller
 * Handles HTTP requests for tax reports
 */
class TaxReportController {
  /**
   * Get GST sales report
   */
  async getGSTSalesReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await taxReportService.getGSTSalesReport(
        new Date(startDate),
        new Date(endDate),
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating GST sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate GST sales report',
        error: error.message,
      });
    }
  }

  /**
   * Get GST purchase report
   */
  async getGSTPurchaseReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await taxReportService.getGSTPurchaseReport(
        new Date(startDate),
        new Date(endDate),
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating GST purchase report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate GST purchase report',
        error: error.message,
      });
    }
  }

  /**
   * Get withholding tax report
   */
  async getWHTReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await taxReportService.getWHTReport(
        new Date(startDate),
        new Date(endDate),
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating WHT report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate WHT report',
        error: error.message,
      });
    }
  }

  /**
   * Get tax compliance summary
   */
  async getTaxComplianceSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await taxReportService.getTaxComplianceSummary(
        new Date(startDate),
        new Date(endDate),
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating tax compliance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate tax compliance summary',
        error: error.message,
      });
    }
  }
}

module.exports = new TaxReportController();
