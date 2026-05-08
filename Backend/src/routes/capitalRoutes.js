const express = require('express');

const router = express.Router();
const capitalController = require('../controllers/capitalController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Capital Routes
 * All routes require authentication and admin/accountant role
 */

// Create capital entry
router.post(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.createCapitalEntry,
);

// Get all capital entries
router.get(
  '/',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.getCapitalEntries,
);

// Get capital statement
router.get(
  '/statement',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.getCapitalStatement,
);

// Get capital entry by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.getCapitalById,
);

// Update capital entry
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.updateCapitalEntry,
);

// Delete capital entry
router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'accountant']),
  capitalController.deleteCapitalEntry,
);

module.exports = router;
