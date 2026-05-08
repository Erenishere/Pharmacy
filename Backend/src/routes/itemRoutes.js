const express = require('express');

const router = express.Router();
const multer = require('multer');
const itemController = require('../controllers/itemController');
const batchController = require('../controllers/batchController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createItemValidation,
  updateItemValidation,
  getItemByIdValidation,
  getItemByCodeValidation,
  getItemByBarcodeValidation,
  updateItemStockValidation,
  getExpiringItemsValidation,
  scanBarcodeValidation,
  transferStockValidation,
} = require('../utils/validators/itemValidators');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item management and retrieval
 */

// Import/Export routes (must come before other routes)
/**
 * @swagger
 * /api/v1/items/template:
 *   get:
 *     summary: Download Excel template for items import
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Internal server error
 */
router.get('/template', authenticate, itemController.downloadItemsTemplate);

/**
 * @swagger
 * /api/v1/items/bulk-import:
 *   post:
 *     summary: Bulk import items from Excel file
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx) with items data
 *     responses:
 *       200:
 *         description: Import results with success/failure counts
 *       400:
 *         description: File is required or invalid format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-import', authenticate, authorize(['admin', 'inventory', 'data_entry']), upload.single('file'), itemController.bulkImportItems);

/**
 * @swagger
 * /api/v1/items/export:
 *   get:
 *     summary: Export items to Excel or PDF
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *           default: excel
 *         description: Export format
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: sellingGroup
 *         schema:
 *           type: string
 *           enum: [A, B, C]
 *         description: Filter by selling group
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Exported file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Internal server error
 */
router.get('/export', authenticate, itemController.exportItems);

// Special routes that need to come before parameterized routes
/**
 * @swagger
 * /api/v1/items/low-stock:
 *   get:
 *     summary: Get low stock items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock items with alert levels
 *       500:
 *         description: Internal server error
 */
router.get('/low-stock', authenticate, itemController.getLowStockItems);

/**
 * @swagger
 * /api/v1/items/search:
 *   get:
 *     summary: Advanced search for items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         description: Text to search across name, code, barcode, description, SKU
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: subCategoryId
 *         schema:
 *           type: string
 *         description: Filter by sub-category ID
 *       - in: query
 *         name: businessTypeId
 *         schema:
 *           type: string
 *         description: Filter by business type ID
 *       - in: query
 *         name: sellingGroup
 *         schema:
 *           type: string
 *           enum: [A, B, C]
 *         description: Filter by selling group
 *       - in: query
 *         name: formulaId
 *         schema:
 *           type: string
 *         description: Filter by formula/generic ID
 *       - in: query
 *         name: formulaSizeId
 *         schema:
 *           type: string
 *         description: Filter by formula size ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum sale price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum sale price
 *       - in: query
 *         name: minStock
 *         schema:
 *           type: number
 *         description: Minimum stock level
 *       - in: query
 *         name: maxStock
 *         schema:
 *           type: number
 *         description: Maximum stock level
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter low stock items only
 *       - in: query
 *         name: expiryTracking
 *         schema:
 *           type: boolean
 *         description: Filter by expiry tracking enabled
 *       - in: query
 *         name: batchTracking
 *         schema:
 *           type: boolean
 *         description: Filter by batch tracking enabled
 *     responses:
 *       200:
 *         description: Search results with pagination
 *       500:
 *         description: Internal server error
 */
router.get('/search', authenticate, itemController.searchItems);

/**
 * @swagger
 * /api/v1/items/expiring-soon:
 *   get:
 *     summary: Get items expiring soon
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look ahead for expiring items
 *     responses:
 *       200:
 *         description: List of items with expiring batches
 *       400:
 *         description: Invalid days parameter
 *       500:
 *         description: Internal server error
 */
router.get('/expiring-soon', authenticate, getExpiringItemsValidation, itemController.getExpiringItems);

/**
 * @swagger
 * /api/v1/items/categories:
 *   get:
 *     summary: Get all item categories
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of item categories
 *       500:
 *         description: Internal server error
 */
router.get('/categories', authenticate, itemController.getItemCategories);

/**
 * @swagger
 * /api/v1/items/scan-barcode:
 *   post:
 *     summary: Scan barcode to find item with batch information
 *     tags: [Items]
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
 *               warehouseId:
 *                 type: string
 *                 description: Optional warehouse ID to filter batches
 *     responses:
 *       200:
 *         description: Item found with stock details and batch information
 *       400:
 *         description: Barcode is required or item is not active
 *       404:
 *         description: Item not found with the provided barcode
 *       500:
 *         description: Internal server error
 */
router.post('/scan-barcode', authenticate, scanBarcodeValidation, itemController.scanBarcode);

/**
 * @swagger
 * /api/v1/items/code/{code}:
 *   get:
 *     summary: Get item by code
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Item code
 *     responses:
 *       200:
 *         description: Item data
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/code/:code', authenticate, getItemByCodeValidation, itemController.getItemByCode);

/**
 * @swagger
 * /api/v1/items/barcode/{barcode}:
 *   get:
 *     summary: Get item by barcode
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Item barcode
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *         description: Optional warehouse ID to filter batches
 *     responses:
 *       200:
 *         description: Item data with batch information
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/barcode/:barcode', authenticate, getItemByBarcodeValidation, itemController.getItemByBarcode);

/**
 * @swagger
 * /api/v1/items/reconcile-all:
 *   post:
 *     summary: Bulk sync all items with orphaned stock to Inventory collection
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - warehouseId
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 description: Default warehouse ID for orphaned stock
 *     responses:
 *       200:
 *         description: Reconciliation results
 *       400:
 *         description: Invalid warehouse ID
 *       500:
 *         description: Internal server error
 */
router.post('/reconcile-all', authenticate, authorize(['admin']), itemController.reconcileAllStock);

/**
 * @swagger
 * /api/v1/items/inventory-status:
 *   get:
 *     summary: Get inventory status report showing mismatches
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory status report
 *       500:
 *         description: Internal server error
 */
router.get('/inventory-status', authenticate, authorize(['admin', 'inventory']), itemController.getInventoryStatus);

/**
 * @swagger
 * /api/v1/items/{itemId}/stock/{warehouseId}:
 *   get:
 *     summary: Get item stock for a specific warehouse
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Stock data for the item in the warehouse
 *       400:
 *         description: Invalid ID format
 *       500:
 *         description: Internal server error
 */
router.get('/:itemId/stock/:warehouseId', authenticate, itemController.getItemWarehouseStock);

/**
 * @swagger
 * /api/v1/items/{itemId}/sync-stock:
 *   post:
 *     summary: Sync item stock from Item model to Inventory collection
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - warehouseId
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 description: Target warehouse ID
 *     responses:
 *       201:
 *         description: Stock synced successfully
 *       400:
 *         description: Invalid input or no stock to sync
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.post('/:itemId/sync-stock', authenticate, authorize(['admin', 'inventory']), itemController.syncItemStock);

/**
 * @swagger
 * /api/v1/items:
 *   get:
 *     summary: Get all items with advanced filtering and pagination
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 10
 *         description: Items per page (max 100)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field and direction (e.g., 'name:asc' or 'price:desc')
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword (searches in name, description, code, barcode, SKU)
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: subCategoryId
 *         schema:
 *           type: string
 *         description: Filter by sub-category ID
 *       - in: query
 *         name: businessTypeId
 *         schema:
 *           type: string
 *         description: Filter by business type ID
 *       - in: query
 *         name: sellingGroup
 *         schema:
 *           type: string
 *           enum: [A, B, C]
 *         description: Filter by selling group
 *       - in: query
 *         name: formulaId
 *         schema:
 *           type: string
 *         description: Filter by formula/generic ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum sale price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum sale price filter
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter low stock items only
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of items with pagination info
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, itemController.getAllItems);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item data with populated references
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, getItemByIdValidation, itemController.getItemById);

/**
 * @swagger
 * /api/v1/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - companyId
 *               - businessTypeId
 *               - categoryId
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique item code (auto-generated if not provided)
 *               name:
 *                 type: string
 *                 description: Item name (3-200 characters)
 *               description:
 *                 type: string
 *                 description: Item description
 *               companyId:
 *                 type: string
 *                 description: Company/manufacturer ID (required)
 *               sellingGroup:
 *                 type: string
 *                 enum: [A, B, C]
 *                 description: Selling group for scheme eligibility
 *               formulaId:
 *                 type: string
 *                 description: Medicine formula/generic ID
 *               formulaSizeId:
 *                 type: string
 *                 description: Generic size/strength ID
 *               categoryId:
 *                 type: string
 *                 description: Category ID (required)
 *               subCategoryId:
 *                 type: string
 *                 description: Sub-category ID
 *               businessTypeId:
 *                 type: string
 *                 description: Business type ID (required)
 *               pricing:
 *                 type: object
 *                 properties:
 *                   purchasePrice:
 *                     type: number
 *                     minimum: 0
 *                   salePrice:
 *                     type: number
 *                     minimum: 0
 *                   retailPrice:
 *                     type: number
 *                     minimum: 0
 *                   wholesalePrice:
 *                     type: number
 *                     minimum: 0
 *                   distributorPrice:
 *                     type: number
 *                     minimum: 0
 *                   mrp:
 *                     type: number
 *                     minimum: 0
 *               inventory:
 *                 type: object
 *                 properties:
 *                   openingStock:
 *                     type: number
 *                     minimum: 0
 *                   minimumStock:
 *                     type: number
 *                     minimum: 0
 *                   maximumStock:
 *                     type: number
 *                     minimum: 0
 *                   reorderPoint:
 *                     type: number
 *                     minimum: 0
 *                   leadTime:
 *                     type: number
 *                     minimum: 0
 *               tax:
 *                 type: object
 *                 properties:
 *                   gstRate:
 *                     type: number
 *                     enum: [0, 4, 18]
 *                   hsnCode:
 *                     type: string
 *               barcode:
 *                 type: string
 *                 description: Unique barcode
 *               sku:
 *                 type: string
 *                 description: Stock keeping unit
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, authorize(['admin', 'inventory', 'data_entry']), createItemValidation, itemController.createItem);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   put:
 *     summary: Update an existing item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               companyId:
 *                 type: string
 *               sellingGroup:
 *                 type: string
 *                 enum: [A, B, C]
 *               formulaId:
 *                 type: string
 *               formulaSizeId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               subCategoryId:
 *                 type: string
 *               businessTypeId:
 *                 type: string
 *               pricing:
 *                 type: object
 *               inventory:
 *                 type: object
 *               tax:
 *                 type: object
 *               barcode:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, authorize(['admin', 'inventory', 'data_entry']), updateItemValidation, itemController.updateItem);

/**
 * @swagger
 * /api/v1/items/{id}:
 *   delete:
 *     summary: Delete an item (soft delete)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, authorize(['admin', 'inventory']), getItemByIdValidation, itemController.deleteItem);

/**
 * @swagger
 * /api/v1/items/{id}/toggle-status:
 *   patch:
 *     summary: Toggle item active status
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item status toggled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/toggle-status', authenticate, authorize(['admin', 'inventory']), getItemByIdValidation, itemController.toggleItemStatus);

/**
 * @swagger
 * /api/v1/items/{id}/stock:
 *   patch:
 *     summary: Update item stock
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: Quantity to add or subtract
 *               operation:
 *                 type: string
 *                 enum: [add, subtract]
 *                 default: add
 *                 description: Whether to add or subtract the quantity
 *     responses:
 *       200:
 *         description: Item stock updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/stock', authenticate, authorize(['admin', 'inventory']), updateItemStockValidation, itemController.updateItemStock);

/**
 * @swagger
 * /api/v1/inventory/transfer:
 *   post:
 *     summary: Transfer stock between warehouses
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - fromWarehouseId
 *               - toWarehouseId
 *               - quantity
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item to transfer
 *               fromWarehouseId:
 *                 type: string
 *                 description: Source warehouse ID
 *               toWarehouseId:
 *                 type: string
 *                 description: Destination warehouse ID
 *               quantity:
 *                 type: number
 *                 minimum: 0.0001
 *                 description: Quantity to transfer
 *               reason:
 *                 type: string
 *                 description: Optional reason for the transfer
 *     responses:
 *       201:
 *         description: Stock transferred successfully
 *       400:
 *         description: Invalid input or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Warehouse or item not found
 *       500:
 *         description: Internal server error
 */
router.post('/transfer', authenticate, authorize(['admin', 'inventory']), transferStockValidation, itemController.transferStock);

// Batch related item routes
router.get('/:itemId/next-batch-number', authenticate, batchController.getNextBatchNumber);
router.get('/:itemId/batches', authenticate, batchController.getBatchesByItem);

module.exports = router;
