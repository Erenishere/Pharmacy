const express = require('express');
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const clearItemRegistrationLookupsCache = clearCacheMiddleware(['items:registration-lookups']);

router.use(auth.authenticate);

router
  .route('/')
  .get(categoryController.getAllCategories)
  .post(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, categoryController.createCategory);

router
  .route('/:id')
  .get(categoryController.getCategoryById)
  .put(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, categoryController.updateCategory)
  .delete(auth.authorize(['admin']), clearItemRegistrationLookupsCache, categoryController.deleteCategory);

router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, categoryController.toggleCategoryStatus);

module.exports = router;
