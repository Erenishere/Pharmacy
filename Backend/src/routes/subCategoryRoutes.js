const express = require('express');
const subCategoryController = require('../controllers/subCategoryController');
const auth = require('../middleware/auth');
const { cacheMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const subCategoriesByCategoryCache = cacheMiddleware({
  duration: 'long',
  keyGenerator: (req) => `subcategories:category:${req.params.categoryId}`,
});
const clearSubCategoryLookupCache = clearCacheMiddleware(['subcategories:category:']);
router.use(auth.authenticate);

router.route('/').get(subCategoryController.getAllSubCategories).post(auth.authorize(['admin', 'manager']), clearSubCategoryLookupCache, subCategoryController.createSubCategory);
router.get('/category/:categoryId', subCategoriesByCategoryCache, subCategoryController.getSubCategoriesByCategory);
router.route('/:id').get(subCategoryController.getSubCategoryById).put(auth.authorize(['admin', 'manager']), clearSubCategoryLookupCache, subCategoryController.updateSubCategory).delete(auth.authorize(['admin']), clearSubCategoryLookupCache, subCategoryController.deleteSubCategory);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearSubCategoryLookupCache, subCategoryController.toggleSubCategoryStatus);

module.exports = router;
