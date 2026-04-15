const Area = require('../models/area');
const Town = require('../models/town');
const Customer = require('../models/Customer');

/**
 * Area Service
 * Handles business logic for area management
 * Requirements: 6.1-6.9
 */
class AreaService {
  /**
   * Create new area
   * @param {Object} areaData - Area data
   * @param {string} userId - User ID creating the area
   * @returns {Promise<Object>} Created area
   */
  async createArea(areaData, userId) {
    // Validate required fields
    if (!areaData.name) {
      throw new Error('Area name is required');
    }

    if (!areaData.townId) {
      throw new Error('Town reference is required');
    }

    // Validate town exists
    const town = await Town.findById(areaData.townId);
    if (!town) {
      throw new Error('Invalid town reference');
    }

    // Check for duplicate name within the same town
    const existingArea = await Area.findOne({
      name: new RegExp(`^${areaData.name}$`, 'i'),
      townId: areaData.townId,
    });

    if (existingArea) {
      throw new Error('Area with this name already exists in this town');
    }

    // Create area
    const area = new Area(areaData);
    await area.save();

    return this.getAreaById(area._id);
  }

  /**
   * Get all areas with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated areas
   */
  async getAreas(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    if (filters.keyword) {
      query.name = new RegExp(filters.keyword, 'i');
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.townId) {
      query.townId = filters.townId;
    }

    const [areas, total] = await Promise.all([
      Area.find(query)
        .populate('townId', 'name region')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Area.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      areas,
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
   * Get area by ID
   * @param {string} id - Area ID
   * @returns {Promise<Object>} Area document
   */
  async getAreaById(id) {
    const area = await Area.findById(id)
      .populate('townId', 'name region')
      .lean();

    if (!area) {
      throw new Error('Area not found');
    }

    return area;
  }

  /**
   * Get areas by town
   * @param {string} townId - Town ID
   * @returns {Promise<Array>} List of areas in town
   */
  async getAreasByTown(townId) {
    return Area.find({ townId, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Get active areas
   * @returns {Promise<Array>} List of active areas
   */
  async getActiveAreas() {
    return Area.find({ isActive: true })
      .populate('townId', 'name region')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Update area
   * @param {string} id - Area ID
   * @param {Object} updateData - Updated area data
   * @param {string} userId - User ID updating the area
   * @returns {Promise<Object>} Updated area
   */
  async updateArea(id, updateData, userId) {
    const area = await Area.findById(id);
    if (!area) {
      throw new Error('Area not found');
    }

    // Validate town if being updated
    if (updateData.townId) {
      const town = await Town.findById(updateData.townId);
      if (!town) {
        throw new Error('Invalid town reference');
      }
    }

    // Check for duplicate name if name or town is being updated
    if (updateData.name || updateData.townId) {
      const checkName = updateData.name || area.name;
      const checkTownId = updateData.townId || area.townId;

      const existingArea = await Area.findOne({
        name: new RegExp(`^${checkName}$`, 'i'),
        townId: checkTownId,
        _id: { $ne: id },
      });

      if (existingArea) {
        throw new Error('Area with this name already exists in this town');
      }
    }

    // Update area
    Object.assign(area, updateData);
    area.updatedAt = Date.now();
    await area.save();

    return this.getAreaById(id);
  }

  /**
   * Delete area
   * @param {string} id - Area ID
   * @returns {Promise<Object>} Deleted area
   */
  async deleteArea(id) {
    const area = await Area.findById(id);
    if (!area) {
      throw new Error('Area not found');
    }

    // Check if area has associated accounts
    const accountCount = await Customer.countDocuments({ areaId: id });
    if (accountCount > 0) {
      throw new Error('Cannot delete area with associated accounts. Please reassign accounts first.');
    }

    // Soft delete by setting isActive to false
    area.isActive = false;
    area.updatedAt = Date.now();
    await area.save();

    return this.getAreaById(id);
  }

  /**
   * Toggle area status
   * @param {string} id - Area ID
   * @returns {Promise<Object>} Updated area
   */
  async toggleAreaStatus(id) {
    const area = await Area.findById(id);
    if (!area) {
      throw new Error('Area not found');
    }

    area.isActive = !area.isActive;
    area.updatedAt = Date.now();
    await area.save();

    return this.getAreaById(id);
  }
}

module.exports = new AreaService();
