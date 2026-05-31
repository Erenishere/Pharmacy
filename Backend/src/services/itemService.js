const itemRepository = require('../repositories/itemRepository');
const Item = require('../models/Item');
const Company = require('../models/Company');
const Category = require('../models/category');
const SubCategory = require('../models/subcategory');
const Business = require('../models/business');
const Formula = require('../models/formula');
const FormulaSize = require('../models/formulasize');

const MAX_ITEM_LIST_LIMIT = 100;

function toPositiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Item Service
 * Handles business logic for item management
 * Requirements: 1.1-1.20
 */
class ItemService {
  static ITEM_LIST_PROJECTION = [
    'code',
    'name',
    'companyId',
    'sellingGroup',
    'formulaId',
    'formulaSizeId',
    'businessTypeId',
    'categoryId',
    'subCategoryId',
    'unit',
    'pricing',
    'tax',
    'inventory',
    'barcode',
    'sku',
    'supplier',
    'productImage',
    'manufacturer',
    'carton',
    'box',
    'unitWeight',
    'isActive',
    'createdAt',
    'updatedAt',
  ].join(' ');

  /**
   * Generate unique item code
   * @returns {Promise<string>} Generated item code
   */
  async generateItemCode() {
    const count = await Item.countDocuments();
    return `ITEM${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Validate item data comprehensively
   * @param {Object} itemData - Item data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result with errors array
   */
  async validateItemData(itemData, isUpdate = false) {
    const errors = [];

    // Requirement 1.1: Company validation
    if (!isUpdate && !itemData.companyId) {
      errors.push({ field: 'companyId', message: 'Company is required' });
    } else if (itemData.companyId) {
      const company = await Company.findById(itemData.companyId);
      if (!company) {
        errors.push({ field: 'companyId', message: 'Invalid company reference' });
      } else if (!company.isActive) {
        errors.push({ field: 'companyId', message: 'Cannot assign items to inactive company' });
      }
    }

    // Requirement 1.2: Selling group validation
    if (itemData.sellingGroup && !['A', 'B', 'C'].includes(itemData.sellingGroup)) {
      errors.push({ field: 'sellingGroup', message: 'Selling group must be A, B, or C' });
    }

    // Requirement 1.3: Formula validation
    if (itemData.formulaId) {
      const formula = await Formula.findById(itemData.formulaId);
      if (!formula) {
        errors.push({ field: 'formulaId', message: 'Invalid formula reference' });
      } else if (!formula.isActive) {
        errors.push({ field: 'formulaId', message: 'Formula is not active' });
      }
    }

    // Requirement 1.4: Formula size validation
    if (itemData.formulaSizeId) {
      const formulaSize = await FormulaSize.findById(itemData.formulaSizeId);
      if (!formulaSize) {
        errors.push({ field: 'formulaSizeId', message: 'Invalid formula size reference' });
      } else if (!formulaSize.isActive) {
        errors.push({ field: 'formulaSizeId', message: 'Formula size is not active' });
      }
    }

    // Requirement 1.5: Business type validation
    if (!isUpdate && !itemData.businessTypeId) {
      errors.push({ field: 'businessTypeId', message: 'Business type is required' });
    } else if (itemData.businessTypeId) {
      const businessType = await Business.findById(itemData.businessTypeId);
      if (!businessType) {
        errors.push({ field: 'businessTypeId', message: 'Invalid business type reference' });
      } else if (!businessType.isActive) {
        errors.push({ field: 'businessTypeId', message: 'Business type is not active' });
      }
    }

    // Requirement 1.6: Category validation
    if (!isUpdate && !itemData.categoryId) {
      errors.push({ field: 'categoryId', message: 'Category is required' });
    } else if (itemData.categoryId) {
      const category = await Category.findById(itemData.categoryId);
      if (!category) {
        errors.push({ field: 'categoryId', message: 'Invalid category reference' });
      } else if (!category.isActive) {
        errors.push({ field: 'categoryId', message: 'Category is not active' });
      }
    }

    // Sub-category validation
    if (itemData.subCategoryId) {
      const subCategory = await SubCategory.findById(itemData.subCategoryId);
      if (!subCategory) {
        errors.push({ field: 'subCategoryId', message: 'Invalid sub-category reference' });
      } else if (!subCategory.isActive) {
        errors.push({ field: 'subCategoryId', message: 'Sub-category is not active' });
      }
    }

    // Requirement 1.7: Pricing validation
    if (itemData.pricing) {
      const prices = itemData.pricing;

      // All prices must be >= 0
      const priceFields = ['purchasePrice', 'costPrice', 'salePrice', 'retailPrice',
        'wholesalePrice', 'distributorPrice', 'mrp'];

      priceFields.forEach((field) => {
        if (prices[field] !== undefined && prices[field] < 0) {
          errors.push({ field: `pricing.${field}`, message: `${field} cannot be negative` });
        }
      });

      // Sale price should be greater than cost price (warning, not error)
      if (prices.costPrice !== undefined && prices.salePrice !== undefined) {
        if (prices.salePrice < prices.costPrice) {
          console.warn('Sale price is less than cost price - this may result in loss');
        }
      }
    }

    // Requirement 1.8: Inventory validation
    if (itemData.inventory) {
      const inv = itemData.inventory;

      // Stock levels cannot be negative
      if (inv.openingStock !== undefined && inv.openingStock < 0) {
        errors.push({ field: 'inventory.openingStock', message: 'Opening stock cannot be negative' });
      }
      if (inv.currentStock !== undefined && inv.currentStock < 0) {
        errors.push({ field: 'inventory.currentStock', message: 'Current stock cannot be negative' });
      }
      if (inv.minimumStock !== undefined && inv.minimumStock < 0) {
        errors.push({ field: 'inventory.minimumStock', message: 'Minimum stock cannot be negative' });
      }
      if (inv.maximumStock !== undefined && inv.maximumStock < 0) {
        errors.push({ field: 'inventory.maximumStock', message: 'Maximum stock cannot be negative' });
      }
      if (inv.reorderPoint !== undefined && inv.reorderPoint < 0) {
        errors.push({ field: 'inventory.reorderPoint', message: 'Reorder point cannot be negative' });
      }
      if (inv.leadTime !== undefined && inv.leadTime < 0) {
        errors.push({ field: 'inventory.leadTime', message: 'Lead time cannot be negative' });
      }

      // Min <= Reorder <= Max validation
      const min = inv.minimumStock !== undefined ? inv.minimumStock : 0;
      const max = inv.maximumStock !== undefined ? inv.maximumStock : Infinity;
      const reorder = inv.reorderPoint !== undefined ? inv.reorderPoint : 0;

      if (min > max) {
        errors.push({ field: 'inventory', message: 'Minimum stock cannot be greater than maximum stock' });
      }
      if (reorder > max) {
        errors.push({ field: 'inventory.reorderPoint', message: 'Reorder point cannot be greater than maximum stock' });
      }
    }

    // Requirement 1.9: Tax validation
    if (itemData.tax) {
      const { tax } = itemData;

      // Tax percentage must be 0, 4, or 18
      if (tax.gstRate !== undefined && ![0, 4, 18].includes(tax.gstRate)) {
        errors.push({ field: 'tax.gstRate', message: 'GST rate must be 0, 4, or 18' });
      }
    }

    // Name validation
    if (!isUpdate && !itemData.name) {
      errors.push({ field: 'name', message: 'Item name is required' });
    } else if (itemData.name) {
      if (itemData.name.length < 3) {
        errors.push({ field: 'name', message: 'Item name must be at least 3 characters' });
      }
      if (itemData.name.length > 200) {
        errors.push({ field: 'name', message: 'Item name cannot exceed 200 characters' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get item by ID with populated references
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item document with populated references
   */
  async getItemById(id) {
    const item = await Item.findById(id)
      .populate('companyId', 'name code groupType')
      .populate('formulaId', 'name composition')
      .populate('formulaSizeId', 'size strength')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .populate('businessTypeId', 'name')
      .populate('supplier.primarySupplierId', 'name code contactInfo')
      .lean();

    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Get item by code
   * @param {string} code - Item code
   * @returns {Promise<Object>} Item document
   */
  async getItemByCode(code) {
    const item = await Item.findOne({ code: code.toUpperCase() })
      .populate('companyId', 'name code groupType')
      .populate('formulaId', 'name composition')
      .populate('formulaSizeId', 'size strength')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .populate('businessTypeId', 'name')
      .lean();

    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Get all items with advanced filtering and pagination
   * Requirements: 1.15-1.18
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.companyId] - Company filter
   * @param {string} [filters.categoryId] - Category filter
   * @param {string} [filters.businessTypeId] - Business type filter
   * @param {string} [filters.sellingGroup] - Selling group filter
   * @param {number} [filters.minPrice] - Minimum price
   * @param {number} [filters.maxPrice] - Maximum price
   * @param {boolean} [filters.lowStock] - Low stock filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Object>} Paginated result with items and pagination info
   */
  async getItems(filters = {}, options = {}) {
    const {
      page = 1, limit = 10, sort,
    } = options;
    const currentPage = toPositiveInteger(page, 1);
    const itemsPerPage = toPositiveInteger(limit, 10, MAX_ITEM_LIST_LIMIT);
    const skip = (currentPage - 1) * itemsPerPage;

    // Build query with filters
    const query = {};

    // Text search across multiple fields
    const keyword = String(filters.keyword || filters.search || filters.itemSearch || '').trim();
    if (keyword) {
      const escapedKeyword = escapeRegex(keyword);
      const upperKeyword = keyword.toUpperCase();
      const escapedUpperKeyword = escapeRegex(upperKeyword);
      query.$or = [
        { code: upperKeyword },
        { barcode: keyword },
        { sku: keyword },
        { code: { $regex: `^${escapedUpperKeyword}` } },
        { barcode: { $regex: `^${escapedKeyword}`, $options: 'i' } },
        { sku: { $regex: `^${escapedKeyword}`, $options: 'i' } },
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { description: { $regex: escapedKeyword, $options: 'i' } },
      ];
    }

    // Exact match filters
    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.subCategoryId) query.subCategoryId = filters.subCategoryId;
    if (filters.businessTypeId) query.businessTypeId = filters.businessTypeId;
    if (filters.sellingGroup) query.sellingGroup = filters.sellingGroup;
    if (filters.formulaId) query.formulaId = filters.formulaId;
    if (filters.mainSupplierId) query['supplier.primarySupplierId'] = filters.mainSupplierId;
    if (filters.supplierId) query['supplier.primarySupplierId'] = filters.supplierId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query['pricing.salePrice'] = {};
      if (filters.minPrice !== undefined) query['pricing.salePrice'].$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice !== undefined) query['pricing.salePrice'].$lte = parseFloat(filters.maxPrice);
    }

    // Low stock filter (Requirement 1.19)
    if (filters.lowStock) {
      query.$expr = { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] };
    }

    const [items, total] = await Promise.all([
      Item.find(query)
        .select(ItemService.ITEM_LIST_PROJECTION)
        .populate('companyId', 'name code groupType')
        .populate('formulaId', 'name')
        .populate('formulaSizeId', 'size strength')
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('businessTypeId', 'name')
        .sort(sort || { name: 1 })
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),
      Item.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      items,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage,
        itemsPerPage,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        previousPage: hasPreviousPage ? currentPage - 1 : null,
      },
    };
  }

  /**
   * Get all active items
   * @returns {Promise<Array>} List of active items
   */
  async getActiveItems() {
    return Item.find({ isActive: true })
      .populate('companyId', 'name code')
      .populate('categoryId', 'name')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Get items by category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} List of items in category
   */
  async getItemsByCategory(categoryId) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }
    return Item.find({ categoryId, isActive: true })
      .populate('companyId', 'name code')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Check low stock items
   * Requirement 1.19: Generate low stock alerts
   * @returns {Promise<Array>} List of low stock items
   */
  async checkLowStock() {
    const lowStockItems = await Item.find({
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] },
      isActive: true,
    })
      .populate('companyId', 'name code')
      .populate('categoryId', 'name')
      .populate('supplier.primarySupplierId', 'name contactInfo')
      .sort({ 'inventory.currentStock': 1 })
      .lean();

    // Add additional alert information
    return lowStockItems.map((item) => ({
      ...item,
      alertLevel: item.inventory.currentStock === 0 ? 'critical'
        : item.inventory.currentStock <= item.inventory.reorderPoint ? 'high' : 'medium',
      quantityNeeded: Math.max(0, item.inventory.maximumStock - item.inventory.currentStock),
      reorderRecommended: item.inventory.currentStock <= item.inventory.reorderPoint,
    }));
  }

  /**
   * Check expiring items
   * Requirement 1.20: Alert before expiry date
   * @param {number} daysThreshold - Number of days to look ahead (default: 30)
   * @returns {Promise<Array>} List of items with expiring batches
   */
  async checkExpiringItems(daysThreshold = 30) {
    const Batch = require('../models/Batch');
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    // Get all active batches expiring within threshold
    const expiringBatches = await Batch.find({
      expiryDate: { $lte: thresholdDate },
      remainingQuantity: { $gt: 0 },
      status: { $ne: 'expired' },
    })
      .populate({
        path: 'item',
        select: 'name code companyId categoryId pricing unit',
        populate: [
          { path: 'companyId', select: 'name code' },
          { path: 'categoryId', select: 'name' },
        ],
      })
      .populate('warehouse', 'name code')
      .sort({ expiryDate: 1 });

    // Group batches by item for the response
    const itemMap = new Map();

    for (const batch of expiringBatches) {
      if (!batch.item) continue;

      const itemId = batch.item._id.toString();
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          ...batch.item.toObject(),
          expiringBatches: [],
          totalExpiringQuantity: 0,
          nearestExpiryDays: null
        });
      }

      const itemData = itemMap.get(itemId);
      const expiryDate = new Date(batch.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      const batchInfo = {
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        stock: batch.remainingQuantity,
        warehouseName: batch.warehouse?.name || 'Unknown',
        warehouseCode: batch.warehouse?.code || '',
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        alertLevel: daysUntilExpiry < 0 ? 'critical'
          : daysUntilExpiry <= 7 ? 'high'
            : daysUntilExpiry <= 30 ? 'medium' : 'low',
      };

      itemData.expiringBatches.push(batchInfo);
      itemData.totalExpiringQuantity += batch.remainingQuantity;

      if (itemData.nearestExpiryDays === null || daysUntilExpiry < itemData.nearestExpiryDays) {
        itemData.nearestExpiryDays = daysUntilExpiry;
      }
    }

    return Array.from(itemMap.values());
  }


  /**
   * Create new item with validation
   * Requirements: 1.1-1.14
   * @param {Object} itemData - Item data
   * @param {string} userId - User ID creating the item
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData, userId) {
    // Comprehensive validation
    const validation = await this.validateItemData(itemData, false);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    // Generate item code if not provided
    if (!itemData.code) {
      itemData.code = await this.generateItemCode();
    } else {
      // Check code uniqueness
      const codeExists = await Item.findOne({ code: itemData.code.toUpperCase() });
      if (codeExists) {
        throw new Error('Item code already exists');
      }
    }

    // Check barcode uniqueness if provided
    if (itemData.barcode) {
      const barcodeExists = await Item.findOne({ barcode: itemData.barcode });
      if (barcodeExists) {
        throw new Error('Barcode already exists');
      }
    }

    // Set created by user
    itemData.createdBy = userId;

    // Initialize current stock from opening stock if provided
    if (itemData.inventory && itemData.inventory.openingStock !== undefined) {
      itemData.inventory.currentStock = itemData.inventory.openingStock;
    }

    // Create the item
    const item = new Item(itemData);
    await item.save();

    // Return populated item
    return this.getItemById(item._id);
  }

  /**
   * Update item with audit trail
   * Requirements: 1.1-1.14
   * @param {string} id - Item ID
   * @param {Object} updateData - Updated item data
   * @param {string} userId - User ID updating the item
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(id, updateData, userId) {
    // Check if item exists
    const existingItem = await Item.findById(id);
    if (!existingItem) {
      throw new Error('Item not found');
    }

    // Validate update data
    const validation = await this.validateItemData(updateData, true);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    // Validate code uniqueness if being updated
    if (updateData.code && updateData.code.toUpperCase() !== existingItem.code) {
      const codeExists = await Item.findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (codeExists) {
        throw new Error('Item code already exists');
      }
    }

    // Validate barcode uniqueness if being updated
    if (updateData.barcode && updateData.barcode !== existingItem.barcode) {
      const barcodeExists = await Item.findOne({
        barcode: updateData.barcode,
        _id: { $ne: id },
      });
      if (barcodeExists) {
        throw new Error('Barcode already exists');
      }
    }

    // Set updated by user for audit trail
    updateData.updatedBy = userId;

    // Update the item
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    // Return populated item
    return this.getItemById(updatedItem._id);
  }

  /**
   * Delete item (soft delete)
   * @param {string} id - Item ID
   * @param {string} userId - User ID deleting the item
   * @returns {Promise<Object>} Deleted item
   */
  async deleteItem(id, userId) {
    const item = await Item.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }

    // Soft delete by setting isActive to false
    item.isActive = false;
    item.updatedBy = userId;
    await item.save();

    return this.getItemById(id);
  }

  /**
   * Update item stock level
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to add/remove
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<Object>} Updated item
   */
  async updateStockLevel(itemId, quantity, operation = 'add') {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (!['add', 'subtract'].includes(operation)) {
      throw new Error("Operation must be either 'add' or 'subtract'");
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // For subtraction, check if enough stock is available
    if (operation === 'subtract') {
      if (item.inventory.currentStock < quantity) {
        throw new Error('Insufficient stock');
      }
    }

    // Update stock
    if (operation === 'add') {
      item.inventory.currentStock += quantity;
    } else {
      item.inventory.currentStock = Math.max(0, item.inventory.currentStock - quantity);
    }

    await item.save();
    return this.getItemById(itemId);
  }

  /**
   * Check if item has sufficient stock
   * @param {string} id - Item ID
   * @param {number} quantity - Required quantity
   * @returns {Promise<boolean>} True if sufficient stock is available
   */
  async checkStockAvailability(id, quantity) {
    const item = await Item.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item.inventory.currentStock >= quantity;
  }

  /**
   * Get item categories
   * @returns {Promise<Array>} List of unique categories
   */
  async getCategories() {
    return Category.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  /**
   * Find item by barcode
   * @param {string} barcode - Item barcode
   * @param {Object} options - Additional options
   * @param {string} options.warehouseId - Optional warehouse ID to filter batches
   * @returns {Promise<Object>} Item with stock details and batch information
   */
  async findItemByBarcode(barcode, options = {}) {
    if (!barcode) {
      throw new Error('Barcode is required');
    }

    const item = await Item.findOne({ barcode, isActive: true })
      .populate('companyId', 'name code groupType')
      .populate('formulaId', 'name')
      .populate('formulaSizeId', 'size strength')
      .populate('categoryId', 'name')
      .populate('businessTypeId', 'name')
      .lean();

    if (!item) {
      throw new Error('Item not found with the provided barcode');
    }

    // Get batches for this item
    const Batch = require('../models/Batch');
    let batches = [];

    if (options.warehouseId) {
      // Get batches for specific warehouse
      batches = await Batch.findByItemAndWarehouse(item._id, options.warehouseId);
    } else {
      // Get all active batches for this item across all warehouses
      batches = await Batch.find({
        item: item._id,
        remainingQuantity: { $gt: 0 },
        expiryDate: { $gte: new Date() },
        status: 'active',
      })
        .populate('warehouse', 'name code')
        .sort({ expiryDate: 1 }); // Sort by expiry date (FIFO)
    }

    // Format batch information
    const batchList = batches.map((batch) => ({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      warehouseId: batch.warehouse?._id,
      warehouseName: batch.warehouse?.name,
      warehouseCode: batch.warehouse?.code,
      expiryDate: batch.expiryDate,
      manufacturingDate: batch.manufacturingDate,
      availableQuantity: batch.remainingQuantity,
      unitCost: batch.unitCost,
      isExpiringSoon: batch.isExpiringSoon,
    }));

    // Return item with available stock information and batches
    return {
      ...item,
      availableStock: item.inventory?.currentStock || 0,
      isLowStock: item.inventory?.currentStock <= item.inventory?.minimumStock,
      batches: batchList,
      hasBatches: batchList.length > 0,
      requiresBatchSelection: batchList.length > 1,
    };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getItems instead
   */
  async getAllItems(filters = {}, options = {}) {
    return this.getItems(filters, options);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use checkLowStock instead
   */
  async getLowStockItems() {
    return this.checkLowStock();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use updateStockLevel instead
   */
  async updateItemStock(id, quantity, operation = 'add') {
    return this.updateStockLevel(id, quantity, operation);
  }
}

module.exports = new ItemService();
