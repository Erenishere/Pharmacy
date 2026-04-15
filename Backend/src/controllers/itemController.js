const itemService = require('../services/itemService');
const stockTransferService = require('../services/stockTransferService');
const importExportService = require('../services/importExportService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Item Controller
 * Handles HTTP requests for item management
 * Requirements: 1.1-1.20
 */

/**
 * Get all items with advanced filtering and pagination
 * @route GET /api/v1/items
 * Requirements: 1.15-1.18
 */
const getAllItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      companyId,
      categoryId,
      subCategoryId,
      businessTypeId,
      sellingGroup,
      formulaId,
      minPrice,
      maxPrice,
      lowStock,
      isActive,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(companyId && { companyId }),
      ...(categoryId && { categoryId }),
      ...(subCategoryId && { subCategoryId }),
      ...(businessTypeId && { businessTypeId }),
      ...(sellingGroup && { sellingGroup }),
      ...(formulaId && { formulaId }),
      ...(minPrice !== undefined && { minPrice: parseFloat(minPrice) }),
      ...(maxPrice !== undefined && { maxPrice: parseFloat(maxPrice) }),
      ...(lowStock !== undefined && { lowStock: lowStock === 'true' }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...otherFilters,
    };

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

    // Get paginated items with filters
    const result = await itemService.getItems(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      message: 'Items retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all items error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item by ID
 * @route GET /api/v1/items/:id
 * Requirements: 1.15
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await itemService.getItemById(id);

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Item retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item by ID error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item by code
 * @route GET /api/v1/items/code/:code
 * Requirements: 1.15
 */
const getItemByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const item = await itemService.getItemByCode(code);

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Item retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item by code error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found with the provided code',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item by barcode
 * @route GET /api/v1/items/barcode/:barcode
 * Requirements: 1.11
 */
const getItemByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const { warehouseId } = req.query;

    const options = {};
    if (warehouseId) {
      options.warehouseId = warehouseId;
    }

    const item = await itemService.findItemByBarcode(barcode, options);

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Item retrieved successfully',
      batchSelectionRequired: item.requiresBatchSelection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item by barcode error:', error);

    if (error.message === 'Item not found with the provided barcode') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found with the provided barcode',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Item is not active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEM_INACTIVE',
          message: 'Item is not active',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new item
 * @route POST /api/v1/items
 * Requirements: 1.1-1.14
 */
const createItem = async (req, res) => {
  try {
    const itemData = req.body;
    const userId = req.user?.id || req.user?._id;

    const newItem = await itemService.createItem(itemData, userId);

    return res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create item error:', error);

    // Handle validation errors
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Item name is required'
      || error.message === 'Pricing information is required'
      || error.message === 'Item code already exists'
      || error.message === 'Barcode already exists'
      || error.message === 'Prices cannot be negative'
      || error.message === 'Inventory levels cannot be negative'
      || error.message === 'Minimum stock cannot be greater than maximum stock'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update item
 * @route PUT /api/v1/items/:id
 * Requirements: 1.1-1.14
 */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id || req.user?._id;

    const updatedItem = await itemService.updateItem(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update item error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle validation errors
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Item code already exists'
      || error.message === 'Barcode already exists'
      || error.message === 'Prices cannot be negative'
      || error.message === 'Inventory levels cannot be negative'
      || error.message === 'Minimum stock cannot be greater than maximum stock'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete item (soft delete)
 * @route DELETE /api/v1/items/:id
 * Requirements: 1.1-1.14
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const deletedItem = await itemService.deleteItem(id, userId);

    return res.status(200).json({
      success: true,
      data: deletedItem,
      message: 'Item deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete item error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle item status (active/inactive)
 * @route PATCH /api/v1/items/:id/toggle-status
 * Requirements: 1.1-1.14
 */
const toggleItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const item = await itemService.getItemById(id);
    const newStatus = !item.isActive;

    const updatedItem = await itemService.updateItem(
      id,
      { isActive: newStatus },
      userId,
    );

    return res.status(200).json({
      success: true,
      data: updatedItem,
      message: `Item ${newStatus ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle item status error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle item status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update item stock
 * @route PATCH /api/items/:id/stock
 */
const updateItemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'add' } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const updatedItem = await itemService.updateItemStock(id, parseFloat(quantity), operation);

    return res.status(200).json({
      success: true,
      data: updatedItem,
      message: `Item stock ${operation === 'add' ? 'increased' : 'decreased'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update item stock error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Insufficient stock'
      || error.message === 'Quantity must be greater than zero'
      || error.message === "Operation must be either 'add' or 'subtract'"
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update item stock',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get low stock items
 * @route GET /api/v1/items/low-stock
 * Requirements: 1.19
 */
const getLowStockItems = async (req, res) => {
  try {
    const items = await itemService.checkLowStock();

    return res.status(200).json({
      success: true,
      data: items,
      count: items.length,
      message: 'Low stock items retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get low stock items error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve low stock items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get expiring items
 * @route GET /api/v1/items/expiring-soon
 * Requirements: 1.20
 */
const getExpiringItems = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysThreshold = parseInt(days, 10);

    if (isNaN(daysThreshold) || daysThreshold < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Days parameter must be a non-negative number',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const items = await itemService.checkExpiringItems(daysThreshold);

    return res.status(200).json({
      success: true,
      data: items,
      count: items.length,
      daysThreshold,
      message: `Items expiring within ${daysThreshold} days retrieved successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get expiring items error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve expiring items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item categories
 * @route GET /api/items/categories
 */
const getItemCategories = async (req, res) => {
  try {
    const categories = await itemService.getCategories();

    return res.status(200).json({
      success: true,
      data: categories,
      message: 'Item categories retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item categories error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item categories',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Scan barcode to find item with batch selection
 * @route POST /api/v1/items/scan-barcode
 * Requirements: 1.11
 */
const scanBarcode = async (req, res) => {
  try {
    const { barcode, warehouseId } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Barcode is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const options = {};
    if (warehouseId) {
      options.warehouseId = warehouseId;
    }

    const item = await itemService.findItemByBarcode(barcode, options);

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Item found',
      batchSelectionRequired: item.requiresBatchSelection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan barcode error:', error);

    if (error.message === 'Item not found with the provided barcode') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Item is not active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEM_INACTIVE',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error scanning barcode',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Transfer stock between warehouses
 * @route POST /api/v1/inventory/transfer
 */
const transferStock = catchAsync(async (req, res, next) => {
  const {
    itemId, fromWarehouseId, toWarehouseId, quantity, reason,
  } = req.body;

  // Validate required fields
  if (!itemId || !fromWarehouseId || !toWarehouseId || !quantity) {
    return next(new AppError('Item ID, source warehouse, destination warehouse, and quantity are required', 400));
  }

  const transferData = {
    itemId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    reason: reason || 'Stock Transfer',
    createdBy: req.user?.id || req.user?._id,
  };

  const result = await stockTransferService.transferStock(transferData);

  res.status(201).json({
    status: 'success',
    message: 'Stock transferred successfully',
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Advanced search for items
 * @route GET /api/v1/items/search
 * Requirements: 1.16-1.18
 */
const searchItems = async (req, res) => {
  try {
    const searchService = require('../services/searchService');

    // Extract search criteria from query parameters
    const {
      searchText = '',
      page = 1,
      limit = 50,
      sortField = 'name',
      sortOrder = 'asc',
      // Filter parameters
      companyId,
      categoryId,
      subCategoryId,
      businessTypeId,
      sellingGroup,
      formulaId,
      formulaSizeId,
      isActive,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      lowStock,
      expiryTracking,
      batchTracking,
    } = req.query;

    // Build filters array
    const filters = [];

    if (companyId) {
      filters.push({ field: 'companyId', operator: 'equals', value: companyId });
    }
    if (categoryId) {
      filters.push({ field: 'categoryId', operator: 'equals', value: categoryId });
    }
    if (subCategoryId) {
      filters.push({ field: 'subCategoryId', operator: 'equals', value: subCategoryId });
    }
    if (businessTypeId) {
      filters.push({ field: 'businessTypeId', operator: 'equals', value: businessTypeId });
    }
    if (sellingGroup) {
      filters.push({ field: 'sellingGroup', operator: 'equals', value: sellingGroup });
    }
    if (formulaId) {
      filters.push({ field: 'formulaId', operator: 'equals', value: formulaId });
    }
    if (formulaSizeId) {
      filters.push({ field: 'formulaSizeId', operator: 'equals', value: formulaSizeId });
    }
    if (isActive !== undefined) {
      filters.push({ field: 'isActive', operator: 'equals', value: isActive === 'true' });
    }
    if (minPrice !== undefined) {
      filters.push({ field: 'pricing.salePrice', operator: 'gte', value: parseFloat(minPrice) });
    }
    if (maxPrice !== undefined) {
      filters.push({ field: 'pricing.salePrice', operator: 'lte', value: parseFloat(maxPrice) });
    }
    if (minStock !== undefined) {
      filters.push({ field: 'inventory.currentStock', operator: 'gte', value: parseFloat(minStock) });
    }
    if (maxStock !== undefined) {
      filters.push({ field: 'inventory.currentStock', operator: 'lte', value: parseFloat(maxStock) });
    }
    if (lowStock === 'true') {
      // Low stock: currentStock <= minimumStock
      filters.push({ field: '$expr', operator: 'equals', value: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] } });
    }
    if (expiryTracking !== undefined) {
      filters.push({ field: 'expiryTrackingEnabled', operator: 'equals', value: expiryTracking === 'true' });
    }
    if (batchTracking !== undefined) {
      filters.push({ field: 'batchTrackingEnabled', operator: 'equals', value: batchTracking === 'true' });
    }

    // Build sort array
    const sort = [{ field: sortField, order: sortOrder }];

    // Build search criteria
    const searchCriteria = {
      filters,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      searchText,
    };

    // Perform search
    const results = await searchService.searchItems(searchCriteria);

    return res.status(200).json({
      success: true,
      data: results.results,
      pagination: results.pagination,
      message: 'Items search completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search items error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to search items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Bulk import items from Excel
 * @route POST /api/v1/items/bulk-import
 * Requirements: 1.17
 */
const bulkImportItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Excel file is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const results = await importExportService.importItemsFromExcel(
      req.file.buffer,
      req.user,
    );

    return res.status(200).json({
      success: true,
      data: results,
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error importing items:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: error.message || 'Failed to import items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Export items to Excel or PDF
 * @route GET /api/v1/items/export
 * Requirements: 1.17
 */
const exportItems = async (req, res) => {
  try {
    const { format = 'excel', ...filters } = req.query;

    // Build filters
    const queryFilters = {};
    if (filters.companyId) queryFilters.companyId = filters.companyId;
    if (filters.categoryId) queryFilters.categoryId = filters.categoryId;
    if (filters.sellingGroup) queryFilters.sellingGroup = filters.sellingGroup;
    if (filters.isActive !== undefined) queryFilters.isActive = filters.isActive === 'true';

    let buffer;
    let contentType;
    let filename;

    if (format.toLowerCase() === 'pdf') {
      buffer = await importExportService.exportItemsToPDF(queryFilters);
      contentType = 'application/pdf';
      filename = `items_${new Date().toISOString().split('T')[0]}.pdf`;
    } else {
      buffer = await importExportService.exportItemsToExcel(queryFilters);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `items_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting items:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: error.message || 'Failed to export items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item stock for a specific warehouse
 * @route GET /api/v1/items/:itemId/stock/:warehouseId
 */
const getItemWarehouseStock = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.params;
    const mongoose = require('mongoose');
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid item ID or warehouse ID format',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // First try: Get from Inventory collection (source of truth for warehouse-specific)
    const stockResult = await Inventory.aggregate([
      {
        $match: {
          item: new mongoose.Types.ObjectId(itemId),
          warehouse: new mongoose.Types.ObjectId(warehouseId),
        },
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$quantity' },
          reservedStock: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
        },
      },
    ]);

    let totalStock = stockResult.length > 0 ? stockResult[0].totalStock : 0;
    let reservedStock = stockResult.length > 0 ? stockResult[0].reservedStock : 0;
    let source = 'inventory';

    // Fallback: If no Inventory records, check Item.inventory.currentStock
    // This handles legacy data where stock was stored directly in Item model
    if (stockResult.length === 0) {
      const item = await Item.findById(itemId).select('inventory.currentStock').lean();
      if (item?.inventory?.currentStock > 0) {
        totalStock = item.inventory.currentStock;
        reservedStock = 0;
        source = 'item_fallback';
      }
    }

    const availableStock = Math.max(0, totalStock - reservedStock);

    return res.status(200).json({
      success: true,
      data: {
        availableStock,
        totalStock,
        reservedStock,
        source, // Helps debug where stock came from
      },
      message: 'Stock retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item warehouse stock error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve stock',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Sync item stock from Item.inventory.currentStock to Inventory collection
 * @route POST /api/v1/items/:itemId/sync-stock
 */
const syncItemStock = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { warehouseId } = req.body;
    const mongoose = require('mongoose');
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid item ID format' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid warehouse ID is required' },
        timestamp: new Date().toISOString(),
      });
    }

    // Get item's current stock from Item model
    const item = await Item.findById(itemId).select('inventory.currentStock name code');
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const currentStock = item.inventory?.currentStock || 0;
    if (currentStock <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_STOCK', message: 'Item has no stock to sync' },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if Inventory record already exists
    const existingInventory = await Inventory.findOne({
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    });

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Inventory record already exists for this item/warehouse' },
        timestamp: new Date().toISOString(),
      });
    }

    // Create new Inventory record
    const newInventory = await Inventory.create({
      item: new mongoose.Types.ObjectId(itemId),
      warehouse: new mongoose.Types.ObjectId(warehouseId),
      quantity: currentStock,
      reservedQuantity: 0,
      lastUpdated: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: {
        itemId,
        itemName: item.name,
        itemCode: item.code,
        warehouseId,
        quantity: currentStock,
        inventoryId: newInventory._id,
      },
      message: `Stock synced: ${currentStock} units moved to Inventory collection`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync item stock error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to sync stock' },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Bulk sync all items with orphaned stock to Inventory collection
 * @route POST /api/v1/items/reconcile-all
 */
const reconcileAllStock = async (req, res) => {
  try {
    const { warehouseId } = req.body;
    const mongoose = require('mongoose');
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');

    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid default warehouse ID is required' },
        timestamp: new Date().toISOString(),
      });
    }

    // Find all items with currentStock > 0
    const itemsWithStock = await Item.find({
      'inventory.currentStock': { $gt: 0 },
    }).select('_id name code inventory.currentStock').lean();

    const results = {
      total: itemsWithStock.length,
      synced: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const item of itemsWithStock) {
      try {
        // Check if Inventory record already exists
        const existingInventory = await Inventory.findOne({
          item: item._id,
          warehouse: new mongoose.Types.ObjectId(warehouseId),
        });

        if (existingInventory) {
          results.skipped++;
          results.details.push({
            itemId: item._id,
            code: item.code,
            name: item.name,
            status: 'skipped',
            reason: 'Inventory record already exists',
          });
          continue;
        }

        // Create Inventory record
        await Inventory.create({
          item: item._id,
          warehouse: new mongoose.Types.ObjectId(warehouseId),
          quantity: item.inventory.currentStock,
          reservedQuantity: 0,
          lastUpdated: new Date(),
        });

        results.synced++;
        results.details.push({
          itemId: item._id,
          code: item.code,
          name: item.name,
          quantity: item.inventory.currentStock,
          status: 'synced',
        });
      } catch (err) {
        results.errors++;
        results.details.push({
          itemId: item._id,
          code: item.code,
          name: item.name,
          status: 'error',
          reason: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
      message: `Reconciliation complete: ${results.synced} synced, ${results.skipped} skipped, ${results.errors} errors`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reconcile all stock error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to reconcile stock' },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get inventory status report - shows mismatches between Item and Inventory
 * @route GET /api/v1/items/inventory-status
 */
const getInventoryStatus = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');

    // Get all items with stock
    const items = await Item.find({
      'inventory.currentStock': { $gt: 0 },
    }).select('_id name code inventory.currentStock').lean();

    const report = {
      totalItems: items.length,
      itemsWithInventoryRecords: 0,
      itemsWithoutInventoryRecords: 0,
      mismatches: [],
      orphanedItems: [],
    };

    for (const item of items) {
      // Get total from Inventory collection
      const inventoryResult = await Inventory.aggregate([
        { $match: { item: item._id } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);

      const inventoryTotal = inventoryResult.length > 0 ? inventoryResult[0].total : 0;
      const itemStock = item.inventory.currentStock;

      if (inventoryTotal === 0) {
        report.itemsWithoutInventoryRecords++;
        report.orphanedItems.push({
          itemId: item._id,
          code: item.code,
          name: item.name,
          itemStock,
          inventoryTotal: 0,
          status: 'NO_INVENTORY_RECORD',
        });
      } else {
        report.itemsWithInventoryRecords++;
        if (Math.abs(itemStock - inventoryTotal) > 0.01) {
          report.mismatches.push({
            itemId: item._id,
            code: item.code,
            name: item.name,
            itemStock,
            inventoryTotal,
            difference: itemStock - inventoryTotal,
            status: 'MISMATCH',
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Inventory status report generated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get inventory status error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to get inventory status' },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Download Excel template for items import
 * @route GET /api/v1/items/template
 * Requirements: 1.17
 */
const downloadItemsTemplate = async (req, res) => {
  try {
    const buffer = await importExportService.generateItemsTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="items_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_ERROR',
        message: error.message || 'Failed to generate template',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  getItemByCode,
  getItemByBarcode,
  createItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
  updateItemStock,
  getLowStockItems,
  getExpiringItems,
  getItemCategories,
  scanBarcode,
  transferStock,
  searchItems,
  bulkImportItems,
  exportItems,
  downloadItemsTemplate,
  getItemWarehouseStock,
  syncItemStock,
  reconcileAllStock,
  getInventoryStatus,
};
