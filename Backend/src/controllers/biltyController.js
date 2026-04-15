const biltyService = require('../services/biltyService');

/**
 * Bilty Controller
 * Handles HTTP requests for bilty (transport receipt) management
 */

/**
 * Record bilty information for an invoice
 * @route POST /api/v1/bilty
 */
const recordBilty = async (req, res) => {
  try {
    const { invoiceId, ...biltyData } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invoice ID is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const invoice = await biltyService.recordBilty(invoiceId, biltyData);

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Bilty information recorded successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Record bilty error:', error);
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
 * Update bilty status
 * @route PATCH /api/v1/bilty/:invoiceId/status
 */
const updateBiltyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const invoice = await biltyService.updateBiltyStatus(req.params.invoiceId, status);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Bilty status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update bilty status error:', error);
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
 * Mark bilty as received
 * @route PATCH /api/v1/bilty/:invoiceId/received
 */
const markBiltyAsReceived = async (req, res) => {
  try {
    const invoice = await biltyService.markBiltyAsReceived(req.params.invoiceId);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Bilty marked as received successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark bilty as received error:', error);
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
 * Get pending bilties
 * @route GET /api/v1/bilty/pending
 */
const getPendingBilties = async (req, res) => {
  try {
    const filters = {
      supplierId: req.query.supplierId,
      transportCompany: req.query.transportCompany,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const bilties = await biltyService.getPendingBilties(filters);

    return res.status(200).json({
      success: true,
      data: bilties,
      message: 'Pending bilties retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get pending bilties error:', error);
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
 * Get all bilties
 * @route GET /api/v1/bilty
 */
const getAllBilties = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      supplierId: req.query.supplierId,
      transportCompany: req.query.transportCompany,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const bilties = await biltyService.getAllBilties(filters);

    return res.status(200).json({
      success: true,
      data: bilties,
      message: 'Bilties retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all bilties error:', error);
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
 * Get bilty details
 * @route GET /api/v1/bilty/:invoiceId
 */
const getBiltyDetails = async (req, res) => {
  try {
    const bilty = await biltyService.getBiltyDetails(req.params.invoiceId);

    return res.status(200).json({
      success: true,
      data: bilty,
      message: 'Bilty details retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get bilty details error:', error);
    const statusCode = error.message === 'Invoice not found' ? 404 : 400;
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

module.exports = {
  recordBilty,
  updateBiltyStatus,
  markBiltyAsReceived,
  getPendingBilties,
  getAllBilties,
  getBiltyDetails,
};
