const express = require('express');
const { body, param, query } = require('express-validator');
const salesInvoiceController = require('../controllers/salesInvoiceController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, isValidObjectId } = require('../middleware/validation');
const { validateBody } = require('../middleware/joiValidation');
const {
  createSalesInvoiceSchema,
  updateSalesInvoiceSchema,
  confirmInvoiceSchema,
  cancelInvoiceSchema,
  createSalesReturnSchema,
} = require('../validators/salesInvoiceValidation');
const {
  validateStockAvailability,
  validateCreditLimit,
  validateBatchExpiry,
  validateBatchQuantity,
  validateInvoiceStatus,
  validateDates,
  validateClaimAccount,
} = require('../validators/businessRules');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sales Invoices
 *   description: Sales invoice management endpoints for pharmaceutical distribution
 *
 * components:
 *   schemas:
 *     SalesInvoice:
 *       type: object
 *       required:
 *         - customerId
 *         - items
 *       properties:
 *         invoiceNumber:
 *           type: string
 *           description: Auto-generated unique invoice number (format SI + Year + 6 digits)
 *           example: SI2025000001
 *         salesType:
 *           type: string
 *           enum: [new, return]
 *           description: Type of sales transaction
 *           example: new
 *         invoiceDate:
 *           type: string
 *           format: date-time
 *           description: Invoice date (defaults to current date)
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Payment due date (calculated from credit days)
 *         customerId:
 *           type: string
 *           description: Customer ID reference
 *         customerName:
 *           type: string
 *           description: Customer name (denormalized)
 *         customerTown:
 *           type: string
 *           description: Customer town
 *         otherTitle:
 *           type: string
 *           description: Additional title or reference
 *         memoNo:
 *           type: string
 *           description: Memo number
 *         poReference:
 *           type: string
 *           description: Purchase order reference
 *         creditDays:
 *           type: number
 *           description: Credit period in days
 *         salesmanId:
 *           type: string
 *           description: Assigned salesman ID
 *         advanceTaxRate:
 *           type: number
 *           enum: [0.5, 2.5]
 *           description: Advance tax rate (0.5% for filers, 2.5% for non-filers)
 *         taxInvoiceType:
 *           type: string
 *           enum: [normal, sales_tax]
 *           description: Type of tax invoice
 *         claimAccountId:
 *           type: string
 *           description: Claim account for scheme discounts
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SalesInvoiceItem'
 *         totals:
 *           $ref: '#/components/schemas/InvoiceTotals'
 *         previousBalance:
 *           type: number
 *           description: Customer's previous balance
 *         totalBalance:
 *           type: number
 *           description: Total balance after invoice
 *         status:
 *           type: string
 *           enum: [draft, confirmed, paid, cancelled]
 *           description: Invoice status
 *         paymentStatus:
 *           type: string
 *           enum: [pending, partial, paid]
 *           description: Payment status
 *         detailNote:
 *           type: string
 *           description: Additional notes
 *         warrantyInfo:
 *           type: string
 *           description: Warranty information
 *
 *     SalesInvoiceItem:
 *       type: object
 *       required:
 *         - itemId
 *         - warehouseId
 *       properties:
 *         itemId:
 *           type: string
 *           description: Item ID reference
 *         itemName:
 *           type: string
 *           description: Item name
 *         companyName:
 *           type: string
 *           description: Manufacturer/company name
 *         warehouseId:
 *           type: string
 *           description: Warehouse ID
 *         batchNumber:
 *           type: string
 *           description: Batch number for tracking
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: Batch expiry date
 *         boxQty:
 *           type: number
 *           description: Quantity in boxes
 *         unitQty:
 *           type: number
 *           description: Quantity in units
 *         scheme1Qty:
 *           type: number
 *           description: Free units (reduces stock, no invoice value)
 *         scheme2Qty:
 *           type: number
 *           description: Claimable free units (requires claim account)
 *         totalUnitQty:
 *           type: number
 *           description: Total unit quantity (calculated)
 *         boxTP:
 *           type: number
 *           description: Box trade price
 *         unitTP:
 *           type: number
 *           description: Unit trade price
 *         discount1Percent:
 *           type: number
 *           description: Regular discount percentage
 *         discount1Amount:
 *           type: number
 *           description: Regular discount amount (calculated)
 *         discount2Percent:
 *           type: number
 *           description: Claim discount percentage
 *         discount2Amount:
 *           type: number
 *           description: Claim discount amount (calculated)
 *         gstTotal:
 *           type: number
 *           description: Total GST amount (18%)
 *         advanceTaxAmount:
 *           type: number
 *           description: Advance tax amount
 *         netAmount:
 *           type: number
 *           description: Net line amount
 *
 *     InvoiceTotals:
 *       type: object
 *       properties:
 *         grossTotal:
 *           type: number
 *           description: Total before discounts and taxes
 *         discountTotal:
 *           type: number
 *           description: Total discount amount
 *         gstTotal:
 *           type: number
 *           description: Total GST amount
 *         advanceTaxTotal:
 *           type: number
 *           description: Total advance tax
 *         nonFilerGst:
 *           type: number
 *           description: Non-filer GST (0.1%)
 *         netBillTotal:
 *           type: number
 *           description: Final net bill total
 */

/**
 * @swagger
 * /invoices/sales/statistics:
 *   get:
 *     summary: Get sales statistics
 *     description: Retrieve comprehensive sales statistics including totals, counts, and trends
 *     tags: [Sales Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                     totalInvoices:
 *                       type: number
 *                     averageInvoiceValue:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * @route   GET /api/invoices/sales/statistics
 * @desc    Get sales statistics
 * @access  Private (Admin, Sales, Accountant)
 */
router.get(
  '/statistics',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  salesInvoiceController.getSalesStatistics,
);

/**
 * @route   GET /api/invoices/sales/number/:invoiceNumber
 * @desc    Get sales invoice by invoice number
 * @access  Private
 */
router.get(
  '/number/:invoiceNumber',
  authenticate,
  [
    param('invoiceNumber')
      .trim()
      .notEmpty()
      .withMessage('Invoice number is required')
      .matches(/^SI\d{10}$/)
      .withMessage('Invalid invoice number format. Expected format: SI + Year + 6 digits'),
    validate,
  ],
  salesInvoiceController.getSalesInvoiceByNumber,
);

/**
 * @route   GET /api/invoices/sales/customer/:customerId
 * @desc    Get sales invoices by customer
 * @access  Private
 */
router.get(
  '/customer/:customerId',
  authenticate,
  [
    param('customerId')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    validate,
  ],
  salesInvoiceController.getSalesInvoicesByCustomer,
);

/**
 * @route   GET /api/invoices/sales/salesman/:salesmanId
 * @desc    Get sales invoices by salesman
 * @access  Private
 */
router.get(
  '/salesman/:salesmanId',
  authenticate,
  [
    param('salesmanId')
      .custom(isValidObjectId)
      .withMessage('Invalid salesman ID format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('status')
      .optional()
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateFrom'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateTo'),
    validate,
  ],
  salesInvoiceController.getSalesInvoicesBySalesman,
);

/**
 * @route   POST /api/invoices/sales/search
 * @desc    Advanced search for sales invoices
 * @access  Private
 * @body    filters, sort, page, limit, searchText, searchFields
 */
router.post(
  '/search',
  authenticate,
  [
    body('filters')
      .optional()
      .isArray()
      .withMessage('Filters must be an array'),
    body('sort')
      .optional()
      .isArray()
      .withMessage('Sort must be an array'),
    body('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    validate,
  ],
  salesInvoiceController.advancedSearch,
);

/**
 * @route   GET /api/invoices/sales
 * @desc    Get all sales invoices with optional filters and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('status')
      .optional()
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    query('paymentStatus')
      .optional()
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status'),
    query('invoiceSource')
      .optional()
      .isIn(['admin', 'pos', 'import', ''])
      .withMessage('Invalid invoice source'),
    query('keyword')
      .optional()
      .trim(),
    query('customerId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    query('salesmanId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid salesman ID format'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateFrom'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateTo'),
    validate,
  ],
  salesInvoiceController.getAllSalesInvoices,
);

/**
 * @swagger
 * /invoices/sales:
 *   post:
 *     summary: Create new sales invoice
 *     description: Create a new sales invoice with items, taxes, and discounts
 *     tags: [Sales Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               invoiceDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 0.01
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *                     discount:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Sales invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesInvoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * @route   POST /api/invoices/sales
 * @desc    Create new sales invoice with comprehensive validation
 * @access  Private (Admin, Sales, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  validateBody(createSalesInvoiceSchema),
  validateDates,
  validateClaimAccount,
  validateStockAvailability,
  validateCreditLimit,
  validateBatchExpiry,
  validateBatchQuantity,
  salesInvoiceController.createSalesInvoice,
);

/**
 * @route   GET /api/invoices/sales/:id
 * @desc    Get sales invoice by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.getSalesInvoiceById,
);

/**
 * @route   PUT /api/invoices/sales/:id
 * @desc    Update sales invoice (only draft invoices)
 * @access  Private (Admin, Sales, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  validateInvoiceStatus,
  validateBody(updateSalesInvoiceSchema),
  validateDates,
  validateClaimAccount,
  validateStockAvailability,
  validateCreditLimit,
  validateBatchExpiry,
  validateBatchQuantity,
  salesInvoiceController.updateSalesInvoice,
);

/**
 * @route   DELETE /api/invoices/sales/:id
 * @desc    Delete sales invoice (only draft invoices)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.deleteSalesInvoice,
);

/**
 * @route   PATCH /api/invoices/sales/:id/status
 * @desc    Update sales invoice status
 * @access  Private (Admin, Sales, Accountant)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status. Must be one of: draft, confirmed, paid, cancelled'),
    validate,
  ],
  salesInvoiceController.updateInvoiceStatus,
);

/**
 * @route   PATCH /api/invoices/sales/:id/payment-status
 * @desc    Update sales invoice payment status
 * @access  Private (Admin, Accountant)
 */
router.patch(
  '/:id/payment-status',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paymentStatus')
      .notEmpty()
      .withMessage('Payment status is required')
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status. Must be one of: pending, partial, paid'),
    validate,
  ],
  salesInvoiceController.updatePaymentStatus,
);

/**
 * @swagger
 * /invoices/sales/{id}/confirm:
 *   patch:
 *     summary: Confirm sales invoice
 *     description: Confirm a draft invoice, update inventory, create stock movements and ledger entries
 *     tags: [Sales Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesInvoice'
 *       400:
 *         description: Cannot confirm invoice (insufficient stock, already confirmed, etc.)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * @route   PATCH /api/invoices/sales/:id/confirm
 * @desc    Confirm sales invoice and update inventory with validation
 * @access  Private (Admin, Sales, Accountant)
 */
router.patch(
  '/:id/confirm',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  validateInvoiceStatus,
  validateStockAvailability,
  validateBatchExpiry,
  validateBatchQuantity,
  salesInvoiceController.confirmSalesInvoice,
);

/**
 * @route   PATCH /api/invoices/sales/:id/payment
 * @desc    Update invoice payment status
 * @access  Private (Admin, Accountant)
 */
router.patch(
  '/:id/payment',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paymentStatus')
      .notEmpty()
      .withMessage('Payment status is required')
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status. Must be one of: pending, partial, paid'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be greater than 0'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('paymentMethod')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Payment method cannot exceed 50 characters'),
    body('paymentReference')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Payment reference cannot exceed 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.updatePayment,
);

/**
 * @route   POST /api/invoices/sales/:id/mark-paid
 * @desc    Mark invoice as paid
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/mark-paid',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('paymentMethod')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Payment method cannot exceed 50 characters'),
    body('paymentReference')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Payment reference cannot exceed 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.markInvoiceAsPaid,
);

/**
 * @route   POST /api/invoices/sales/:id/mark-partial-paid
 * @desc    Mark invoice as partially paid
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/mark-partial-paid',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('amount')
      .notEmpty()
      .withMessage('Payment amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be greater than 0'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.markInvoiceAsPartiallyPaid,
);

/**
 * @swagger
 * /invoices/sales/{id}/cancel:
 *   patch:
 *     summary: Cancel sales invoice
 *     description: Cancel a confirmed invoice and reverse all stock movements and ledger entries
 *     tags: [Sales Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesInvoice'
 *       400:
 *         description: Cannot cancel invoice (not confirmed, already cancelled, etc.)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * @route   PATCH /api/invoices/sales/:id/cancel
 * @desc    Cancel sales invoice and reverse inventory with validation
 * @access  Private (Admin)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  validateBody(cancelInvoiceSchema),
  salesInvoiceController.cancelSalesInvoice,
);

/**
 * @swagger
 * /invoices/sales/{id}/return:
 *   post:
 *     summary: Create sales return
 *     description: Create a sales return invoice from an original invoice, reversing stock and ledger entries
 *     tags: [Sales Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Original invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnItems
 *             properties:
 *               returnItems:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - returnQuantity
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: Item ID to return
 *                     returnQuantity:
 *                       type: number
 *                       minimum: 0.01
 *                       description: Quantity to return
 *                     batchNumber:
 *                       type: string
 *                       description: Batch number (if applicable)
 *               returnReason:
 *                 type: string
 *                 enum: [damaged, expired, wrong_item, customer_request, quality_issue, other]
 *                 description: Reason for return
 *               returnNotes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Additional notes about the return
 *     responses:
 *       201:
 *         description: Sales return created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesInvoice'
 *       400:
 *         description: Invalid return data or cannot create return
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * @route   POST /api/invoices/sales/:id/return
 * @desc    Create sales return from original invoice with validation
 * @access  Private (Admin, Sales, Accountant)
 */
router.post(
  '/:id/return',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  validateBody(createSalesReturnSchema),
  salesInvoiceController.createSalesReturn,
);

/**
 * @route   GET /api/invoices/sales/:id/stock-movements
 * @desc    Get stock movements for an invoice
 * @access  Private
 */
router.get(
  '/:id/stock-movements',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.getInvoiceStockMovements,
);

/**
 * @route   POST /api/invoices/sales/:id/send-sms
 * @desc    Send SMS for sales invoice
 * @access  Private
 */
router.post(
  '/:id/send-sms',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('templateId')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Template ID cannot be empty'),
    validate,
  ],
  require('../controllers/smsController').sendInvoiceSMS,
);

/**
 * Task 75: Estimate/Quotation Printing Routes
 */

/**
 * @route   POST /api/invoices/sales/:id/convert-estimate
 * @desc    Convert estimate to invoice
 * @access  Private (Admin, Sales, Accountant)
 */
router.post(
  '/:id/convert-estimate',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.convertEstimateToInvoice,
);

/**
 * @route   GET /api/invoices/sales/estimates/pending
 * @desc    Get pending estimates
 * @access  Private
 */
router.get(
  '/estimates/pending',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('customerId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  salesInvoiceController.getPendingEstimates,
);

/**
 * @route   GET /api/invoices/sales/estimates/expired
 * @desc    Get expired estimates
 * @access  Private
 */
router.get(
  '/estimates/expired',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('customerId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  salesInvoiceController.getExpiredEstimates,
);

/**
 * Task 76: Warranty Management Routes
 */

/**
 * @route   GET /api/invoices/sales/:id/warranty
 * @desc    Get warranty information for an invoice
 * @access  Private
 */
router.get(
  '/:id/warranty',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.getWarrantyInfo,
);

/**
 * @route   PUT /api/invoices/sales/:id/warranty
 * @desc    Update warranty information for an invoice
 * @access  Private (Admin, Sales, Data Entry)
 */
router.put(
  '/:id/warranty',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('warrantyInfo')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Warranty info cannot exceed 500 characters'),
    body('warrantyPaste')
      .optional()
      .isBoolean()
      .withMessage('Warranty paste must be a boolean'),
    body('items')
      .optional()
      .isArray()
      .withMessage('Items must be an array'),
    body('items.*.itemId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid item ID format'),
    body('items.*.warrantyMonths')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Warranty months must be a non-negative integer'),
    body('items.*.warrantyDetails')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Warranty details cannot exceed 200 characters'),
    validate,
  ],
  salesInvoiceController.updateWarrantyInfo,
);

/**
 * Task 11: Invoice Printing Routes
 */

/**
 * @route   GET /api/invoices/sales/:id/print
 * @desc    Generate and download invoice PDF
 * @access  Private
 */
router.get(
  '/:id/print',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    query('template')
      .optional()
      .isIn(['standard', 'detailed', 'compact', 'logo', 'letterhead', 'thermal', 'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'])
      .withMessage('Invalid template format'),
    query('download')
      .optional()
      .isBoolean()
      .withMessage('Download must be a boolean'),
    validate,
  ],
  salesInvoiceController.printInvoice,
);

/**
 * @route   POST /api/invoices/sales/:id/email
 * @desc    Email invoice PDF to customer
 * @access  Private (Admin, Sales, Accountant)
 */
router.post(
  '/:id/email',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('recipientEmail')
      .optional()
      .isEmail()
      .withMessage('Invalid email address'),
    body('subject')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Subject cannot exceed 200 characters'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters'),
    validate,
  ],
  salesInvoiceController.emailInvoice,
);

/**
 * @route   POST /api/invoices/sales/bulk-print
 * @desc    Bulk print multiple invoices
 * @access  Private (Admin, Sales, Accountant)
 */
router.post(
  '/bulk-print',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    body('invoiceIds')
      .isArray({ min: 1 })
      .withMessage('Invoice IDs array is required with at least one ID'),
    body('invoiceIds.*')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.bulkPrintInvoices,
);

/**
 * Task 13: Export Routes
 */

/**
 * @route   GET /api/invoices/sales/export
 * @desc    Export sales invoices to Excel or PDF
 * @access  Private
 */
router.get(
  '/export',
  authenticate,
  [
    query('format')
      .optional()
      .isIn(['excel', 'pdf'])
      .withMessage('Format must be either "excel" or "pdf"'),
    query('customerId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    query('salesmanId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid salesman ID format'),
    query('status')
      .optional()
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateFrom'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateTo'),
    validate,
  ],
  salesInvoiceController.exportInvoices,
);

module.exports = router;
