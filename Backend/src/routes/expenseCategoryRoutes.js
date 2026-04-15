const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize(['admin', 'accountant']), expenseCategoryController.createCategory);
router.get('/', authenticate, authorize(['admin', 'accountant', 'manager']), expenseCategoryController.getCategories);
router.get('/:id', authenticate, authorize(['admin', 'accountant', 'manager']), expenseCategoryController.getCategoryById);
router.put('/:id', authenticate, authorize(['admin', 'accountant']), expenseCategoryController.updateCategory);
router.delete('/:id', authenticate, authorize(['admin']), expenseCategoryController.deleteCategory);

module.exports = router;
