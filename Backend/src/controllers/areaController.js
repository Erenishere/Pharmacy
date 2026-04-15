const areaService = require('../services/areaService');

/**
 * Area Controller
 * Handles HTTP requests for area management
 * Requirements: 6.1-6.9
 */

/**
 * Create new area
 * @route POST /api/v1/areas
 */
const createArea = async (req, res) => {
  try {
    const areaData = req.body;
    const userId = req.user?.id || req.user?._id;

    const area = await areaService.createArea(areaData, userId);

    return res.status(201).json({
      success: true,
      data: area,
      message: 'Area created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create area error:', error);

    if (
      error.message === 'Area name is required'
      || error.message === 'Town reference is required'
      || error.message === 'Invalid town reference'
      || error.message === 'Area with this name already exists in this town'
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
        message: error.message || 'Failed to create area',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all areas
 * @route GET /api/v1/areas
 */
const getAllAreas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      isActive,
      townId,
    } = req.query;

    const filters = {
      ...(keyword && { keyword }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(townId && { townId }),
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await areaService.getAreas(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.areas,
      pagination: result.pagination,
      message: 'Areas retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all areas error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve areas',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get area by ID
 * @route GET /api/v1/areas/:id
 */
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await areaService.getAreaById(id);

    return res.status(200).json({
      success: true,
      data: area,
      message: 'Area retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get area by ID error:', error);

    if (error.message === 'Area not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AREA_NOT_FOUND',
          message: 'Area not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve area',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get areas by town
 * @route GET /api/v1/areas/town/:townId
 */
const getAreasByTown = async (req, res) => {
  try {
    const { townId } = req.params;
    const areas = await areaService.getAreasByTown(townId);

    return res.status(200).json({
      success: true,
      data: areas,
      count: areas.length,
      message: 'Areas retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get areas by town error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve areas',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update area
 * @route PUT /api/v1/areas/:id
 */
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id || req.user?._id;

    const area = await areaService.updateArea(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: area,
      message: 'Area updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update area error:', error);

    if (error.message === 'Area not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AREA_NOT_FOUND',
          message: 'Area not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Invalid town reference'
      || error.message === 'Area with this name already exists in this town'
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
        message: error.message || 'Failed to update area',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete area
 * @route DELETE /api/v1/areas/:id
 */
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await areaService.deleteArea(id);

    return res.status(200).json({
      success: true,
      data: area,
      message: 'Area deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete area error:', error);

    if (error.message === 'Area not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AREA_NOT_FOUND',
          message: 'Area not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot delete area with associated accounts')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AREA_HAS_DEPENDENCIES',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete area',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle area status
 * @route PATCH /api/v1/areas/:id/status
 */
const toggleAreaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await areaService.toggleAreaStatus(id);

    return res.status(200).json({
      success: true,
      data: area,
      message: `Area ${area.isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle area status error:', error);

    if (error.message === 'Area not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AREA_NOT_FOUND',
          message: 'Area not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle area status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createArea,
  getAllAreas,
  getAreaById,
  getAreasByTown,
  updateArea,
  deleteArea,
  toggleAreaStatus,
};
