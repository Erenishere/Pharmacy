const express = require('express');
const { query, body } = require('express-validator');
const posController = require('../controllers/posController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: POS
 *   description: Point of Sale endpoints for salesman operations
 */

// Apply authentication and role check to all POS routes
router.use(authenticate);
router.use(requireRoles(['sales', 'salesman']));

/**
 * @swagger
 * /api/v1/salesman/pos/items/search:
 *   get:
 *     summary: Search items for POS
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query (name, code, barcode, SKU)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Items found successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.get(
  '/items/search',
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 1 })
      .withMessage('Search query must be at least 1 character'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    validate,
  ],
  posController.searchItems,
);

/**
 * @swagger
 * /api/v1/salesman/pos/items/scan-barcode:
 *   post:
 *     summary: Scan barcode and get item with batch information
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcode
 *             properties:
 *               barcode:
 *                 type: string
 *                 description: Item barcode
 *     responses:
 *       200:
 *         description: Item found successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.post(
  '/items/scan-barcode',
  [
    body('barcode')
      .notEmpty()
      .withMessage('Barcode is required')
      .isString()
      .withMessage('Barcode must be a string'),
    validate,
  ],
  posController.scanBarcode,
);

/**
 * @swagger
 * /api/v1/salesman/pos/customers/search:
 *   get:
 *     summary: Search customers for POS
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query (name, code, phone)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Customers found successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.get(
  '/customers/search',
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 1 })
      .withMessage('Search query must be at least 1 character'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    validate,
  ],
  posController.searchCustomers,
);

/**
 * @swagger
 * /api/v1/salesman/pos/customers/walk-in:
 *   get:
 *     summary: Get walk-in customer
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Walk-in customer retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.get('/customers/walk-in', posController.getWalkInCustomer);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices:
 *   post:
 *     summary: Create confirmed invoice
 *     tags: [POS]
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
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - quantity
 *                     - unitPrice
 *                     - gstRate
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     itemName:
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
 *                     gstRate:
 *                       type: number
 *                       enum: [0, 4, 18]
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               paymentMethod:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Validation error or business rule violation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.post(
  '/invoices',
  [
    body('customerId')
      .notEmpty()
      .withMessage('Customer ID is required')
      .isMongoId()
      .withMessage('Customer ID must be a valid MongoDB ID'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isMongoId()
      .withMessage('Item ID must be a valid MongoDB ID'),
    body('items.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Unit price must be a positive number'),
    body('items.*.gstRate')
      .isIn([0, 4, 18])
      .withMessage('GST rate must be 0, 4, or 18'),
    body('items.*.discount')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Discount must be between 0 and 100'),
    body('discount')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Invoice discount must be between 0 and 100'),
    validate,
  ],
  posController.createInvoice,
);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/draft:
 *   post:
 *     summary: Create draft invoice
 *     tags: [POS]
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
 *               items:
 *                 type: array
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Draft invoice created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.post(
  '/invoices/draft',
  [
    body('customerId')
      .notEmpty()
      .withMessage('Customer ID is required')
      .isMongoId()
      .withMessage('Customer ID must be a valid MongoDB ID'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isMongoId()
      .withMessage('Item ID must be a valid MongoDB ID'),
    body('items.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Unit price must be a positive number'),
    body('items.*.gstRate')
      .isIn([0, 4, 18])
      .withMessage('GST rate must be 0, 4, or 18'),
    validate,
  ],
  posController.createDraftInvoice,
);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/draft:
 *   get:
 *     summary: Get draft invoices for salesman
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Draft invoices retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires sales role
 */
router.get('/invoices/draft', posController.getDraftInvoices);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/held:
 *   get:
 *     summary: Get held invoices
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Held invoices retrieved successfully
 */
router.get('/invoices/held', posController.getHeldInvoices);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/{id}/hold:
 *   post:
 *     summary: Hold an invoice
 *     tags: [POS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice held successfully
 */
router.post(
  '/invoices/:id/hold',
  [
    body('reason').notEmpty().withMessage('Reason is required'),
    validate,
  ],
  posController.holdInvoice,
);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/{id}/recall:
 *   post:
 *     summary: Recall a held invoice
 *     tags: [POS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice recalled successfully
 */
router.post('/invoices/:id/recall', posController.recallInvoice);

/**
 * @swagger
 * /api/v1/salesman/pos/invoices/{id}/cancel:
 *   post:
 *     summary: Cancel an invoice
 *     tags: [POS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 */
router.post('/invoices/:id/cancel', posController.cancelInvoice);

/**
 * @swagger
 * /api/v1/salesman/pos/returns:
 *   post:
 *     summary: Create a sales return from POS
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalInvoiceId
 *               - returnItems
 *             properties:
 *               originalInvoiceId:
 *                 type: string
 *               returnItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     batchNumber:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               returnReason:
 *                 type: string
 *               returnNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Return created and processed successfully
 */
router.post(
  '/returns',
  [
    body('originalInvoiceId')
      .notEmpty()
      .withMessage('Original invoice ID is required')
      .isMongoId()
      .withMessage('Invalid invoice ID'),
    body('returnItems')
      .isArray({ min: 1 })
      .withMessage('At least one return item is required'),
    body('returnItems.*.itemId')
      .notEmpty()
      .withMessage('Item ID is required'),
    body('returnItems.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Return quantity must be greater than 0'),
    validate,
  ],
  posController.createReturn,
);

/**
 * @swagger
 * /api/v1/salesman/pos/returns:
 *   get:
 *     summary: Get salesman's return history
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Returns retrieved successfully
 */
router.get('/returns', posController.getReturns);

module.exports = router;
