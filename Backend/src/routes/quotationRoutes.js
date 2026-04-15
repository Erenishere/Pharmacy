const express = require('express');

const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/joiValidation');
const {
  createQuotationSchema,
  updateQuotationSchema,
  sendQuotationSchema,
  convertQuotationSchema,
} = require('../validators/quotationValidation');

/**
 * @swagger
 * tags:
 *   name: Quotations
 *   description: Quotation management endpoints
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/quotations:
 *   post:
 *     summary: Create new quotation
 *     tags: [Quotations]
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
 *               salesmanId:
 *                 type: string
 *               items:
 *                 type: array
 *               referenceNumber:
 *                 type: string
 *               validityPeriod:
 *                 type: string
 *               termsAndConditions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quotation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authorize('admin', 'sales', 'salesman'), validateBody(createQuotationSchema), quotationController.createQuotation);

/**
 * @swagger
 * /api/v1/quotations:
 *   get:
 *     summary: Get all quotations with filtering
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotations retrieved successfully
 */
router.get('/', quotationController.getQuotations);

/**
 * @swagger
 * /api/v1/quotations/summary:
 *   get:
 *     summary: Get quotation summary statistics
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 */
router.get('/summary', quotationController.getQuotationSummary);

/**
 * @swagger
 * /api/v1/quotations/mark-expired:
 *   post:
 *     summary: Mark expired quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired quotations marked successfully
 */
router.post('/mark-expired', quotationController.markExpiredQuotations);

/**
 * @swagger
 * /api/v1/quotations/{id}:
 *   get:
 *     summary: Get quotation by ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation retrieved successfully
 *       404:
 *         description: Quotation not found
 */
router.get('/:id', quotationController.getQuotationById);

/**
 * @swagger
 * /api/v1/quotations/{id}:
 *   put:
 *     summary: Update quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation updated successfully
 *       404:
 *         description: Quotation not found
 */
router.put('/:id', authorize('admin', 'sales', 'salesman'), validateBody(updateQuotationSchema), quotationController.updateQuotation);

/**
 * @swagger
 * /api/v1/quotations/{id}/send:
 *   patch:
 *     summary: Mark quotation as sent
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation marked as sent successfully
 */
router.patch('/:id/send', authorize('admin', 'sales', 'salesman'), quotationController.markAsSent);

/**
 * @swagger
 * /api/v1/quotations/{id}/approve:
 *   post:
 *     summary: Approve quotation (mark as sent)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation approved successfully
 */
router.post('/:id/approve', authorize('admin', 'sales'), quotationController.approveQuotation);

/**
 * @swagger
 * /api/v1/quotations/{id}/cancel:
 *   post:
 *     summary: Cancel quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation cancelled successfully
 */
router.post('/:id/cancel', quotationController.cancelQuotation);

/**
 * @swagger
 * /api/v1/quotations/{id}/convert:
 *   patch:
 *     summary: Convert quotation to invoice or e-order
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [invoice, order]
 *               warehouseId:
 *                 type: string
 *                 description: Required for invoice conversion
 *               creditDays:
 *                 type: number
 *               advanceTaxRate:
 *                 type: number
 *               routeId:
 *                 type: string
 *                 description: Optional for order conversion
 *     responses:
 *       200:
 *         description: Quotation converted successfully
 */
router.patch('/:id/convert', authorize('admin', 'sales', 'salesman'), validateBody(convertQuotationSchema), quotationController.convertQuotation);

/**
 * @swagger
 * /api/v1/quotations/{id}/convert-to-invoice:
 *   post:
 *     summary: Convert quotation to sales invoice
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation converted to invoice successfully
 */
router.post(
  '/:id/convert-to-invoice',
  authorize('admin', 'sales'),
  quotationController.convertToInvoice,
);

/**
 * @swagger
 * /api/v1/quotations/{id}/convert-to-order:
 *   post:
 *     summary: Convert quotation to e-order
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation converted to e-order successfully
 */
router.post('/:id/convert-to-order', authorize('admin', 'sales', 'salesman'), quotationController.convertToOrder);

/**
 * @swagger
 * /api/v1/quotations/{id}:
 *   delete:
 *     summary: Delete quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation deleted successfully
 */
router.delete('/:id', authorize('admin'), quotationController.deleteQuotation);

module.exports = router;
