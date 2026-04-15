const cashReceiptService = require('../services/cashReceiptService');

/**
 * Cash Receipt Controller
 * Handles HTTP requests for cash receipt management
 */

/**
 * Create cash receipt
 * @route POST /api/v1/cash-receipts
 */
const createReceipt = async (req, res) => {
  try {
    const receiptData = {
      ...req.body,
    };

    const receipt = await cashReceiptService.createReceipt(receiptData, req.user._id);

    return res.status(201).json({
      success: true,
      data: receipt,
      message: 'Cash receipt created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create cash receipt error:', error);
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
 * Get all cash receipts
 * @route GET /api/v1/cash-receipts
 */
const getReceipts = async (req, res) => {
  try {
    const filters = {
      customerId: req.query.customerId,
      status: req.query.status,
      paymentMethod: req.query.paymentMethod,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort: req.query.sort || '-receiptDate',
    };

    const result = await cashReceiptService.getReceipts(filters, options);

    return res.status(200).json({
      success: true,
      data: result.receipts,
      pagination: result.pagination,
      message: 'Cash receipts retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash receipts error:', error);
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
 * Get cash receipt by ID
 * @route GET /api/v1/cash-receipts/:id
 */
const getReceiptById = async (req, res) => {
  try {
    const receipt = await cashReceiptService.getReceiptById(req.params.id);

    return res.status(200).json({
      success: true,
      data: receipt,
      message: 'Cash receipt retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash receipt error:', error);
    const statusCode = error.message === 'Cash receipt not found' ? 404 : 500;
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
 * Get outstanding invoices for customer
 * @route GET /api/v1/cash-receipts/customer/:customerId/outstanding-invoices
 */
const getOutstandingInvoices = async (req, res) => {
  try {
    const invoices = await cashReceiptService.getOutstandingInvoices(req.params.customerId);

    return res.status(200).json({
      success: true,
      data: invoices,
      message: 'Outstanding invoices retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get outstanding invoices error:', error);
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
 * Get pending PDCs
 * @route GET /api/v1/pdc/pending
 */
const getPendingPDCs = async (req, res) => {
  try {
    const pdcs = await cashReceiptService.getPendingPDCs();

    return res.status(200).json({
      success: true,
      data: pdcs,
      message: 'Pending PDCs retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get pending PDCs error:', error);
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
 * Clear PDC
 * @route PATCH /api/v1/pdc/:id/clear
 */
const clearPDC = async (req, res) => {
  try {
    const receipt = await cashReceiptService.clearPDC(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      data: receipt,
      message: 'PDC cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Clear PDC error:', error);
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
 * Bounce PDC
 * @route PATCH /api/v1/pdc/:id/bounce
 */
const bouncePDC = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bounce reason is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const receipt = await cashReceiptService.bouncePDC(req.params.id, reason, req.user._id);

    return res.status(200).json({
      success: true,
      data: receipt,
      message: 'PDC marked as bounced',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Bounce PDC error:', error);
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

module.exports = {
  createReceipt,
  getReceipts,
  getReceiptById,
  getOutstandingInvoices,
  getPendingPDCs,
  clearPDC,
  bouncePDC,
};
