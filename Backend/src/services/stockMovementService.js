const stockMovementRepository = require('../repositories/stockMovementRepository');
const Item = require('../models/Item');

/**
 * Stock Movement Service
 * Handles business logic for stock movements
 */
class StockMovementService {
  /**
   * Record a stock movement
   * @param {Object} movementData - Movement data
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object>} Created movement
   */
  async recordMovement(movementData, userId) {
    const {
      itemId, movementType, quantity, referenceType, referenceId,
      batchInfo, movementDate, notes, warehouse, status,
    } = movementData;

    // Validate item exists
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Validate quantity
    if (!quantity || quantity === 0) {
      throw new Error('Quantity must be a non-zero number');
    }

    // Prepare movement data
    const movement = {
      itemId,
      movementType,
      quantity: this._normalizeQuantity(quantity, movementType),
      referenceType,
      referenceId,
      batchInfo,
      movementDate: movementDate || new Date(),
      notes,
      createdBy: userId,
    };

    // Include warehouse if provided
    if (warehouse) {
      movement.warehouse = warehouse;
    }

    // Include status if provided
    if (status) {
      movement.status = status;
    }

    // Create movement
    const createdMovement = await stockMovementRepository.create(movement);

    // Update Inventory + sync Item.inventory.currentStock
    // For adjustment and opening_balance: always update inventory
    // For other types: only sync if explicitly requested (to avoid double-counting
    // when calling services like salesInvoiceService already handle inventory updates)
    const shouldUpdateInventory = ['adjustment', 'opening_balance'].includes(referenceType);
    const shouldSyncOnly = movementData.syncItemStock === true;

    if (shouldUpdateInventory) {
      await this._updateInventoryStock(itemId, warehouse, movementType, Math.abs(quantity));
    } else if (shouldSyncOnly && warehouse) {
      // Only sync Item.inventory.currentStock without modifying Inventory collection
      const inventoryService = require('./inventoryService');
      await inventoryService.syncItemCurrentStock(itemId);
    }

    return createdMovement;
  }

  /**
   * Record multiple stock movements
   * @param {Array} movementsData - Array of movement data
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Array>} Created movements
   */
  async recordMultipleMovements(movementsData, userId) {
    const movements = movementsData.map((data) => ({
      ...data,
      quantity: this._normalizeQuantity(data.quantity, data.movementType),
      movementDate: data.movementDate || new Date(),
      createdBy: userId,
    }));

    return await stockMovementRepository.createMany(movements);
  }

  /**
   * Record stock adjustment
   * @param {String} itemId - Item ID
   * @param {Number} adjustmentQuantity - Adjustment quantity (positive or negative)
   * @param {String} reason - Reason for adjustment
   * @param {String} userId - User ID performing the action
   * @param {String} [warehouseId] - Warehouse ID (required for per-warehouse tracking)
   * @returns {Promise<Object>} Created movement
   */
  async recordAdjustment(itemId, adjustmentQuantity, reason, userId, warehouseId = null) {
    if (adjustmentQuantity === 0) {
      throw new Error('Adjustment quantity cannot be zero');
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Determine movement type: positive = in, negative = out
    const movementType = adjustmentQuantity > 0 ? 'in' : 'out';

    const movement = await this.recordMovement(
      {
        itemId,
        movementType,
        quantity: Math.abs(adjustmentQuantity),
        referenceType: 'adjustment',
        notes: reason,
        warehouse: warehouseId,
        status: 'completed',
      },
      userId,
    );

    return movement;
  }

  /**
   * Record stock correction
   * @param {String} itemId - Item ID
   * @param {Number} actualStock - Actual stock count
   * @param {String} reason - Reason for correction
   * @param {String} userId - User ID performing the action
   * @param {String} [warehouseId] - Warehouse ID
   * @returns {Promise<Object>} Created movement
   */
  async recordCorrection(itemId, actualStock, reason, userId, warehouseId = null) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.inventory?.currentStock || 0;
    const difference = actualStock - currentStock;

    if (difference === 0) {
      throw new Error('No correction needed - stock matches actual count');
    }

    const correctionReason = `Stock correction: ${reason}. Previous: ${currentStock}, Actual: ${actualStock}, Difference: ${difference}`;

    return await this.recordAdjustment(itemId, difference, correctionReason, userId, warehouseId);
  }

  /**
   * Get stock movement by ID
   * @param {String} id - Movement ID
   * @returns {Promise<Object>} Stock movement
   */
  async getMovementById(id) {
    const movement = await stockMovementRepository.findById(id);
    if (!movement) {
      throw new Error('Stock movement not found');
    }
    return movement;
  }

  /**
   * Get stock movements with filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Movements and pagination info
   */
  async getMovements(filters = {}, options = {}) {
    const {
      page = 1, limit = 50, sortBy = 'movementDate', sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [movements, total] = await Promise.all([
      stockMovementRepository.findAll(filters, { limit, skip, sort }),
      stockMovementRepository.count(filters),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get stock movements for an item
   * @param {String} itemId - Item ID
   * @param {Number} limit - Maximum number of records
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByItem(itemId, limit = 50) {
    return await stockMovementRepository.findByItem(itemId, limit);
  }

  /**
   * Get stock movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByDateRange(startDate, endDate, filters = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    return await stockMovementRepository.findByDateRange(startDate, endDate, filters);
  }

  /**
   * Get stock movements by reference
   * @param {String} referenceType - Reference type
   * @param {String} referenceId - Reference ID
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByReference(referenceType, referenceId) {
    return await stockMovementRepository.findByReference(referenceType, referenceId);
  }

  /**
   * Get stock movement history for an item
   * @param {String} itemId - Item ID
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Object>} Movement history with summary
   */
  async getItemMovementHistory(itemId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const [movements, summary, currentBalance] = await Promise.all([
      stockMovementRepository.findByDateRange(startDate, endDate, { itemId }),
      stockMovementRepository.getMovementsSummary(itemId, days),
      stockMovementRepository.calculateStockBalance(itemId),
    ]);

    return {
      itemId,
      period: { startDate, endDate, days },
      currentBalance,
      movements,
      summary,
    };
  }

  /**
   * Get stock balance for an item
   * @param {String} itemId - Item ID
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Number>} Stock balance
   */
  async getStockBalance(itemId, asOfDate = new Date(), warehouseId = null) {
    return await stockMovementRepository.calculateStockBalance(itemId, asOfDate, warehouseId);
  }

  /**
   * Get expired batches
   * @returns {Promise<Array>} Expired batch movements
   */
  async getExpiredBatches() {
    return await stockMovementRepository.findExpiredBatches();
  }

  /**
   * Get stock movement statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Movement statistics
   */
  async getMovementStatistics(startDate, endDate) {
    const filters = {};
    if (startDate && endDate) {
      filters.movementDate = { $gte: startDate, $lte: endDate };
    }

    return await stockMovementRepository.getStatistics(filters);
  }

  /**
   * Get item-wise movement report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Item-wise movement summary
   */
  async getItemWiseMovementReport(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    return await stockMovementRepository.getItemWiseSummary(startDate, endDate);
  }

  /**
   * Validate stock availability
   * @param {String} itemId - Item ID
   * @param {Number} requiredQuantity - Required quantity
   * @returns {Promise<Object>} Validation result
   */
  async validateStockAvailability(itemId, requiredQuantity) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.inventory?.currentStock || 0;
    const isAvailable = currentStock >= requiredQuantity;

    return {
      itemId,
      itemCode: item.code,
      itemName: item.name,
      currentStock,
      requiredQuantity,
      isAvailable,
      shortfall: isAvailable ? 0 : requiredQuantity - currentStock,
    };
  }

  /**
   * Get low stock items based on movements
   * @param {Number} days - Number of days to analyze
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItems(days = 30) {
    const items = await Item.find({
      isActive: true,
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] },
    });

    const itemsWithMovements = await Promise.all(
      items.map(async (item) => {
        const summary = await stockMovementRepository.getMovementsSummary(item._id, days);
        return {
          item: {
            id: item._id,
            code: item.code,
            name: item.name,
            category: item.category,
          },
          stock: {
            current: item.inventory?.currentStock || 0,
            min: item.inventory?.minStock || 0,
            max: item.inventory?.maxStock || 0,
          },
          recentMovements: summary,
        };
      }),
    );

    return itemsWithMovements;
  }

  /**
   * Normalize quantity based on movement type
   * @private
   */
  _normalizeQuantity(quantity, movementType) {
    const absQuantity = Math.abs(quantity);

    if (movementType === 'in') {
      return absQuantity;
    } if (movementType === 'out') {
      return -absQuantity;
    }

    // For adjustments, keep the sign as provided
    return quantity;
  }

  /**
   * Update Inventory collection and sync Item.inventory.currentStock
   * Uses the Inventory collection as source of truth instead of directly modifying Item
   * @private
   */
  async _updateInventoryStock(itemId, warehouseId, movementType, quantity) {
    const Inventory = require('../models/Inventory');
    const mongoose = require('mongoose');

    // If no warehouseId provided, fall back to direct Item update for backward compatibility
    if (!warehouseId) {
      const item = await Item.findById(itemId);
      if (!item) throw new Error('Item not found');
      if (!item.inventory) item.inventory = { currentStock: 0 };

      const delta = movementType === 'out' ? -quantity : quantity;
      item.inventory.currentStock = Math.max(0, (item.inventory.currentStock || 0) + delta);
      await item.save();
      return item;
    }

    // Determine increment amount
    const delta = movementType === 'out' ? -quantity : quantity;

    // Atomically update Inventory collection
    const result = await Inventory.findOneAndUpdate(
      {
        item: new mongoose.Types.ObjectId(itemId),
        warehouse: new mongoose.Types.ObjectId(warehouseId),
      },
      {
        $inc: { quantity: delta },
        $set: { lastUpdated: new Date() },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // Verify stock didn't go negative for decreases
    if (result.quantity < 0) {
      // Rollback
      await Inventory.findByIdAndUpdate(result._id, { $inc: { quantity: -delta } });
      throw new Error('Adjustment would result in negative stock');
    }

    // Sync Item.inventory.currentStock from Inventory collection
    const inventoryService = require('./inventoryService');
    await inventoryService.syncItemCurrentStock(itemId);

    return result;
  }
}

module.exports = new StockMovementService();
