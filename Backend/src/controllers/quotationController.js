const quotationService = require('../services/quotationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Quotation Controller
 * Handles HTTP requests for quotation management
 */

/**
 * Create new quotation
 * POST /api/v1/quotations
 */
exports.createQuotation = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.createQuotation(req.body, req.user._id);

  res.status(201).json({
    status: 'success',
    data: {
      quotation,
    },
  });
});

/**
 * Get all quotations with filtering and pagination
 * GET /api/v1/quotations
 */
exports.getQuotations = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status,
    customerId: req.query.customerId,
    salesmanId: req.query.salesmanId,
    quotationNumber: req.query.quotationNumber,
    referenceNumber: req.query.referenceNumber,
    customerName: req.query.customerName,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  };

  const pagination = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };

  const result = await quotationService.getQuotations(filters, pagination);

  res.status(200).json({
    status: 'success',
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Get quotation by ID
 * GET /api/v1/quotations/:id
 */
exports.getQuotationById = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.getQuotationById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      quotation,
    },
  });
});

/**
 * Update quotation
 * PUT /api/v1/quotations/:id
 */
exports.updateQuotation = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.updateQuotation(
    req.params.id,
    req.body,
    req.user._id,
  );

  res.status(200).json({
    status: 'success',
    data: {
      quotation,
    },
  });
});

/**
 * Delete quotation
 * DELETE /api/v1/quotations/:id
 */
exports.deleteQuotation = catchAsync(async (req, res, next) => {
  await quotationService.deleteQuotation(req.params.id, req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Quotation deleted successfully',
  });
});

/**
 * Mark quotation as sent
 * PATCH /api/v1/quotations/:id/send
 */
exports.markAsSent = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.markAsSent(req.params.id, req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      quotation,
    },
  });
});

/**
 * Approve quotation (mark as sent)
 * POST /api/v1/quotations/:id/approve
 */
exports.approveQuotation = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.markAsSent(req.params.id, req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      quotation,
    },
  });
});

/**
 * Cancel quotation
 * POST /api/v1/quotations/:id/cancel
 */
exports.cancelQuotation = catchAsync(async (req, res, next) => {
  const quotation = await quotationService.getQuotationById(req.params.id);

  if (quotation.status === 'converted') {
    return next(new AppError('Cannot cancel a converted quotation', 400));
  }

  const updatedQuotation = await quotationService.updateQuotation(
    req.params.id,
    { status: 'cancelled' },
    req.user._id,
  );

  res.status(200).json({
    status: 'success',
    data: {
      quotation: updatedQuotation,
    },
  });
});

/**
 * Convert quotation to sales invoice
 * POST /api/v1/quotations/:id/convert-to-invoice
 * PATCH /api/v1/quotations/:id/convert (with type: 'invoice')
 */
exports.convertToInvoice = catchAsync(async (req, res, next) => {
  const additionalData = {
    warehouseId: req.body.warehouseId,
    creditDays: req.body.creditDays,
    advanceTaxRate: req.body.advanceTaxRate,
    taxInvoiceType: req.body.taxInvoiceType,
    otherTitle: req.body.otherTitle,
    warrantyInfo: req.body.warrantyInfo,
    dimensionId: req.body.dimensionId,
    autoConfirm: req.body.autoConfirm || false,
  };

  // Validate required fields for invoice conversion
  if (!additionalData.warehouseId) {
    return next(new AppError('Warehouse ID is required for invoice conversion', 400));
  }

  const invoice = await quotationService.convertToInvoice(
    req.params.id,
    req.user._id,
    additionalData,
  );

  res.status(200).json({
    status: 'success',
    message: 'Quotation converted to invoice successfully',
    data: {
      invoice,
    },
  });
});

/**
 * Convert quotation to e-order
 * POST /api/v1/quotations/:id/convert-to-order
 * PATCH /api/v1/quotations/:id/convert (with type: 'order')
 */
exports.convertToOrder = catchAsync(async (req, res, next) => {
  const additionalData = {
    routeId: req.body.routeId,
  };

  const order = await quotationService.convertToOrder(
    req.params.id,
    req.user._id,
    additionalData,
  );

  res.status(200).json({
    status: 'success',
    message: 'Quotation converted to e-order successfully',
    data: {
      order,
    },
  });
});

/**
 * Convert quotation (unified endpoint)
 * PATCH /api/v1/quotations/:id/convert
 * Body: { type: 'invoice' | 'order', ...additionalData }
 */
exports.convertQuotation = catchAsync(async (req, res, next) => {
  const { type } = req.body;

  if (!type || !['invoice', 'order'].includes(type)) {
    return next(new AppError('Conversion type must be either "invoice" or "order"', 400));
  }

  if (type === 'invoice') {
    return exports.convertToInvoice(req, res, next);
  }
  return exports.convertToOrder(req, res, next);
});

/**
 * Mark expired quotations
 * POST /api/v1/quotations/mark-expired
 */
exports.markExpiredQuotations = catchAsync(async (req, res, next) => {
  const result = await quotationService.markExpiredQuotations();

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * Get quotation summary statistics
 * GET /api/v1/quotations/summary
 */
exports.getQuotationSummary = catchAsync(async (req, res, next) => {
  const filters = {
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  };

  const summary = await quotationService.getQuotationSummary(filters);

  res.status(200).json({
    status: 'success',
    data: {
      summary,
    },
  });
});
