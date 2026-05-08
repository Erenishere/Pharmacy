const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const salesReturnController = require('../controllers/salesReturnController');

// All routes require authentication
router.use(authenticate);

// List all sales returns (paginated)
router.get('/', salesReturnController.getAllReturns);

// Create a new sales return
router.post('/', salesReturnController.createSalesReturn);

// Get all returns for a specific original invoice
router.get('/invoice/:invoiceId', salesReturnController.getReturnsForInvoice);

// Get return statistics for an invoice
router.get('/invoice/:invoiceId/statistics', salesReturnController.getReturnStatistics);

// Get a single return by ID
router.get('/:id', salesReturnController.getReturnById);

// Process (confirm) a draft return
router.patch('/:id/process', salesReturnController.processReturn);

// Generate credit note for a confirmed return
router.get('/:id/credit-note', salesReturnController.getCreditNote);

module.exports = router;
