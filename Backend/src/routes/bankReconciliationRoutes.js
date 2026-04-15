const express = require('express');

const router = express.Router();
const bankReconciliationController = require('../controllers/bankReconciliationController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Bank Reconciliation Routes
 * All routes require authentication
 */

// Perform bank reconciliation
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  bankReconciliationController.performReconciliation,
);

// Get uncleared items for bank account
router.get(
  '/uncleared/:bankAccountId',
  authenticate,
  authorize(['admin', 'accountant']),
  bankReconciliationController.getUnclearedItems,
);

// Get reconciliation history for bank account
router.get(
  '/history/:bankAccountId',
  authenticate,
  authorize(['admin', 'accountant']),
  bankReconciliationController.getReconciliationHistory,
);

module.exports = router;
