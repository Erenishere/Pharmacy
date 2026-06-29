const posItemService = require('../services/posItemService');
const posCustomerService = require('../services/posCustomerService');
const posInvoiceService = require('../services/posInvoiceService');
const salesReturnService = require('../services/salesReturnService');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * POS Controller
 * Handles HTTP requests and responses for POS operations
 */
class POSController {
  /**
   * Extract salesman context from authenticated user
   * @param {Object} req - Express request object
   * @returns {Object} Salesman context
   */
  async getSalesmanContext(req) {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const Salesman = require('../models/Salesman');
    const salesman = await Salesman.findOne({ userId: req.user._id });

    const context = {
      salesmanId: salesman ? salesman._id : null,
      warehouseId: salesman ? salesman.warehouseId : (req.user.warehouseId || req.user.warehouse),
      salesmanName: salesman ? salesman.name : req.user.username,
    };


    if (!context.warehouseId) {
      throw new AppError('No warehouse assigned to this salesman. Please contact admin to assign a warehouse.', 403);
    }

    return context;
  }

  /**
   * Search items for POS
   * GET /api/v1/salesman/pos/items/search?q=query&limit=20
   */
  searchItems = catchAsync(async (req, res, next) => {
    const { q: query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    const salesmanContext = await this.getSalesmanContext(req);
    const searchLimit = limit ? parseInt(limit) : 20;

    const items = await posItemService.searchItems(
      query,
      salesmanContext.warehouseId,
      searchLimit,
    );

    res.status(200).json({
      success: true,
      data: items,
      count: items.length,
    });
  });

  /**
   * Scan barcode
   * POST /api/v1/salesman/pos/items/scan-barcode
   * Body: { barcode: string }
   */
  scanBarcode = catchAsync(async (req, res, next) => {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Barcode is required',
        },
      });
    }

    const salesmanContext = await this.getSalesmanContext(req);

    const item = await posItemService.scanBarcode(
      barcode,
      salesmanContext.warehouseId,
    );

    res.status(200).json({
      success: true,
      data: item,
    });
  });

  /**
   * Search customers
   * GET /api/v1/salesman/pos/customers/search?q=query&limit=20
   */
  searchCustomers = catchAsync(async (req, res, next) => {
    const { q: query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    const searchLimit = limit ? parseInt(limit) : 20;

    const customers = await posCustomerService.searchCustomers(query, searchLimit);

    res.status(200).json({
      success: true,
      data: customers,
      count: customers.length,
    });
  });

  /**
   * Get walk-in customer
   * GET /api/v1/salesman/pos/customers/walk-in
   */
  getWalkInCustomer = catchAsync(async (req, res, next) => {
    const customer = await posCustomerService.getWalkInCustomer();

    res.status(200).json({
      success: true,
      data: customer,
    });
  });

  /**
   * Create invoice
   * POST /api/v1/salesman/pos/invoices
   * Body: { customerId, items, discount, paymentMethod, notes }
   */
  createInvoice = catchAsync(async (req, res, next) => {
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.customerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Customer ID is required',
        },
      });
    }

    if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one item is required',
        },
      });
    }

    const salesmanContext = await this.getSalesmanContext(req);

    const invoice = await posInvoiceService.createInvoice(
      invoiceData,
      salesmanContext,
      false, // isDraft = false (confirmed invoice)
    );

    res.status(201).json({
      success: true,
      data: invoice,
    });
  });

  /**
   * Create draft invoice
   * POST /api/v1/salesman/pos/invoices/draft
   * Body: { customerId, items, discount, paymentMethod, notes }
   */
  createDraftInvoice = catchAsync(async (req, res, next) => {
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.customerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Customer ID is required',
        },
      });
    }

    if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one item is required',
        },
      });
    }

    const salesmanContext = await this.getSalesmanContext(req);

    const invoice = await posInvoiceService.createInvoice(
      invoiceData,
      salesmanContext,
      true, // isDraft = true
    );

    res.status(201).json({
      success: true,
      data: invoice,
    });
  });

  /**
   * Get draft invoices
   * GET /api/v1/salesman/pos/invoices/draft
   */
  getDraftInvoices = catchAsync(async (req, res, next) => {
    const salesmanContext = await this.getSalesmanContext(req);

    const invoices = await posInvoiceService.getDraftInvoices(salesmanContext.salesmanId);

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  });

  /**
   * Hold invoice
   * POST /api/v1/salesman/pos/invoices/:id/hold
   * Body: { reason }
   */
  holdInvoice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    const salesmanContext = await this.getSalesmanContext(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reason is required',
        },
      });
    }

    const invoice = await posInvoiceService.holdInvoice(id, reason, salesmanContext.salesmanId);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  });

  /**
   * Recall invoice
   * POST /api/v1/salesman/pos/invoices/:id/recall
   */
  recallInvoice = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // We don't strictly need salesman check here as recallInvoice in service doesn't use it,
    // but we could enforce ownership if needed. For now, trust the service or add ownership check later.
    const invoice = await posInvoiceService.recallInvoice(id);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  });

  /**
   * Get held invoices
   * GET /api/v1/salesman/pos/invoices/held
   */
  getHeldInvoices = catchAsync(async (req, res, next) => {
    const salesmanContext = await this.getSalesmanContext(req);

    // Pass salesmanId to filter only their held invoices
    const invoices = await posInvoiceService.getHeldInvoices(salesmanContext.salesmanId);

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  });

  /**
   * Cancel invoice
   * POST /api/v1/salesman/pos/invoices/:id/cancel
   * Body: { reason }
   */
  cancelInvoice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    const salesmanContext = await this.getSalesmanContext(req);

    const invoice = await posInvoiceService.cancelInvoice(id, reason || 'POS Cancellation', salesmanContext.salesmanId);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  });

  /**
   * Create sales return from POS
   * POST /api/v1/salesman/pos/returns
   * Body: { originalInvoiceId, returnItems, returnReason, returnNotes }
   */
  createReturn = catchAsync(async (req, res, next) => {
    const { originalInvoiceId, returnItems, returnReason, returnNotes } = req.body;
    const salesmanContext = await this.getSalesmanContext(req);

    // Create the return as draft
    const returnInvoice = await salesReturnService.createReturn(
      originalInvoiceId,
      { returnItems, returnReason, returnNotes },
      req.user._id,
    );

    // Auto-process (confirm) the return for POS flow
    const processedReturn = await salesReturnService.processReturn(
      returnInvoice._id,
      req.user._id,
    );

    res.status(201).json({
      success: true,
      data: processedReturn,
      message: 'Return processed successfully',
    });
  });

  /**
   * Get salesman's return history
   * GET /api/v1/salesman/pos/returns
   */
  getReturns = catchAsync(async (req, res, next) => {
    const salesmanContext = await this.getSalesmanContext(req);
    const Invoice = require('../models/Invoice');

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = {
      type: 'return_sales',
      salesmanId: salesmanContext.salesmanId,
    };

    const [returns, total] = await Promise.all([
      Invoice.find(query)
        .populate('customerId', 'name code')
        .populate('originalInvoiceId', 'invoiceNumber invoiceDate')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Invoice.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: returns,
      count: returns.length,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        totalItems: total,
        itemsPerPage: parseInt(limit, 10),
      },
    });
  });
}

module.exports = new POSController();
