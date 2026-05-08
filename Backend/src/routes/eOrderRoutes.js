const express = require('express');

const router = express.Router();
const eOrderController = require('../controllers/eOrderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/joiValidation');
const {
  createEOrderSchema,
  updateEOrderSchema,
  approveEOrderSchema,
  cancelEOrderSchema,
  convertToInvoiceSchema,
  syncFromMobileSchema,
} = require('../validators/eOrderValidation');
const {
  validateStockAvailability,
  validateEOrderConversion,
} = require('../validators/businessRules');

/**
 * @swagger
 * components:
 *   schemas:
 *     EOrder:
 *       type: object
 *       required:
 *         - customerId
 *         - items
 *       properties:
 *         _id:
 *           type: string
 *           description: Order ID
 *         orderNumber:
 *           type: string
 *           description: Auto-generated order number (EO2025000001)
 *           example: EO2025000001
 *         orderDate:
 *           type: string
 *           format: date-time
 *           description: Order date
 *         customerId:
 *           type: string
 *           description: Customer ID
 *         customerName:
 *           type: string
 *           description: Customer name
 *         customerTown:
 *           type: string
 *           description: Customer town
 *         salesmanId:
 *           type: string
 *           description: Salesman ID
 *         routeId:
 *           type: string
 *           description: Route ID
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: Item ID
 *               itemName:
 *                 type: string
 *                 description: Item name
 *               formulaSize:
 *                 type: string
 *                 description: Formula size for item selection
 *               boxQuantity:
 *                 type: number
 *                 description: Sale box quantity
 *               unitQuantity:
 *                 type: number
 *                 description: Sale unit quantity
 *               schemeUnitQty:
 *                 type: number
 *                 description: Scheme unit quantity (free units)
 *               rateWithGST:
 *                 type: number
 *                 description: Rate per unit with GST 18%
 *               discount:
 *                 type: number
 *                 description: Discount percentage
 *               lineTotal:
 *                 type: number
 *                 description: Total amount for this item
 *         estimatedAmount:
 *           type: number
 *           description: Estimated order amount
 *         status:
 *           type: string
 *           enum: [pending, approved, converted, cancelled]
 *           description: Order status
 *         convertedInvoiceId:
 *           type: string
 *           description: Invoice ID if converted
 *         convertedAt:
 *           type: string
 *           format: date-time
 *           description: Conversion timestamp
 *         notes:
 *           type: string
 *           description: Order notes
 *         createdBy:
 *           type: string
 *           description: User who created the order (salesman)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /e-orders:
 *   post:
 *     summary: Create new e-order
 *     tags: [E-Orders]
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
 *               routeId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     boxQuantity:
 *                       type: number
 *                     unitQuantity:
 *                       type: number
 *                     schemeUnitQty:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     discount:
 *                       type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: E-order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/EOrder'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, authorize('admin', 'sales', 'salesman'), validateBody(createEOrderSchema), eOrderController.createOrder);

/**
 * @swagger
 * /e-orders:
 *   get:
 *     summary: Get all e-orders with filters
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, converted, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer
 *       - in: query
 *         name: salesmanId
 *         schema:
 *           type: string
 *         description: Filter by salesman
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *         description: Filter by route
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of e-orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EOrder'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', authenticate, eOrderController.getOrders);

/**
 * @swagger
 * /e-orders/pending:
 *   get:
 *     summary: Get pending e-orders
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending e-orders
 */
router.get('/pending', authenticate, eOrderController.getPendingOrders);

/**
 * @swagger
 * /e-orders/summary:
 *   get:
 *     summary: Get e-orders summary statistics
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order summary statistics
 */
router.get('/summary', authenticate, eOrderController.getOrderSummary);

/**
 * @swagger
 * /e-orders/sync:
 *   post:
 *     summary: Sync orders from mobile device
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/EOrder'
 *     responses:
 *       200:
 *         description: Orders synced successfully
 */
router.post('/sync', authenticate, validateBody(syncFromMobileSchema), eOrderController.syncFromMobile);

/**
 * @swagger
 * /e-orders/{id}:
 *   get:
 *     summary: Get e-order by ID
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: E-order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/EOrder'
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticate, eOrderController.getOrderById);

/**
 * @swagger
 * /e-orders/{id}/approve:
 *   post:
 *     summary: Approve e-order
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order approved successfully
 *       400:
 *         description: Cannot approve order
 *       404:
 *         description: Order not found
 */
router.post('/:id/approve', authenticate, authorize('admin', 'sales'), eOrderController.approveOrder);

/**
 * @swagger
 * /e-orders/{id}/cancel:
 *   post:
 *     summary: Cancel e-order
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Cannot cancel order
 */
router.post('/:id/cancel', authenticate, validateBody(cancelEOrderSchema), eOrderController.cancelOrder);

/**
 * @swagger
 * /e-orders/{id}/convert-to-invoice:
 *   post:
 *     summary: Convert e-order to sales invoice
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceDate:
 *                 type: string
 *                 format: date
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order converted to invoice successfully
 *       400:
 *         description: Cannot convert order
 */
router.post('/:id/convert-to-invoice', authenticate, authorize('admin', 'sales'), validateEOrderConversion, validateBody(convertToInvoiceSchema), validateStockAvailability, eOrderController.convertToInvoice);

/**
 * @swagger
 * /e-orders/{id}:
 *   put:
 *     summary: Update pending e-order
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Cannot update order
 */
router.put('/:id', authenticate, authorize('admin', 'sales', 'salesman'), validateBody(updateEOrderSchema), eOrderController.updateOrder);

/**
 * @swagger
 * /e-orders/{id}:
 *   delete:
 *     summary: Delete pending e-order
 *     tags: [E-Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       400:
 *         description: Cannot delete order
 */
router.delete('/:id', authenticate, authorize('admin'), eOrderController.deleteOrder);

module.exports = router;
