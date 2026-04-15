const formulaSizeService = require('../services/formulaSizeService');

const createFormulaSize = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const formulaSize = await formulaSizeService.createFormulaSize(req.body, userId);
    return res.status(201).json({
      success: true, data: formulaSize, message: 'Formula size created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('already exists') || error.message.includes('Invalid')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create formula size' }, timestamp: new Date().toISOString() });
  }
};

const getAllFormulaSizes = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'size', sortOrder = 'asc', keyword, isActive, formulaId,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }), ...(formulaId && { formulaId }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await formulaSizeService.getFormulaSizes(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.formulaSizes, pagination: result.pagination, message: 'Formula sizes retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve formula sizes' }, timestamp: new Date().toISOString() });
  }
};

const getFormulaSizeById = async (req, res) => {
  try {
    const formulaSize = await formulaSizeService.getFormulaSizeById(req.params.id);
    return res.status(200).json({
      success: true, data: formulaSize, message: 'Formula size retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula size not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_SIZE_NOT_FOUND', message: 'Formula size not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve formula size' }, timestamp: new Date().toISOString() });
  }
};

const getFormulaSizesByFormula = async (req, res) => {
  try {
    const formulaSizes = await formulaSizeService.getFormulaSizesByFormula(req.params.formulaId);
    return res.status(200).json({
      success: true, data: formulaSizes, count: formulaSizes.length, message: 'Formula sizes retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve formula sizes' }, timestamp: new Date().toISOString() });
  }
};

const updateFormulaSize = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const formulaSize = await formulaSizeService.updateFormulaSize(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: formulaSize, message: 'Formula size updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula size not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_SIZE_NOT_FOUND', message: 'Formula size not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('already exists') || error.message.includes('Invalid')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update formula size' }, timestamp: new Date().toISOString() });
  }
};

const deleteFormulaSize = async (req, res) => {
  try {
    const formulaSize = await formulaSizeService.deleteFormulaSize(req.params.id);
    return res.status(200).json({
      success: true, data: formulaSize, message: 'Formula size deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula size not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_SIZE_NOT_FOUND', message: 'Formula size not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('Cannot delete')) return res.status(400).json({ success: false, error: { code: 'FORMULA_SIZE_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete formula size' }, timestamp: new Date().toISOString() });
  }
};

const toggleFormulaSizeStatus = async (req, res) => {
  try {
    const formulaSize = await formulaSizeService.toggleFormulaSizeStatus(req.params.id);
    return res.status(200).json({
      success: true, data: formulaSize, message: `Formula size ${formulaSize.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula size not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_SIZE_NOT_FOUND', message: 'Formula size not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle formula size status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createFormulaSize, getAllFormulaSizes, getFormulaSizeById, getFormulaSizesByFormula, updateFormulaSize, deleteFormulaSize, toggleFormulaSizeStatus,
};
