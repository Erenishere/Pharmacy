const townService = require('../services/townService');

/**
 * Town Controller
 * Handles HTTP requests for town management
 * Requirements: 6.1-6.9
 */

/**
 * Create new town
 * @route POST /api/v1/towns
 */
const createTown = async (req, res) => {
  try {
    const townData = req.body;
    const userId = req.user?.id || req.user?._id;

    const town = await townService.createTown(townData, userId);

    return res.status(201).json({
      success: true,
      data: town,
      message: 'Town created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create town error:', error);

    if (
      error.message === 'Town name is required'
      || error.message === 'Town with this name already exists'
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
        message: error.message || 'Failed to create town',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all towns
 * @route GET /api/v1/towns
 */
const getAllTowns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      isActive,
      region,
    } = req.query;

    const filters = {
      ...(keyword && { keyword }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(region && { region }),
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await townService.getTowns(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.towns,
      pagination: result.pagination,
      message: 'Towns retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all towns error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve towns',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get town by ID
 * @route GET /api/v1/towns/:id
 */
const getTownById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAreas } = req.query;

    let town;
    if (includeAreas === 'true') {
      town = await townService.getTownWithAreas(id);
    } else {
      town = await townService.getTownById(id);
    }

    return res.status(200).json({
      success: true,
      data: town,
      message: 'Town retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get town by ID error:', error);

    if (error.message === 'Town not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOWN_NOT_FOUND',
          message: 'Town not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve town',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update town
 * @route PUT /api/v1/towns/:id
 */
const updateTown = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id || req.user?._id;

    const town = await townService.updateTown(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: town,
      message: 'Town updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update town error:', error);

    if (error.message === 'Town not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOWN_NOT_FOUND',
          message: 'Town not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Town with this name already exists') {
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
        message: error.message || 'Failed to update town',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete town (with account check)
 * @route DELETE /api/v1/towns/:id
 */
const deleteTown = async (req, res) => {
  try {
    const { id } = req.params;
    const town = await townService.deleteTown(id);

    return res.status(200).json({
      success: true,
      data: town,
      message: 'Town deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete town error:', error);

    if (error.message === 'Town not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOWN_NOT_FOUND',
          message: 'Town not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Cannot delete town with associated areas')
      || error.message.includes('Cannot delete town with associated accounts')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOWN_HAS_DEPENDENCIES',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete town',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle town status
 * @route PATCH /api/v1/towns/:id/status
 */
const toggleTownStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const town = await townService.toggleTownStatus(id);

    return res.status(200).json({
      success: true,
      data: town,
      message: `Town ${town.isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle town status error:', error);

    if (error.message === 'Town not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOWN_NOT_FOUND',
          message: 'Town not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle town status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createTown,
  getAllTowns,
  getTownById,
  updateTown,
  deleteTown,
  toggleTownStatus,
};
