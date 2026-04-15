const expenseService = require('../services/expenseService');

const createExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const expense = await expenseService.createExpense(req.body, userId);
    return res.status(201).json({
      success: true, data: expense, message: 'Expense created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getExpenses = async (req, res) => {
  try {
    const filters = {
      categoryId: req.query.categoryId,
      dimensionId: req.query.dimensionId,
      accountId: req.query.accountId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };
    const options = { page: req.query.page, limit: req.query.limit };
    const result = await expenseService.getExpenses(filters, options);
    return res.status(200).json({
      success: true, data: result.expenses, pagination: result.pagination, message: 'Expenses retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    return res.status(200).json({
      success: true, data: expense, message: 'Expense retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const expense = await expenseService.updateExpense(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: expense, message: 'Expense updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const result = await expenseService.deleteExpense(req.params.id);
    return res.status(200).json({
      success: true, data: result, message: 'Expense deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Expense not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense };
