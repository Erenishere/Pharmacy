const express = require('express');

const router = express.Router();
const financialReportController = require('../controllers/financialReportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * Financial Report Routes
 * All routes require authentication and admin/accountant role
 */

// Profit & Loss statement
router.get(
  '/profit-loss',
  authenticate,
  authorize(['admin', 'accountant']),
  financialReportController.getProfitLossStatement,
);

// Balance Sheet
router.get(
  '/balance-sheet',
  authenticate,
  authorize(['admin', 'accountant']),
  financialReportController.getBalanceSheet,
);

// Cash Flow statement
router.get(
  '/cash-flow',
  authenticate,
  authorize(['admin', 'accountant']),
  financialReportController.getCashFlowStatement,
);

// Tax Compliance Report
router.get(
  '/tax-compliance',
  authenticate,
  authorize(['admin', 'accountant']),
  financialReportController.getTaxComplianceReport,
);

// Financial Summary Dashboard
router.get(
  '/summary',
  authenticate,
  authorize(['admin', 'accountant']),
  financialReportController.getFinancialSummary,
);

module.exports = router;
