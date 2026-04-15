const businessTypeService = require('../services/businessTypeService');

const createBusinessType = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const businessType = await businessTypeService.createBusinessType(req.body, userId);
    return res.status(201).json({
      success: true, data: businessType, message: 'Business type created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('already exists')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create business type' }, timestamp: new Date().toISOString() });
  }
};

const getAllBusinessTypes = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await businessTypeService.getBusinessTypes(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.businessTypes, pagination: result.pagination, message: 'Business types retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve business types' }, timestamp: new Date().toISOString() });
  }
};

const getBusinessTypeById = async (req, res) => {
  try {
    const businessType = await businessTypeService.getBusinessTypeById(req.params.id);
    return res.status(200).json({
      success: true, data: businessType, message: 'Business type retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Business type not found') return res.status(404).json({ success: false, error: { code: 'BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve business type' }, timestamp: new Date().toISOString() });
  }
};

const updateBusinessType = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const businessType = await businessTypeService.updateBusinessType(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: businessType, message: 'Business type updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Business type not found') return res.status(404).json({ success: false, error: { code: 'BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('already exists')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update business type' }, timestamp: new Date().toISOString() });
  }
};

const deleteBusinessType = async (req, res) => {
  try {
    const businessType = await businessTypeService.deleteBusinessType(req.params.id);
    return res.status(200).json({
      success: true, data: businessType, message: 'Business type deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Business type not found') return res.status(404).json({ success: false, error: { code: 'BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('Cannot delete')) return res.status(400).json({ success: false, error: { code: 'BUSINESS_TYPE_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete business type' }, timestamp: new Date().toISOString() });
  }
};

const toggleBusinessTypeStatus = async (req, res) => {
  try {
    const businessType = await businessTypeService.toggleBusinessTypeStatus(req.params.id);
    return res.status(200).json({
      success: true, data: businessType, message: `Business type ${businessType.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Business type not found') return res.status(404).json({ success: false, error: { code: 'BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle business type status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createBusinessType, getAllBusinessTypes, getBusinessTypeById, updateBusinessType, deleteBusinessType, toggleBusinessTypeStatus,
};
