const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');

/**
 * Warehouse Service
 * Handles business logic for warehouse management
 * Requirements: 5.1-5.8
 */
class WarehouseService {
  /**
   * Create new warehouse
   * @param {Object} warehouseData - Warehouse data
   * @param {string} userId - User ID creating the warehouse
   * @returns {Promise<Object>} Created warehouse
   */
  async createWarehouse(warehouseData, userId) {
    // Validate required fields
    if (!warehouseData.name) {
      throw new Error('Warehouse name is required');
    }

    if (!warehouseData.location || !warehouseData.location.address) {
      throw new Error('Warehouse address is required');
    }

    // Check for duplicate name
    const existingWarehouse = await Warehouse.findOne({
      name: new RegExp(`^${warehouseData.name}$`, 'i'),
    });

    if (existingWarehouse) {
      throw new Error('Warehouse with this name already exists');
    }

    // Create warehouse
    const warehouse = new Warehouse({
      ...warehouseData,
      createdBy: userId,
    });

    await warehouse.save();
    return this.getWarehouseById(warehouse._id);
  }

  /**
   * Get all warehouses with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated warehouses
   */
  async getWarehouses(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    if (filters.keyword) {
      const searchRegex = new RegExp(filters.keyword, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { 'location.address': searchRegex },
        { 'location.city': searchRegex },
      ];
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.city) {
      query['location.city'] = new RegExp(filters.city, 'i');
    }

    if (filters.townId) {
      query.townId = filters.townId;
    }

    const [warehouses, total] = await Promise.all([
      Warehouse.find(query)
        .populate('inchargeUserId', 'username email')
        .populate('townId', 'name region')
        .populate('manager', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Warehouse.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      warehouses,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get warehouse by ID
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object>} Warehouse document
   */
  async getWarehouseById(id) {
    const warehouse = await Warehouse.findById(id)
      .populate('inchargeUserId', 'username email')
      .populate('townId', 'name region')
      .populate('manager', 'username email')
      .lean();

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return warehouse;
  }

  /**
   * Get active warehouses
   * @returns {Promise<Array>} List of active warehouses
   */
  async getActiveWarehouses() {
    return Warehouse.find({ isActive: true })
      .populate('inchargeUserId', 'username email')
      .populate('townId', 'name region')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Update warehouse
   * @param {string} id - Warehouse ID
   * @param {Object} updateData - Updated warehouse data
   * @param {string} userId - User ID updating the warehouse
   * @returns {Promise<Object>} Updated warehouse
   */
  async updateWarehouse(id, updateData, userId) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name: new RegExp(`^${updateData.name}$`, 'i'),
        _id: { $ne: id },
      });

      if (existingWarehouse) {
        throw new Error('Warehouse with this name already exists');
      }
    }

    // Update warehouse
    Object.assign(warehouse, updateData);
    warehouse.updatedAt = Date.now();
    await warehouse.save();

    return this.getWarehouseById(id);
  }

  /**
   * Delete warehouse (with stock check)
   * Requirements: 5.7 - Prevent deletion if warehouse has stock
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object>} Deleted warehouse
   */
  async deleteWarehouse(id) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Check if warehouse has stock
    const stockCount = await Inventory.countDocuments({
      warehouse: id,
      quantity: { $gt: 0 },
    });

    if (stockCount > 0) {
      throw new Error('Cannot delete warehouse with existing stock. Please transfer or remove stock first.');
    }

    // Soft delete by setting isActive to false
    warehouse.isActive = false;
    warehouse.updatedAt = Date.now();
    await warehouse.save();

    return this.getWarehouseById(id);
  }

  /**
   * Toggle warehouse status
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object>} Updated warehouse
   */
  async toggleWarehouseStatus(id) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    warehouse.isActive = !warehouse.isActive;
    warehouse.updatedAt = Date.now();
    await warehouse.save();

    return this.getWarehouseById(id);
  }

  /**
   * Get warehouse statistics
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object>} Warehouse statistics
   */
  async getWarehouseStatistics(id) {
    const warehouse = await this.getWarehouseById(id);

    // Get inventory statistics
    const inventoryStats = await Inventory.aggregate([
      { $match: { warehouse: warehouse._id } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        },
      },
    ]);

    const stats = inventoryStats.length > 0 ? inventoryStats[0] : {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
    };

    return {
      warehouse,
      statistics: {
        totalItems: stats.totalItems,
        totalQuantity: stats.totalQuantity,
        totalValue: stats.totalValue,
        capacity: warehouse.capacity,
        utilizationPercentage: warehouse.capacity
          ? ((stats.totalQuantity / warehouse.capacity) * 100).toFixed(2)
          : null,
      },
    };
  }
}

module.exports = new WarehouseService();
