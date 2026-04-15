const express = require('express');

const router = express.Router();
const cashReceiptController = require('../controllers/cashReceiptController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Post-Dated Cheque (PDC) Routes
 * All routes require authentication
 */

// Get pending PDCs
router.get(
  '/pending',
  authenticate,
  authorize(['admin', 'accountant']),
  cashReceiptController.getPendingPDCs,
);

// Clear PDC
router.patch(
  '/:id/clear',
  authenticate,
  authorize(['admin', 'accountant']),
  cashReceiptController.clearPDC,
);

// Bounce PDC
router.patch(
  '/:id/bounce',
  authenticate,
  authorize(['admin', 'accountant']),
  cashReceiptController.bouncePDC,
);

module.exports = router;
