const express = require('express');
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth.authenticate);

router
  .route('/')
  .get(categoryController.getAllCategories)
  .post(auth.authorize(['admin', 'manager']), categoryController.createCategory);

router
  .route('/:id')
  .get(categoryController.getCategoryById)
  .put(auth.authorize(['admin', 'manager']), categoryController.updateCategory)
  .delete(auth.authorize(['admin']), categoryController.deleteCategory);

router.patch('/:id/status', auth.authorize(['admin', 'manager']), categoryController.toggleCategoryStatus);

module.exports = router;
