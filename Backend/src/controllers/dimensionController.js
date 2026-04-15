const { validationResult } = require('express-validator');
const DimensionBranch = require('../models/dimensionbranch');

/**
 * Get all dimensions with pagination and filtering
 */
exports.getAllDimensions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      isActive = '',
      parentDimensionId = '',
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    if (parentDimensionId) {
      query.parentDimensionId = parentDimensionId === 'null' ? null : parentDimensionId;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const dimensions = await DimensionBranch.find(query)
      .populate('parentDimensionId', 'code name type')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DimensionBranch.countDocuments(query);

    res.json({
      success: true,
      data: dimensions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dimensions',
      error: error.message,
    });
  }
};

/**
 * Get dimension by ID
 */
exports.getDimensionById = async (req, res) => {
  try {
    const dimension = await DimensionBranch.findById(req.params.id)
      .populate('parentDimensionId', 'code name type')
      .populate('createdBy', 'name email')
      .populate('children');

    if (!dimension) {
      return res.status(404).json({
        success: false,
        message: 'Dimension not found',
      });
    }

    res.json({
      success: true,
      data: dimension,
    });
  } catch (error) {
    console.error('Error fetching dimension:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dimension',
      error: error.message,
    });
  }
};

/**
 * Create new dimension
 */
exports.createDimension = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const dimensionData = {
      ...req.body,
      createdBy: req.user?._id || req.user?.id,
    };

    const dimension = new DimensionBranch(dimensionData);
    await dimension.save();

    await dimension.populate('parentDimensionId', 'code name type');
    await dimension.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: dimension,
      message: 'Dimension created successfully',
    });
  } catch (error) {
    console.error('Error creating dimension:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Dimension code already exists',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating dimension',
      error: error.message,
    });
  }
};

/**
 * Update dimension
 */
exports.updateDimension = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const dimension = await DimensionBranch.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )
      .populate('parentDimensionId', 'code name type')
      .populate('createdBy', 'name email');

    if (!dimension) {
      return res.status(404).json({
        success: false,
        message: 'Dimension not found',
      });
    }

    res.json({
      success: true,
      data: dimension,
      message: 'Dimension updated successfully',
    });
  } catch (error) {
    console.error('Error updating dimension:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Dimension code already exists',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating dimension',
      error: error.message,
    });
  }
};

/**
 * Delete dimension (soft delete by setting isActive to false)
 */
exports.deleteDimension = async (req, res) => {
  try {
    const dimension = await DimensionBranch.findById(req.params.id);

    if (!dimension) {
      return res.status(404).json({
        success: false,
        message: 'Dimension not found',
      });
    }

    // Check if dimension has children
    const childCount = await DimensionBranch.countDocuments({
      parentDimensionId: req.params.id,
    });

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete dimension with child dimensions',
      });
    }

    // Soft delete
    dimension.isActive = false;
    await dimension.save();

    res.json({
      success: true,
      message: 'Dimension deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting dimension:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting dimension',
      error: error.message,
    });
  }
};

/**
 * Get dimension types
 */
exports.getDimensionTypes = async (req, res) => {
  try {
    const types = ['BRANCH', 'REGION', 'TERRITORY', 'COST_CENTER', 'DEPARTMENT'];
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('Error fetching dimension types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dimension types',
      error: error.message,
    });
  }
};

/**
 * Get root dimensions (no parent)
 */
exports.getRootDimensions = async (req, res) => {
  try {
    const dimensions = await DimensionBranch.findRoots();
    res.json({
      success: true,
      data: dimensions,
    });
  } catch (error) {
    console.error('Error fetching root dimensions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching root dimensions',
      error: error.message,
    });
  }
};
