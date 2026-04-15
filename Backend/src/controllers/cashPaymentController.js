const cashPaymentService = require('../services/cashPaymentService');

/**
 * Cash Payment Controller
 * Handles HTTP requests for cash payment management
 */

/**
 * Create cash payment
 * @route POST /api/v1/cash-payments
 */
const createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
    };

    const payment = await cashPaymentService.createPayment(paymentData, req.user._id);

    return res.status(201).json({
      success: true,
      data: payment,
      message: 'Cash payment created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create cash payment error:', error);
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
 * Get all cash payments
 * @route GET /api/v1/cash-payments
 */
const getPayments = async (req, res) => {
  try {
    const filters = {
      supplierId: req.query.supplierId,
      status: req.query.status,
      paymentMethod: req.query.paymentMethod,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort: req.query.sort || '-paymentDate',
    };

    const result = await cashPaymentService.getPayments(filters, options);

    return res.status(200).json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
      message: 'Cash payments retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash payments error:', error);
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
 * Get cash payment by ID
 * @route GET /api/v1/cash-payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const payment = await cashPaymentService.getPaymentById(req.params.id);

    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Cash payment retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cash payment error:', error);
    const statusCode = error.message === 'Cash payment not found' ? 404 : 500;
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
 * Get outstanding invoices for supplier
 * @route GET /api/v1/cash-payments/supplier/:supplierId/outstanding-invoices
 */
const getOutstandingInvoices = async (req, res) => {
  try {
    const invoices = await cashPaymentService.getOutstandingInvoices(req.params.supplierId);

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

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  getOutstandingInvoices,
};
