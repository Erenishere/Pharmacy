const express = require('express');

const router = express.Router();
const cashReceiptController = require('../controllers/cashReceiptController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Cash Receipt Routes
 * All routes require authentication
 */

// Create cash receipt
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  cashReceiptController.createReceipt,
);

// Get all cash receipts
router.get(
  '/',
  authenticate,
  authorize(['admin', 'accountant', 'sales']),
  cashReceiptController.getReceipts,
);

// Get cash receipt by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant', 'sales']),
  cashReceiptController.getReceiptById,
);

// Get outstanding invoices for customer
router.get(
  '/customer/:customerId/outstanding-invoices',
  authenticate,
  authorize(['admin', 'accountant', 'sales']),
  cashReceiptController.getOutstandingInvoices,
);

module.exports = router;
