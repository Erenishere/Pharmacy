const express = require('express');

const router = express.Router();
const cashAdjustmentController = require('../controllers/cashAdjustmentController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Cash Adjustment Routes
 * All routes require authentication
 */

// Create cash adjustment
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  cashAdjustmentController.createAdjustment,
);

// Get all cash adjustments
router.get(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  cashAdjustmentController.getAdjustments,
);

// Get cash adjustment by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant']),
  cashAdjustmentController.getAdjustmentById,
);

module.exports = router;
