const financialReportService = require('../services/financialReportService');

/**
 * Financial Report Controller
 * Handles HTTP requests for financial reporting
 */

/**
 * Generate Profit & Loss statement
 * @route GET /api/v1/reports/financial/profit-loss
 */
const getProfitLossStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const report = await financialReportService.generateProfitLossStatement(
      new Date(startDate),
      new Date(endDate),
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Profit & Loss statement generated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate P&L error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate Balance Sheet
 * @route GET /api/v1/reports/financial/balance-sheet
 */
const getBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'As of date is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const report = await financialReportService.generateBalanceSheet(new Date(asOfDate));

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Balance sheet generated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate balance sheet error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate Cash Flow statement
 * @route GET /api/v1/reports/financial/cash-flow
 */
const getCashFlowStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const report = await financialReportService.generateCashFlowStatement(
      new Date(startDate),
      new Date(endDate),
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Cash flow statement generated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate cash flow error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate Tax Compliance Report
 * @route GET /api/v1/reports/financial/tax-compliance
 */
const getTaxComplianceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const report = await financialReportService.generateTaxComplianceReport(
      new Date(startDate),
      new Date(endDate),
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Tax compliance report generated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate tax compliance report error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate Financial Summary Dashboard
 * @route GET /api/v1/reports/financial/summary
 */
const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start date and end date are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const report = await financialReportService.generateFinancialSummary(
      new Date(startDate),
      new Date(endDate),
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Financial summary generated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate financial summary error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getProfitLossStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getTaxComplianceReport,
  getFinancialSummary,
};
