const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize(['admin', 'accountant', 'manager']), expenseController.createExpense);
router.get('/', authenticate, authorize(['admin', 'accountant', 'manager']), expenseController.getExpenses);
router.get('/:id', authenticate, authorize(['admin', 'accountant', 'manager']), expenseController.getExpenseById);
router.put('/:id', authenticate, authorize(['admin', 'accountant', 'manager']), expenseController.updateExpense);
router.delete('/:id', authenticate, authorize(['admin', 'accountant']), expenseController.deleteExpense);

module.exports = router;
