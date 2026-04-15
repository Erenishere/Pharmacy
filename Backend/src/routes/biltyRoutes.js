const express = require('express');

const router = express.Router();
const biltyController = require('../controllers/biltyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

/**
 * Bilty Routes
 * All routes require authentication
 */

// Record bilty information
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.recordBilty,
);

// Get all bilties
router.get(
  '/',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.getAllBilties,
);

// Get pending bilties
router.get(
  '/pending',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.getPendingBilties,
);

// Get bilty details by invoice ID
router.get(
  '/:invoiceId',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.getBiltyDetails,
);

// Update bilty status
router.patch(
  '/:invoiceId/status',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.updateBiltyStatus,
);

// Mark bilty as received
router.patch(
  '/:invoiceId/received',
  authenticate,
  authorize(['admin', 'accountant', 'purchase']),
  biltyController.markBiltyAsReceived,
);

module.exports = router;
