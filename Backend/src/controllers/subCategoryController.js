const subCategoryService = require('../services/subCategoryService');

const createSubCategory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const subCategory = await subCategoryService.createSubCategory(req.body, userId);
    return res.status(201).json({
      success: true, data: subCategory, message: 'Sub-category created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create sub-category error:', error);
    if (error.message.includes('required') || error.message.includes('already exists') || error.message.includes('Invalid')) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create sub-category' }, timestamp: new Date().toISOString() });
  }
};

const getAllSubCategories = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive, categoryId,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }), ...(categoryId && { categoryId }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await subCategoryService.getSubCategories(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.subCategories, pagination: result.pagination, message: 'Sub-categories retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all sub-categories error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve sub-categories' }, timestamp: new Date().toISOString() });
  }
};

const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await subCategoryService.getSubCategoryById(req.params.id);
    return res.status(200).json({
      success: true, data: subCategory, message: 'Sub-category retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sub-category by ID error:', error);
    if (error.message === 'Sub-category not found') {
      return res.status(404).json({ success: false, error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Sub-category not found' }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve sub-category' }, timestamp: new Date().toISOString() });
  }
};

const getSubCategoriesByCategory = async (req, res) => {
  try {
    const subCategories = await subCategoryService.getSubCategoriesByCategory(req.params.categoryId);
    return res.status(200).json({
      success: true, data: subCategories, count: subCategories.length, message: 'Sub-categories retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sub-categories by category error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve sub-categories' }, timestamp: new Date().toISOString() });
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const subCategory = await subCategoryService.updateSubCategory(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: subCategory, message: 'Sub-category updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update sub-category error:', error);
    if (error.message === 'Sub-category not found') {
      return res.status(404).json({ success: false, error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Sub-category not found' }, timestamp: new Date().toISOString() });
    }
    if (error.message.includes('already exists') || error.message.includes('Invalid')) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update sub-category' }, timestamp: new Date().toISOString() });
  }
};

const deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await subCategoryService.deleteSubCategory(req.params.id);
    return res.status(200).json({
      success: true, data: subCategory, message: 'Sub-category deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete sub-category error:', error);
    if (error.message === 'Sub-category not found') {
      return res.status(404).json({ success: false, error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Sub-category not found' }, timestamp: new Date().toISOString() });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ success: false, error: { code: 'SUBCATEGORY_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete sub-category' }, timestamp: new Date().toISOString() });
  }
};

const toggleSubCategoryStatus = async (req, res) => {
  try {
    const subCategory = await subCategoryService.toggleSubCategoryStatus(req.params.id);
    return res.status(200).json({
      success: true, data: subCategory, message: `Sub-category ${subCategory.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle sub-category status error:', error);
    if (error.message === 'Sub-category not found') {
      return res.status(404).json({ success: false, error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Sub-category not found' }, timestamp: new Date().toISOString() });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle sub-category status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createSubCategory, getAllSubCategories, getSubCategoryById, getSubCategoriesByCategory, updateSubCategory, deleteSubCategory, toggleSubCategoryStatus,
};
