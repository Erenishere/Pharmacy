const express = require('express');

const router = express.Router();
const cashBookController = require('../controllers/cashBookController');
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
  cashBookController.getPendingCheques,
);

// Clear PDC
router.patch(
  '/:id/clear',
  authenticate,
  authorize(['admin', 'accountant']),
  cashBookController.clearCheque,
);

// Bounce PDC
router.patch(
  '/:id/bounce',
  authenticate,
  authorize(['admin', 'accountant']),
  cashBookController.bounceCheque,
);

module.exports = router;
