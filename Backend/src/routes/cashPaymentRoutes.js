const express = require('express');

const router = express.Router();
const cashPaymentController = require('../controllers/cashPaymentController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Cash Payment Routes
 * All routes require authentication
 */

// Create cash payment
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  cashPaymentController.createPayment,
);

// Get all cash payments
router.get(
  '/',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  cashPaymentController.getPayments,
);

// Get cash payment by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  cashPaymentController.getPaymentById,
);

// Get outstanding invoices for supplier
router.get(
  '/supplier/:supplierId/outstanding-invoices',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  cashPaymentController.getOutstandingInvoices,
);

module.exports = router;
