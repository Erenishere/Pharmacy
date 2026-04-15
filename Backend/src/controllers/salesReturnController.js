const salesReturnService = require('../services/salesReturnService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Response = require('../utils/response');

/**
 * Create a sales return from an original invoice
 * @route POST /api/v1/sales-returns
 */
const createSalesReturn = catchAsync(async (req, res) => {
    const { originalInvoiceId, returnItems, returnReason, returnNotes } = req.body;
    const userId = req.user._id;

    if (!originalInvoiceId) {
        throw new AppError('Original invoice ID is required', 400, 'VALIDATION_ERROR');
    }

    const returnInvoice = await salesReturnService.createReturn(
        originalInvoiceId,
        { returnItems, returnReason, returnNotes },
        userId
    );

    return Response.success(res, returnInvoice, 'Sales return created successfully', 201);
});

/**
 * Process (confirm) a draft sales return – restores stock & adjusts balances
 * @route PATCH /api/v1/sales-returns/:id/process
 */
const processReturn = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const processed = await salesReturnService.processReturn(id, userId);

    return Response.success(res, processed, 'Sales return processed successfully');
});

/**
 * Get a single return invoice by ID
 * @route GET /api/v1/sales-returns/:id
 */
const getReturnById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const returnInvoice = await salesReturnService.getReturnInvoiceById(id);
    return Response.success(res, returnInvoice, 'Return invoice retrieved successfully');
});

/**
 * Get all returns for a specific original invoice
 * @route GET /api/v1/sales-returns/invoice/:invoiceId
 */
const getReturnsForInvoice = catchAsync(async (req, res) => {
    const { invoiceId } = req.params;
    const returns = await salesReturnService.getReturnsForInvoice(invoiceId);
    return Response.success(res, returns, 'Returns retrieved successfully');
});

/**
 * Get return statistics for an invoice
 * @route GET /api/v1/sales-returns/invoice/:invoiceId/statistics
 */
const getReturnStatistics = catchAsync(async (req, res) => {
    const { invoiceId } = req.params;
    const stats = await salesReturnService.getReturnStatistics(invoiceId);
    return Response.success(res, stats, 'Return statistics retrieved successfully');
});

/**
 * Generate credit note for a confirmed return
 * @route GET /api/v1/sales-returns/:id/credit-note
 */
const getCreditNote = catchAsync(async (req, res) => {
    const { id } = req.params;
    const creditNote = await salesReturnService.generateCreditNote(id);
    return Response.success(res, creditNote, 'Credit note generated successfully');
});

/**
 * List all sales return invoices (paginated)
 * @route GET /api/v1/sales-returns
 */
const getAllReturns = catchAsync(async (req, res) => {
    const Invoice = require('../models/Invoice');
    const { page = 1, limit = 20, status, customerId, dateFrom, dateTo } = req.query;

    const query = { type: 'return_sales' };
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (dateFrom || dateTo) {
        query.invoiceDate = {};
        if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Invoice.countDocuments(query);
    const returns = await Invoice.find(query)
        .populate('customerId', 'name code town')
        .populate('salesmanId', 'name code')
        .populate('originalInvoiceId', 'invoiceNumber invoiceDate')
        .populate('createdBy', 'name email')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

    return Response.success(res, returns, 'Sales returns retrieved successfully', 200, {
        pagination: {
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(total / parseInt(limit, 10)),
            totalItems: total,
            itemsPerPage: parseInt(limit, 10),
        },
    });
});

module.exports = {
    createSalesReturn,
    processReturn,
    getReturnById,
    getReturnsForInvoice,
    getReturnStatistics,
    getCreditNote,
    getAllReturns,
};
