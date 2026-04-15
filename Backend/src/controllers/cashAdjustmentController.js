const cashAdjustmentService = require('../services/cashAdjustmentService');

/**
 * Cash Adjustment Controller
 * Handles HTTP requests for cash adjustment management
 */

/**
 * Create cash adjustment
 * @route POST /api/v1/cash-adjustments
 */
const createAdjustment = async (req, res) => {
  try {
    const adjustmentData = {
      ...req.body,
    };

    const adjustment = await cashAdjustmentService.createAdjustment(adjustmentData, req.user._id);

    return res.status(201).json({
      success: true,
      data: adjustment,
      message: 'Cash adjustment created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create cash adjustment error:', error);
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
 * Get all cash adjustments
 * @route GET /api/v1/cash-adjustments
 */
const getAdjustments = async (req, res) => {
  try {
    const filters = {
      adjustmentType: req.query.adjustmentType,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort: req.query.sort || '-adjustmentDate',
    };

    const result = await cashAdjustmentService.getAdjustments(filters, options);

    return res.status(200).json({
      success: true,
      data: result.adjustments,
      pagination: result.pagination,
      message: 'Cash adjustments retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash adjustments error:', error);
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
 * Get cash adjustment by ID
 * @route GET /api/v1/cash-adjustments/:id
 */
const getAdjustmentById = async (req, res) => {
  try {
    const adjustment = await cashAdjustmentService.getAdjustmentById(req.params.id);

    return res.status(200).json({
      success: true,
      data: adjustment,
      message: 'Cash adjustment retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash adjustment error:', error);
    const statusCode = error.message === 'Cash adjustment not found' ? 404 : 500;
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

module.exports = {
  createAdjustment,
  getAdjustments,
  getAdjustmentById,
};
