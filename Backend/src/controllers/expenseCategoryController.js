const expenseCategoryService = require('../services/expenseCategoryService');

const createCategory = async (req, res) => {
  try {
    const category = await expenseCategoryService.createCategory(req.body);
    return res.status(201).json({
      success: true, data: category, message: 'Expense category created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await expenseCategoryService.getCategories({ status: req.query.status });
    return res.status(200).json({
      success: true, data: categories, message: 'Expense categories retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await expenseCategoryService.getCategoryById(req.params.id);
    return res.status(200).json({
      success: true, data: category, message: 'Expense category retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense category not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await expenseCategoryService.updateCategory(req.params.id, req.body);
    return res.status(200).json({
      success: true, data: category, message: 'Expense category updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense category not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const result = await expenseCategoryService.deleteCategory(req.params.id);
    return res.status(200).json({
      success: true, data: result, message: 'Expense category deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense category not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory };
