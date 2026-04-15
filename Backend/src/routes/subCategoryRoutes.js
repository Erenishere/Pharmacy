const express = require('express');
const subCategoryController = require('../controllers/subCategoryController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(subCategoryController.getAllSubCategories).post(auth.authorize(['admin', 'manager']), subCategoryController.createSubCategory);
router.get('/category/:categoryId', subCategoryController.getSubCategoriesByCategory);
router.route('/:id').get(subCategoryController.getSubCategoryById).put(auth.authorize(['admin', 'manager']), subCategoryController.updateSubCategory).delete(auth.authorize(['admin']), subCategoryController.deleteSubCategory);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), subCategoryController.toggleSubCategoryStatus);

module.exports = router;
