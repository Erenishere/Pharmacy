const salesInvoiceService = require('../services/salesInvoiceService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Response = require('../utils/response');

/**
 * Sales Invoice Controller
 * Handles HTTP requests for sales invoice management
 */

/**
 * Get all sales invoices with advanced filtering and pagination
 * @route GET /api/invoices/sales
 */
const getAllSalesInvoices = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort,
    sortBy = 'invoiceDate',
    sortOrder = 'desc',
    keyword,
    customerId,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    ...otherFilters
  } = req.query;

  // Build filters object
  const filters = {
    ...(keyword && { keyword }),
    ...(customerId && { customerId }),
    ...(status && { status }),
    ...(paymentStatus && { paymentStatus }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...otherFilters,
  };

  // Security: If user is a salesman, restrict to their own invoices
  if (req.user.role === 'salesman' || req.user.role === 'sales') {
    const Salesman = require('../models/Salesman');
    const salesman = await Salesman.findOne({ userId: req.user._id });
    if (salesman) {
      filters.salesmanId = salesman._id;
    } else {
      // If no salesman profile exists for this user, they shouldn't see any invoices
      filters.salesmanId = '000000000000000000000000';
    }
  }

  // Build sort options
  const sortOptions = {};
  if (sort) {
    // Handle sort parameter in format: 'field:asc' or 'field:desc'
    const [field, order] = sort.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else if (sortBy) {
    // Fallback to sortBy and sortOrder if sort is not provided
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  // Get paginated invoices with filters
  const result = await salesInvoiceService.getInvoices(filters, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
    sort: sortOptions,
  });

  return Response.success(
    res,
    result.data,
    'Sales invoices retrieved successfully',
    200,
    { pagination: Response.formatPagination(result.pagination, req) },
  );
});

/**
 * Get sales invoice by ID
 * @route GET /api/invoices/sales/:id
 */
const getSalesInvoiceById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const invoice = await salesInvoiceService.getInvoiceById(id);

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice retrieved successfully');
});

/**
 * Get sales invoice by invoice number
 * @route GET /api/invoices/sales/number/:invoiceNumber
 */
const getSalesInvoiceByNumber = catchAsync(async (req, res) => {
  const { invoiceNumber } = req.params;
  const invoice = await salesInvoiceService.getInvoiceByNumber(invoiceNumber);

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice retrieved successfully');
});

/**
 * Get sales invoices by customer
 * @route GET /api/invoices/sales/customer/:customerId
 */
const getSalesInvoicesByCustomer = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const { page = 1, limit = 10, sort } = req.query;

  const sortOptions = {};
  if (sort) {
    const [field, order] = sort.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else {
    sortOptions.invoiceDate = -1;
  }

  const result = await salesInvoiceService.getCustomerInvoices(customerId, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10), 100),
    sort: sortOptions,
  });

  return Response.success(
    res,
    result.data || result,
    'Customer sales invoices retrieved successfully',
    200,
    result.pagination ? { pagination: Response.formatPagination(result.pagination, req) } : {},
  );
});

/**
 * Create new sales invoice
 * @route POST /api/invoices/sales
 */
const createSalesInvoice = catchAsync(async (req, res) => {
  const invoiceData = {
    ...req.body,
    createdBy: req.user._id, // From authentication middleware
  };

  const invoice = await salesInvoiceService.createInvoice(invoiceData, req.user._id);

  return Response.success(res, invoice, 'Sales invoice created successfully', 201);
});

/**
 * Update sales invoice
 * @route PUT /api/invoices/sales/:id
 */
const updateSalesInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const invoice = await salesInvoiceService.updateSalesInvoice(id, updateData);

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice updated successfully');
});

/**
 * Delete sales invoice
 * @route DELETE /api/invoices/sales/:id
 */
const deleteSalesInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const invoice = await salesInvoiceService.deleteSalesInvoice(id);

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice deleted successfully');
});

/**
 * Update sales invoice status
 * @route PATCH /api/invoices/sales/:id/status
 */
const updateInvoiceStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new AppError('Status is required', 400, 'VALIDATION_ERROR');
  }

  const validStatuses = ['draft', 'confirmed', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const invoice = await salesInvoiceService.updateSalesInvoice(id, { status });

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice status updated successfully');
});

/**
 * Update sales invoice payment status
 * @route PATCH /api/invoices/sales/:id/payment-status
 */
const updatePaymentStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus) {
    throw new AppError('Payment status is required', 400, 'VALIDATION_ERROR');
  }

  const validPaymentStatuses = ['pending', 'partial', 'paid'];
  if (!validPaymentStatuses.includes(paymentStatus)) {
    throw new AppError(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const invoice = await salesInvoiceService.updateSalesInvoice(id, { paymentStatus });

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Sales invoice payment status updated successfully');
});

/**
 * Get sales statistics
 * @route GET /api/invoices/sales/statistics
 */
const getSalesStatistics = catchAsync(async (req, res) => {
  const filters = req.query;

  // Build query object for statistics
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.dateFrom || filters.dateTo) {
    query.invoiceDate = {};
    if (filters.dateFrom) {
      query.invoiceDate.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.invoiceDate.$lte = new Date(filters.dateTo);
    }
  }

  if (filters.customerId) {
    query.customerId = filters.customerId;
  }

  const statistics = await salesInvoiceService.calculateInvoiceSummary(query);

  return Response.success(res, statistics, 'Sales statistics retrieved successfully');
});

/**
 * Confirm sales invoice and update inventory
 * @route PATCH /api/invoices/sales/:id/confirm
 */
const confirmSalesInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await salesInvoiceService.confirmSalesInvoice(id, userId);

  return Response.success(res, result.invoice, 'Sales invoice confirmed successfully and inventory updated');
});

/**
 * Mark invoice as paid
 * @route POST /api/invoices/sales/:id/mark-paid
 */
const markInvoiceAsPaid = catchAsync(async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body;

  const invoice = await salesInvoiceService.markInvoiceAsPaid(id, paymentData);

  return Response.success(res, invoice, 'Sales invoice marked as paid successfully');
});

/**
 * Mark invoice as partially paid
 * @route POST /api/invoices/sales/:id/mark-partial-paid
 */
const markInvoiceAsPartiallyPaid = catchAsync(async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body;

  if (!paymentData.amount || paymentData.amount <= 0) {
    throw new AppError('Payment amount is required and must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  const invoice = await salesInvoiceService.markInvoiceAsPartiallyPaid(id, paymentData);

  return Response.success(res, invoice, 'Sales invoice marked as partially paid successfully');
});

/**
 * Cancel sales invoice and reverse inventory
 * @route PATCH /api/invoices/sales/:id/cancel
 */
const cancelSalesInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const invoice = await salesInvoiceService.cancelSalesInvoice(id, userId, reason);

  return Response.success(res, invoice, 'Sales invoice cancelled successfully');
});

/**
 * Get stock movements for an invoice
 * @route GET /api/invoices/sales/:id/stock-movements
 */
const getInvoiceStockMovements = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify invoice exists
  await salesInvoiceService.getSalesInvoiceById(id);

  const stockMovements = await salesInvoiceService.getInvoiceStockMovements(id);

  return Response.success(res, stockMovements, 'Stock movements retrieved successfully');
});

/**
 * Update invoice payment (unified endpoint for all payment status updates)
 * @route PATCH /api/invoices/sales/:id/payment
 */
const updatePayment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, amount, ...paymentData } = req.body;

  let invoice;

  if (paymentStatus === 'paid') {
    invoice = await salesInvoiceService.markInvoiceAsPaid(id, paymentData);
  } else if (paymentStatus === 'partial') {
    if (!amount || amount <= 0) {
      throw new AppError('Payment amount is required for partial payments', 400, 'VALIDATION_ERROR');
    }
    invoice = await salesInvoiceService.markInvoiceAsPartiallyPaid(id, { amount, ...paymentData });
  } else {
    // For 'pending' or just updating payment status
    invoice = await salesInvoiceService.updateSalesInvoice(id, { paymentStatus, ...paymentData });
  }

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return Response.success(res, invoice, 'Payment status updated successfully');
});

/**
 * Advanced search for sales invoices
 * @route POST /api/invoices/sales/search
 */
const advancedSearch = catchAsync(async (req, res) => {
  const searchService = require('../services/searchService');
  const Invoice = require('../models/Invoice');

  const {
    filters = [],
    sort = [],
    page = 1,
    limit = 50,
    searchText = '',
    searchFields = ['invoiceNo', 'notes'],
    populate = ['customerId', 'items.itemId', 'createdBy'],
  } = req.body;

  // Add type filter to ensure only sales invoices are returned
  const salesFilters = [
    ...filters,
    { field: 'type', operator: 'in', value: ['sales', 'return_sales'] },
  ];

  const results = await searchService.searchRecords(Invoice, {
    filters: salesFilters,
    sort,
    page,
    limit,
    searchText,
    searchFields,
    populate,
  });

  return Response.success(
    res,
    results.results,
    'Sales invoices search completed successfully',
    200,
    { pagination: Response.formatPagination(results.pagination, req) },
  );
});

/**
 * Convert estimate to invoice (Task 75.3)
 * @route POST /api/invoices/sales/:id/convert-estimate
 */
const convertEstimateToInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const estimateService = require('../services/estimateService');

  const invoice = await estimateService.convertEstimateToInvoice(id);

  return Response.success(res, invoice, 'Estimate converted to invoice successfully');
});

/**
 * Get pending estimates (Task 75.4)
 * @route GET /api/invoices/sales/estimates/pending
 */
const getPendingEstimates = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort,
    sortBy = 'invoiceDate',
    sortOrder = 'desc',
    customerId,
    includeExpired,
    ...otherFilters
  } = req.query;

  const estimateService = require('../services/estimateService');

  // Build filters object
  const filters = {
    ...(customerId && { customerId }),
    ...(includeExpired === 'true' && { includeExpired: true }),
    ...otherFilters,
  };

  // Build sort options
  const sortOptions = {};
  if (sort) {
    const [field, order] = sort.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else if (sortBy) {
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  const result = await estimateService.getPendingEstimates(filters, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10), 100),
    sort: sortOptions,
  });

  return Response.success(
    res,
    result.estimates,
    'Pending estimates retrieved successfully',
    200,
    { pagination: Response.formatPagination(result.pagination, req) },
  );
});

/**
 * Get expired estimates (Task 75.5)
 * @route GET /api/invoices/sales/estimates/expired
 */
const getExpiredEstimates = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort,
    sortBy = 'expiryDate',
    sortOrder = 'desc',
    customerId,
    ...otherFilters
  } = req.query;

  const estimateService = require('../services/estimateService');

  // Build filters object
  const filters = {
    ...(customerId && { customerId }),
    ...otherFilters,
  };

  // Build sort options
  const sortOptions = {};
  if (sort) {
    const [field, order] = sort.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else if (sortBy) {
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  const result = await estimateService.getExpiredEstimates(filters, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10), 100),
    sort: sortOptions,
  });

  return Response.success(
    res,
    result.estimates,
    'Expired estimates retrieved successfully',
    200,
    { pagination: Response.formatPagination(result.pagination, req) },
  );
});

/**
 * Create sales return from original invoice
 * @route POST /api/invoices/sales/:id/return
 */
const createSalesReturn = catchAsync(async (req, res) => {
  const { id } = req.params;
  const returnData = req.body;
  const userId = req.user._id;

  const salesReturnService = require('../services/salesReturnService');
  const returnInvoice = await salesReturnService.createReturn(id, returnData, userId);

  return Response.success(res, returnInvoice, 'Sales return created successfully', 201);
});

/**
 * Get sales invoices by salesman
 * @route GET /api/invoices/sales/salesman/:salesmanId
 */
const getSalesInvoicesBySalesman = catchAsync(async (req, res) => {
  const { salesmanId } = req.params;
  const {
    page = 1, limit = 10, sort, status, dateFrom, dateTo,
  } = req.query;

  // Build filters
  const filters = {
    salesmanId,
    ...(status && { status }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const sortOptions = {};
  if (sort) {
    const [field, order] = sort.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else {
    sortOptions.invoiceDate = -1;
  }

  const result = await salesInvoiceService.getInvoices(filters, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10), 100),
    sort: sortOptions,
  });

  return Response.success(
    res,
    result.data,
    'Salesman sales invoices retrieved successfully',
    200,
    { pagination: Response.formatPagination(result.pagination, req) },
  );
});

/**
 * Get warranty information for an invoice (Task 76.4)
 * @route GET /api/invoices/sales/:id/warranty
 */
const getWarrantyInfo = catchAsync(async (req, res) => {
  const { id } = req.params;
  const warrantyService = require('../services/warrantyService');
  const Invoice = require('../models/Invoice');

  // Get invoice with populated fields
  const invoice = await Invoice.findById(id)
    .populate('items.itemId', 'code name')
    .lean();

  if (!invoice) {
    throw new AppError('Sales invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const warrantyInfo = await warrantyService.getInvoiceWarrantyInfo(invoice);

  return Response.success(res, warrantyInfo, 'Warranty information retrieved successfully');
});

/**
 * Update warranty information for an invoice (Task 76.2)
 * @route PUT /api/invoices/sales/:id/warranty
 */
const updateWarrantyInfo = catchAsync(async (req, res) => {
  const { id } = req.params;
  const warrantyUpdate = req.body;
  const warrantyService = require('../services/warrantyService');
  const Invoice = require('../models/Invoice');

  // Get invoice
  const invoice = await Invoice.findById(id);

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (invoice.type !== 'sales' && invoice.type !== 'return_sales') {
    throw new AppError('Invoice is not a sales invoice', 400, 'INVALID_INVOICE_TYPE');
  }

  // Only allow updates to draft invoices
  if (invoice.status !== 'draft') {
    throw new AppError('Warranty information can only be updated for draft invoices', 400, 'INVALID_STATUS');
  }

  const updatedInvoice = await warrantyService.updateInvoiceWarrantyInfo(invoice, warrantyUpdate);

  return Response.success(res, updatedInvoice, 'Warranty information updated successfully');
});

/**
 * Generate invoice PDF for printing (Task 11.2)
 * @route GET /api/invoices/sales/:id/print
 */
const printInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { template = 'standard', download = false } = req.query;

  const invoicePrintService = require('../services/invoicePrintService');

  // Generate PDF
  const pdfBuffer = await invoicePrintService.generateInvoicePDF(id, { template });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');

  if (download === 'true' || download === true) {
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename=invoice-${id}.pdf`);
  }

  return res.send(pdfBuffer);
});

/**
 * Email invoice PDF to customer (Task 11.2)
 * @route POST /api/invoices/sales/:id/email
 */
const emailInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const emailOptions = req.body;

  const invoicePrintService = require('../services/invoicePrintService');

  // Email invoice
  const result = await invoicePrintService.emailInvoicePDF(id, emailOptions);

  return Response.success(res, result, 'Invoice email sent successfully');
});

/**
 * Bulk print multiple invoices (Task 11.2)
 * @route POST /api/invoices/sales/bulk-print
 */
const bulkPrintInvoices = catchAsync(async (req, res) => {
  const { ids, template = 'standard' } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Array of invoice IDs is required', 400, 'VALIDATION_ERROR');
  }

  const invoicePrintService = require('../services/invoicePrintService');

  // Generate combined PDF
  const pdfBuffer = await invoicePrintService.generateBulkInvoicePDF(ids, { template });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=bulk-invoices-${new Date().getTime()}.pdf`);

  return res.send(pdfBuffer);
});

/**
 * Export sales invoices to Excel or PDF (Task 13.2)
 * @route GET /api/invoices/sales/export
 */
const exportInvoices = catchAsync(async (req, res) => {
  const { format = 'excel', ...filters } = req.query;

  if (!['excel', 'pdf'].includes(format.toLowerCase())) {
    throw new AppError('Invalid format. Must be either "excel" or "pdf"', 400, 'VALIDATION_ERROR');
  }

  const exportService = require('../services/exportService');

  let fileBuffer;
  let contentType;
  let filename;

  if (format.toLowerCase() === 'excel') {
    fileBuffer = await exportService.exportInvoicesToExcel(filters);
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename = `sales-invoices-${Date.now()}.xlsx`;
  } else {
    fileBuffer = await exportService.exportInvoicesToPDF(filters);
    contentType = 'application/pdf';
    filename = `sales-invoices-${Date.now()}.pdf`;
  }

  // Set response headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  return res.send(fileBuffer);
});

module.exports = {
  getAllSalesInvoices,
  getSalesInvoiceById,
  getSalesInvoiceByNumber,
  getSalesInvoicesByCustomer,
  getSalesInvoicesBySalesman,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  updateInvoiceStatus,
  updatePaymentStatus,
  updatePayment,
  getSalesStatistics,
  confirmSalesInvoice,
  markInvoiceAsPaid,
  markInvoiceAsPartiallyPaid,
  cancelSalesInvoice,
  createSalesReturn,
  getInvoiceStockMovements,
  advancedSearch,
  // Task 75: Estimate operations
  convertEstimateToInvoice,
  getPendingEstimates,
  getExpiredEstimates,
  // Task 76: Warranty operations
  getWarrantyInfo,
  updateWarrantyInfo,
  // Task 11: Print operations
  printInvoice,
  emailInvoice,
  bulkPrintInvoices,
  // Task 13: Export operations
  exportInvoices,
};
