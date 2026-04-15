const { body, param, query } = require('express-validator');
const { validate, isValidObjectId } = require('../../middleware/validation');

/**
 * Item Validators
 * Input validation rules for item management endpoints
 * Requirements: 1.1-1.20
 */

/**
 * Validation rules for creating a new item
 */
const createItemValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Item name must be between 3 and 200 characters'),

  body('companyId')
    .notEmpty()
    .withMessage('Company is required')
    .custom(isValidObjectId)
    .withMessage('Invalid company ID'),

  body('businessTypeId')
    .notEmpty()
    .withMessage('Business type is required')
    .custom(isValidObjectId)
    .withMessage('Invalid business type ID'),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('sellingGroup')
    .optional()
    .isIn(['A', 'B', 'C'])
    .withMessage('Selling group must be A, B, or C'),

  body('formulaId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid formula ID'),

  body('formulaSizeId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid formula size ID'),

  body('subCategoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid sub-category ID'),

  body('pricing.purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a non-negative number'),

  body('pricing.salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a non-negative number'),

  body('pricing.retailPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a non-negative number'),

  body('pricing.wholesalePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Wholesale price must be a non-negative number'),

  body('pricing.distributorPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distributor price must be a non-negative number'),

  body('pricing.mrp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('MRP must be a non-negative number'),

  body('inventory.openingStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Opening stock must be a non-negative number'),

  body('inventory.minimumStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum stock must be a non-negative number'),

  body('inventory.maximumStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum stock must be a non-negative number'),

  body('inventory.reorderPoint')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reorder point must be a non-negative number'),

  body('inventory.leadTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Lead time must be a non-negative number'),

  body('tax.gstRate')
    .optional()
    .isIn([0, 4, 18])
    .withMessage('GST rate must be 0, 4, or 18'),

  body('barcode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Barcode must be between 1 and 50 characters'),

  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for updating an item
 */
const updateItemValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Item name must be between 3 and 200 characters'),

  body('companyId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid company ID'),

  body('businessTypeId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid business type ID'),

  body('categoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('sellingGroup')
    .optional()
    .isIn(['A', 'B', 'C'])
    .withMessage('Selling group must be A, B, or C'),

  body('formulaId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid formula ID'),

  body('formulaSizeId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid formula size ID'),

  body('subCategoryId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid sub-category ID'),

  body('pricing.purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a non-negative number'),

  body('pricing.salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a non-negative number'),

  body('pricing.retailPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a non-negative number'),

  body('pricing.wholesalePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Wholesale price must be a non-negative number'),

  body('pricing.distributorPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distributor price must be a non-negative number'),

  body('pricing.mrp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('MRP must be a non-negative number'),

  body('inventory.minimumStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum stock must be a non-negative number'),

  body('inventory.maximumStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum stock must be a non-negative number'),

  body('inventory.reorderPoint')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reorder point must be a non-negative number'),

  body('inventory.leadTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Lead time must be a non-negative number'),

  body('tax.gstRate')
    .optional()
    .isIn([0, 4, 18])
    .withMessage('GST rate must be 0, 4, or 18'),

  body('barcode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Barcode must be between 1 and 50 characters'),

  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for getting item by ID
 */
const getItemByIdValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID'),
  validate,
];

/**
 * Validation rules for getting item by code
 */
const getItemByCodeValidation = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Item code is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Item code must be between 1 and 50 characters'),
  validate,
];

/**
 * Validation rules for getting item by barcode
 */
const getItemByBarcodeValidation = [
  param('barcode')
    .trim()
    .notEmpty()
    .withMessage('Barcode is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Barcode must be between 1 and 50 characters'),

  query('warehouseId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid warehouse ID'),

  validate,
];

/**
 * Validation rules for updating item stock
 */
const updateItemStockValidation = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than zero'),

  body('operation')
    .optional()
    .isIn(['add', 'subtract'])
    .withMessage('Operation must be either add or subtract'),

  validate,
];

/**
 * Validation rules for getting expiring items
 */
const getExpiringItemsValidation = [
  query('days')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Days must be a non-negative integer'),
  validate,
];

/**
 * Validation rules for scanning barcode
 */
const scanBarcodeValidation = [
  body('barcode')
    .trim()
    .notEmpty()
    .withMessage('Barcode is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Barcode must be between 1 and 50 characters'),

  body('warehouseId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid warehouse ID'),

  validate,
];

/**
 * Validation rules for stock transfer
 */
const transferStockValidation = [
  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID'),

  body('fromWarehouseId')
    .notEmpty()
    .withMessage('Source warehouse ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid source warehouse ID'),

  body('toWarehouseId')
    .notEmpty()
    .withMessage('Destination warehouse ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid destination warehouse ID'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than zero'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),

  validate,
];

module.exports = {
  createItemValidation,
  updateItemValidation,
  getItemByIdValidation,
  getItemByCodeValidation,
  getItemByBarcodeValidation,
  updateItemStockValidation,
  getExpiringItemsValidation,
  scanBarcodeValidation,
  transferStockValidation,
};
