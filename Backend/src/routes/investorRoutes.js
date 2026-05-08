const express = require('express');
const investorController = require('../controllers/investorController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create investor account (admin, accountant only)
router.post('/', authorize(['admin', 'accountant']), investorController.createInvestor);

// Get all investors
router.get('/', authorize(['admin', 'accountant']), investorController.getAllInvestors);

// Get investor by ID
router.get('/:id', authorize(['admin', 'accountant']), investorController.getInvestorById);

// Update investor account
router.put('/:id', authorize(['admin', 'accountant']), investorController.updateInvestor);

// Delete investor account
router.delete('/:id', authorize(['admin']), investorController.deleteInvestor);

// Get investor statement
router.get('/:id/statement', authorize(['admin', 'accountant']), investorController.getInvestorStatement);

module.exports = router;
