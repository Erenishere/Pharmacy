const categoryService = require('../services/categoryService');

const createCategory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const category = await categoryService.createCategory(req.body, userId);
    return res.status(201).json({
      success: true, data: category, message: 'Category created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.message.includes('required') || error.message.includes('already exists') || error.message.includes('Invalid')) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create category' }, timestamp: new Date().toISOString() });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive, parentCategoryId, hierarchy,
    } = req.query;

    if (hierarchy === 'true') {
      const hierarchyData = await categoryService.getCategoryHierarchy();
      return res.status(200).json({
        success: true, data: hierarchyData, message: 'Category hierarchy retrieved successfully', timestamp: new Date().toISOString(),
      });
    }

    const filters = {
      ...(keyword && { keyword }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(parentCategoryId !== undefined && { parentCategoryId: parentCategoryId === 'null' ? null : parentCategoryId }),
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await categoryService.getCategories(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true, data: result.categories, pagination: result.pagination, message: 'Categories retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve categories' }, timestamp: new Date().toISOString() });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return res.status(200).json({
      success: true, data: category, message: 'Category retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve category' }, timestamp: new Date().toISOString() });
  }
};

const updateCategory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const category = await categoryService.updateCategory(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: category, message: 'Category updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update category error:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }, timestamp: new Date().toISOString() });
    }
    if (error.message.includes('already exists')) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update category' }, timestamp: new Date().toISOString() });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    return res.status(200).json({
      success: true, data: category, message: 'Category deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete category error:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }, timestamp: new Date().toISOString() });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ success: false, error: { code: 'CATEGORY_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete category' }, timestamp: new Date().toISOString() });
  }
};

const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await categoryService.toggleCategoryStatus(req.params.id);
    return res.status(200).json({
      success: true, data: category, message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle category status error:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle category status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory, toggleCategoryStatus,
};
