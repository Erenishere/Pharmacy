const capitalService = require('../services/capitalService');

/**
 * Capital Controller
 * Handles HTTP requests for capital asset management
 */

/**
 * Create capital entry
 * @route POST /api/v1/capital
 */
const createCapitalEntry = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const capital = await capitalService.createCapitalEntry(req.body, userId);

    return res.status(201).json({
      success: true,
      data: capital,
      message: 'Capital entry created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create capital entry error:', error);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all capital entries
 * @route GET /api/v1/capital
 */
const getCapitalEntries = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      transactionType: req.query.transactionType,
      investorAccountId: req.query.investorAccountId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const options = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await capitalService.getCapitalEntries(filters, options);

    return res.status(200).json({
      success: true,
      data: result.capitals,
      pagination: result.pagination,
      message: 'Capital entries retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get capital entries error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get capital entry by ID
 * @route GET /api/v1/capital/:id
 */
const getCapitalById = async (req, res) => {
  try {
    const capital = await capitalService.getCapitalById(req.params.id);

    return res.status(200).json({
      success: true,
      data: capital,
      message: 'Capital entry retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get capital entry error:', error);
    const statusCode = error.message === 'Capital entry not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update capital entry
 * @route PUT /api/v1/capital/:id
 */
const updateCapitalEntry = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const capital = await capitalService.updateCapitalEntry(req.params.id, req.body, userId);

    return res.status(200).json({
      success: true,
      data: capital,
      message: 'Capital entry updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update capital entry error:', error);
    const statusCode = error.message === 'Capital entry not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete capital entry
 * @route DELETE /api/v1/capital/:id
 */
const deleteCapitalEntry = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await capitalService.deleteCapitalEntry(req.params.id, userId);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Capital entry deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete capital entry error:', error);
    const statusCode = error.message === 'Capital entry not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get capital statement
 * @route GET /api/v1/capital/statement
 */
const getCapitalStatement = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    if (!asOfDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'As of date is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const statement = await capitalService.getCapitalStatement(new Date(asOfDate));

    return res.status(200).json({
      success: true,
      data: statement,
      message: 'Capital statement retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get capital statement error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createCapitalEntry,
  getCapitalEntries,
  getCapitalById,
  updateCapitalEntry,
  deleteCapitalEntry,
  getCapitalStatement,
};
