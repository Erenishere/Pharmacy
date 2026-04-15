const Town = require('../models/town');
const Area = require('../models/area');
const Customer = require('../models/Customer');

/**
 * Town Service
 * Handles business logic for town management
 * Requirements: 6.1-6.9
 */
class TownService {
  /**
   * Create new town
   * @param {Object} townData - Town data
   * @param {string} userId - User ID creating the town
   * @returns {Promise<Object>} Created town
   */
  async createTown(townData, userId) {
    // Validate required fields
    if (!townData.name) {
      throw new Error('Town name is required');
    }

    // Check for duplicate name
    const existingTown = await Town.findOne({
      name: new RegExp(`^${townData.name}$`, 'i'),
    });

    if (existingTown) {
      throw new Error('Town with this name already exists');
    }

    // Create town
    const town = new Town(townData);
    await town.save();

    return this.getTownById(town._id);
  }

  /**
   * Get all towns with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated towns
   */
  async getTowns(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    if (filters.keyword) {
      const searchRegex = new RegExp(filters.keyword, 'i');
      query.$or = [
        { name: searchRegex },
        { region: searchRegex },
      ];
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.region) {
      query.region = new RegExp(filters.region, 'i');
    }

    const [towns, total] = await Promise.all([
      Town.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Town.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      towns,
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
   * Get town by ID
   * @param {string} id - Town ID
   * @returns {Promise<Object>} Town document
   */
  async getTownById(id) {
    const town = await Town.findById(id).lean();

    if (!town) {
      throw new Error('Town not found');
    }

    return town;
  }

  /**
   * Get active towns
   * @returns {Promise<Array>} List of active towns
   */
  async getActiveTowns() {
    return Town.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Get towns by region
   * @param {string} region - Region name
   * @returns {Promise<Array>} List of towns in region
   */
  async getTownsByRegion(region) {
    return Town.find({
      region: new RegExp(region, 'i'),
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Update town
   * @param {string} id - Town ID
   * @param {Object} updateData - Updated town data
   * @param {string} userId - User ID updating the town
   * @returns {Promise<Object>} Updated town
   */
  async updateTown(id, updateData, userId) {
    const town = await Town.findById(id);
    if (!town) {
      throw new Error('Town not found');
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== town.name) {
      const existingTown = await Town.findOne({
        name: new RegExp(`^${updateData.name}$`, 'i'),
        _id: { $ne: id },
      });

      if (existingTown) {
        throw new Error('Town with this name already exists');
      }
    }

    // Update town
    Object.assign(town, updateData);
    town.updatedAt = Date.now();
    await town.save();

    return this.getTownById(id);
  }

  /**
   * Delete town (with account check)
   * Requirements: 6.8 - Prevent deletion if town has associated accounts or areas
   * @param {string} id - Town ID
   * @returns {Promise<Object>} Deleted town
   */
  async deleteTown(id) {
    const town = await Town.findById(id);
    if (!town) {
      throw new Error('Town not found');
    }

    // Check if town has associated areas
    const areaCount = await Area.countDocuments({ townId: id });
    if (areaCount > 0) {
      throw new Error('Cannot delete town with associated areas. Please delete or reassign areas first.');
    }

    // Check if town has associated accounts
    const accountCount = await Customer.countDocuments({ townId: id });
    if (accountCount > 0) {
      throw new Error('Cannot delete town with associated accounts. Please reassign accounts first.');
    }

    // Soft delete by setting isActive to false
    town.isActive = false;
    town.updatedAt = Date.now();
    await town.save();

    return this.getTownById(id);
  }

  /**
   * Toggle town status
   * @param {string} id - Town ID
   * @returns {Promise<Object>} Updated town
   */
  async toggleTownStatus(id) {
    const town = await Town.findById(id);
    if (!town) {
      throw new Error('Town not found');
    }

    town.isActive = !town.isActive;
    town.updatedAt = Date.now();
    await town.save();

    return this.getTownById(id);
  }

  /**
   * Get town with areas
   * @param {string} id - Town ID
   * @returns {Promise<Object>} Town with areas
   */
  async getTownWithAreas(id) {
    const town = await this.getTownById(id);
    const areas = await Area.find({ townId: id, isActive: true })
      .sort({ name: 1 })
      .lean();

    return {
      ...town,
      areas,
    };
  }
}

module.exports = new TownService();
