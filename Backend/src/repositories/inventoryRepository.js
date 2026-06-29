const Inventory = require('../models/Inventory');
const Item = require('../models/Item');

class InventoryRepository {
  /**
   * Create a new inventory record
   * @param {Object} inventoryData - Inventory data
   * @returns {Promise<Object>} Created inventory record
   */
  async create(inventoryData) {
    const inventory = new Inventory(inventoryData);
    return inventory.save();
  }

  /**
   * Find inventory record by ID
   * @param {string} id - Inventory record ID
   * @returns {Promise<Object|null>} Inventory record or null if not found
   */
  async findById(id) {
    return Inventory.findById(id)
      .populate('item', 'name code')
      .populate('warehouse', 'name code');
  }

  /**
   * Find inventory records by item ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of inventory records
   */
  async findByItemId(itemId) {
    return Inventory.find({ item: itemId })
      .populate('item', 'name code')
      .populate('warehouse', 'name code')
      .sort({ updatedAt: -1 });
  }

  /**
   * Find inventory records by warehouse ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Array of inventory records
   */
  async findByWarehouseId(warehouseId) {
    return Inventory.find({ warehouse: warehouseId })
      .populate('item', 'name code')
      .sort({ 'item.name': 1 });
  }

  /**
   * Find inventory record by item and warehouse
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {string} [batchNumber] - Optional batch number
   * @returns {Promise<Object|null>} Inventory record or null if not found
   */
  async findByItemAndLocation(itemId, warehouseId, batchNumber = null, session = null) {
    const query = { item: itemId, warehouse: warehouseId };
    if (batchNumber) {
      query.batchNumber = batchNumber;
    }
    const request = Inventory.findOne(query)
      .populate('item', 'name code')
      .populate('warehouse', 'name code');

    return session ? request.session(session) : request;
  }

  /**
   * Update inventory quantity atomically
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {string} [batchNumber] - Optional batch number
   * @param {Object} [session] - Optional session for transactions
   * @returns {Promise<Object>} Updated inventory record
   */
  async updateQuantity(itemId, warehouseId, quantity, batchNumber = null, session = null) {
    const query = { item: itemId, warehouse: warehouseId };
    if (batchNumber) {
      query.batchNumber = batchNumber;
    }

    if (quantity < 0) {
      query.quantity = { $gte: Math.abs(quantity) };
    }

    // Use findOneAndUpdate with $inc for atomic update
    // This prevents race conditions where multiple requests try to update the same stock
    const update = {
      $inc: {
        quantity,
        available: quantity // Keep stored available field in sync with quantity changes
      },
      $set: { lastUpdated: new Date() },
    };

    const options = {
      new: true, // Return the modified document
      upsert: quantity > 0, // Removal must never create or hide a stock record
      setDefaultsOnInsert: true,
      session,
    };

    try {
      const inventory = await Inventory.findOneAndUpdate(query, update, options);

      if (!inventory && quantity < 0) {
        throw new Error('Insufficient stock available in selected warehouse/batch');
      }

      return inventory;
    } catch (error) {
      if (error.code === 11000) { // Handle potential race condition on upsert
        return this.updateQuantity(itemId, warehouseId, quantity, batchNumber, session);
      }
      throw error;
    }
  }

  /**
   * Transfer inventory between warehouses
   * @param {string} itemId - Item ID
   * @param {string} fromWarehouseId - Source warehouse ID
   * @param {string} toWarehouseId - Destination warehouse ID
   * @param {number} quantity - Quantity to transfer
   * @param {string} [batchNumber] - Optional batch number
   * @returns {Promise<Object>} Result of the transfer
   */
  async transferInventory(itemId, fromWarehouseId, toWarehouseId, quantity, batchNumber = null) {
    // Start a session for transaction
    const session = await Inventory.startSession();
    session.startTransaction();

    try {
      // Remove from source warehouse
      const fromQuery = { item: itemId, warehouse: fromWarehouseId };
      if (batchNumber) fromQuery.batchNumber = batchNumber;

      const fromInventory = await Inventory.findOne(fromQuery).session(session);

      if (!fromInventory || fromInventory.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse');
      }

      fromInventory.quantity -= quantity;
      fromInventory.lastUpdated = new Date();
      await fromInventory.save({ session });

      // Add to destination warehouse
      const toQuery = { item: itemId, warehouse: toWarehouseId };
      if (batchNumber) toQuery.batchNumber = batchNumber;

      let toInventory = await Inventory.findOne(toQuery).session(session);

      if (!toInventory) {
        toInventory = new Inventory({
          item: itemId,
          warehouse: toWarehouseId,
          quantity: 0,
          ...(batchNumber && { batchNumber }),
        });
      }

      toInventory.quantity += quantity;
      toInventory.lastUpdated = new Date();
      await toInventory.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        fromWarehouse: fromWarehouseId,
        toWarehouse: toWarehouseId,
        quantity,
        item: itemId,
        batchNumber,
        timestamp: new Date(),
      };
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get current stock level for an item across all warehouses
   * @param {string} itemId - Item ID
   * @returns {Promise<number>} Total quantity in stock
   */
  async getTotalStock(itemId) {
    const result = await Inventory.aggregate([
      { $match: { item: itemId } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get stock for a specific item in a specific warehouse
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<number>} Stock quantity in that warehouse
   */
  async getWarehouseItemStock(itemId, warehouseId) {
    const record = await Inventory.findOne({ item: itemId, warehouse: warehouseId });
    return record ? record.quantity : 0;
  }

  /**
   * Get stock levels by warehouse for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of stock levels by warehouse
   */
  async getStockByLocation(itemId) {
    return Inventory.aggregate([
      { $match: { item: itemId } },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouseInfo',
        },
      },
      { $unwind: { path: '$warehouseInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          location: '$warehouseInfo.name',
          locationId: '$warehouseInfo._id',
          quantity: 1,
          lastUpdated: 1,
        },
      },
      { $sort: { location: 1 } },
    ]);
  }

  /**
   * Get low stock items across all warehouses
   * @param {number} [threshold=10] - Threshold for low stock
   * @returns {Promise<Array>} Array of low stock items
   */
  async getLowStockItems(threshold = 10) {
    return Inventory.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemInfo',
        },
      },
      { $unwind: '$itemInfo' },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouseInfo',
        },
      },
      { $unwind: { path: '$warehouseInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          itemId: '$item',
          itemName: '$itemInfo.name',
          itemCode: '$itemInfo.code',
          warehouseId: '$warehouse',
          warehouseName: { $ifNull: ['$warehouseInfo.name', 'Unknown'] },
          currentStock: '$quantity',
          minimumStock: '$itemInfo.inventory.minimumStock',
          lastUpdated: 1,
        },
      },
      {
        $match: {
          $expr: {
            $lte: ['$currentStock', { $ifNull: ['$minimumStock', threshold] }],
          },
        },
      },
      { $sort: { currentStock: 1 } },
    ]);
  }

  /**
   * Get inventory movement history
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.itemId] - Filter by item ID
   * @param {string} [filters.locationId] - Filter by warehouse ID (legacy param name)
   * @param {string} [filters.warehouseId] - Filter by warehouse ID
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @param {number} [limit=100] - Maximum number of records to return
   * @returns {Promise<Array>} Array of inventory movements
   */
  async getMovementHistory(filters = {}, limit = 100) {
    const {
      itemId,
      locationId,
      warehouseId,
      batchId,
      startDate,
      endDate,
      ...otherFilters
    } = filters;

    const query = {};

    if (itemId) query.item = itemId;
    // Support both locationId (legacy) and warehouseId
    if (warehouseId || locationId) query.warehouse = warehouseId || locationId;

    // Date range filter
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) query.updatedAt.$lte = new Date(endDate);
    }

    // Add other filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });

    return Inventory.find(query)
      .populate('item', 'name code')
      .populate('warehouse', 'name code')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit, 10));
  }

  /**
   * Get inventory valuation report
   * @param {string} [warehouseId] - Optional warehouse ID to filter by
   * @returns {Promise<Object>} Inventory valuation summary
   */
  async getInventoryValuation(warehouseId = null) {
    const matchStage = {};
    if (warehouseId) {
      matchStage.warehouse = warehouseId;
    }

    return Inventory.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemInfo',
        },
      },
      { $unwind: '$itemInfo' },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouseInfo',
        },
      },
      { $unwind: { path: '$warehouseInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          itemId: '$item',
          itemName: '$itemInfo.name',
          itemCode: '$itemInfo.code',
          warehouseId: '$warehouse',
          warehouseName: { $ifNull: ['$warehouseInfo.name', 'Unknown'] },
          quantity: 1,
          costPrice: '$itemInfo.pricing.costPrice',
          salePrice: '$itemInfo.pricing.salePrice',
          lastUpdated: 1,
        },
      },
      {
        $project: {
          itemId: 1,
          itemName: 1,
          itemCode: 1,
          warehouseId: 1,
          warehouseName: 1,
          quantity: 1,
          costPrice: 1,
          salePrice: 1,
          totalCost: { $multiply: ['$quantity', '$costPrice'] },
          totalValue: { $multiply: ['$quantity', '$salePrice'] },
          lastUpdated: 1,
        },
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          totalValue: { $sum: '$totalValue' },
          items: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          totalQuantity: 1,
          totalCost: { $round: ['$totalCost', 2] },
          totalValue: { $round: ['$totalValue', 2] },
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                itemId: '$$item.itemId',
                itemName: '$$item.itemName',
                itemCode: '$$item.itemCode',
                warehouseId: '$$item.warehouseId',
                warehouseName: '$$item.warehouseName',
                quantity: '$$item.quantity',
                costPrice: { $round: ['$$item.costPrice', 2] },
                salePrice: { $round: ['$$item.salePrice', 2] },
                totalCost: { $round: [{ $multiply: ['$$item.quantity', '$$item.costPrice'] }, 2] },
                totalValue: { $round: [{ $multiply: ['$$item.quantity', '$$item.salePrice'] }, 2] },
                lastUpdated: '$$item.lastUpdated',
              },
            },
          },
        },
      },
    ]);
  }

  /**
   * Get stock by warehouse for a specific item
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Object>} Stock record
   */
  async getStockByWarehouse(itemId, warehouseId) {
    return Inventory.findOne({ item: itemId, warehouse: warehouseId });
  }

  /**
   * Get all warehouse stock for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Stock records across all warehouses
   */
  async getAllWarehouseStock(itemId) {
    return Inventory.find({ item: itemId })
      .populate('warehouse', 'name code location')
      .sort({ 'warehouse.name': 1 });
  }
}

module.exports = new InventoryRepository();
