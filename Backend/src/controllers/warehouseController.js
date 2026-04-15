const warehouseService = require('../services/warehouseService');

/**
 * Warehouse Controller
 * Handles HTTP requests for warehouse management
 * Requirements: 5.1-5.8
 */

/**
 * Create new warehouse
 * @route POST /api/v1/warehouses
 */
const createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
    const userId = req.user?.id || req.user?._id;

    const warehouse = await warehouseService.createWarehouse(warehouseData, userId);

    return res.status(201).json({
      success: true,
      data: warehouse,
      message: 'Warehouse created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create warehouse error:', error);

    if (
      error.message === 'Warehouse name is required'
      || error.message === 'Warehouse address is required'
      || error.message === 'Warehouse with this name already exists'
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
        message: error.message || 'Failed to create warehouse',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all warehouses
 * @route GET /api/v1/warehouses
 */
const getAllWarehouses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      isActive,
      city,
      townId,
    } = req.query;

    const filters = {
      ...(keyword && { keyword }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(city && { city }),
      ...(townId && { townId }),
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const result = await warehouseService.getWarehouses(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.warehouses,
      pagination: result.pagination,
      message: 'Warehouses retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all warehouses error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve warehouses',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get warehouse by ID
 * @route GET /api/v1/warehouses/:id
 */
const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await warehouseService.getWarehouseById(id);

    return res.status(200).json({
      success: true,
      data: warehouse,
      message: 'Warehouse retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get warehouse by ID error:', error);

    if (error.message === 'Warehouse not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve warehouse',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update warehouse
 * @route PUT /api/v1/warehouses/:id
 */
const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id || req.user?._id;

    const warehouse = await warehouseService.updateWarehouse(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: warehouse,
      message: 'Warehouse updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update warehouse error:', error);

    if (error.message === 'Warehouse not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Warehouse with this name already exists') {
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
        message: error.message || 'Failed to update warehouse',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete warehouse (with stock check)
 * @route DELETE /api/v1/warehouses/:id
 */
const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await warehouseService.deleteWarehouse(id);

    return res.status(200).json({
      success: true,
      data: warehouse,
      message: 'Warehouse deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);

    if (error.message === 'Warehouse not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot delete warehouse with existing stock')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WAREHOUSE_HAS_STOCK',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete warehouse',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle warehouse status
 * @route PATCH /api/v1/warehouses/:id/status
 */
const toggleWarehouseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await warehouseService.toggleWarehouseStatus(id);

    return res.status(200).json({
      success: true,
      data: warehouse,
      message: `Warehouse ${warehouse.isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle warehouse status error:', error);

    if (error.message === 'Warehouse not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle warehouse status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get warehouse statistics
 * @route GET /api/v1/warehouses/:id/statistics
 */
const getWarehouseStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const statistics = await warehouseService.getWarehouseStatistics(id);

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Warehouse statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get warehouse statistics error:', error);

    if (error.message === 'Warehouse not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve warehouse statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  toggleWarehouseStatus,
  getWarehouseStatistics,
};
