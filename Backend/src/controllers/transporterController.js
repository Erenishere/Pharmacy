const transporterService = require('../services/transporterService');

const createTransporter = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const transporter = await transporterService.createTransporter(req.body, userId);
    return res.status(201).json({
      success: true, data: transporter, message: 'Transporter created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('required')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create transporter' }, timestamp: new Date().toISOString() });
  }
};

const getAllTransporters = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await transporterService.getTransporters(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.transporters, pagination: result.pagination, message: 'Transporters retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve transporters' }, timestamp: new Date().toISOString() });
  }
};

const getTransporterById = async (req, res) => {
  try {
    const transporter = await transporterService.getTransporterById(req.params.id);
    return res.status(200).json({
      success: true, data: transporter, message: 'Transporter retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Transporter not found') return res.status(404).json({ success: false, error: { code: 'TRANSPORTER_NOT_FOUND', message: 'Transporter not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve transporter' }, timestamp: new Date().toISOString() });
  }
};

const updateTransporter = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const transporter = await transporterService.updateTransporter(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: transporter, message: 'Transporter updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Transporter not found') return res.status(404).json({ success: false, error: { code: 'TRANSPORTER_NOT_FOUND', message: 'Transporter not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update transporter' }, timestamp: new Date().toISOString() });
  }
};

const deleteTransporter = async (req, res) => {
  try {
    const transporter = await transporterService.deleteTransporter(req.params.id);
    return res.status(200).json({
      success: true, data: transporter, message: 'Transporter deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Transporter not found') return res.status(404).json({ success: false, error: { code: 'TRANSPORTER_NOT_FOUND', message: 'Transporter not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete transporter' }, timestamp: new Date().toISOString() });
  }
};

const toggleTransporterStatus = async (req, res) => {
  try {
    const transporter = await transporterService.toggleTransporterStatus(req.params.id);
    return res.status(200).json({
      success: true, data: transporter, message: `Transporter ${transporter.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Transporter not found') return res.status(404).json({ success: false, error: { code: 'TRANSPORTER_NOT_FOUND', message: 'Transporter not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle transporter status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createTransporter, getAllTransporters, getTransporterById, updateTransporter, deleteTransporter, toggleTransporterStatus,
};
