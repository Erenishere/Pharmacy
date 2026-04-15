const formulaService = require('../services/formulaService');

const createFormula = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const formula = await formulaService.createFormula(req.body, userId);
    return res.status(201).json({
      success: true, data: formula, message: 'Formula created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('already exists')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create formula' }, timestamp: new Date().toISOString() });
  }
};

const getAllFormulas = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await formulaService.getFormulas(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.formulas, pagination: result.pagination, message: 'Formulas retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve formulas' }, timestamp: new Date().toISOString() });
  }
};

const getFormulaById = async (req, res) => {
  try {
    const formula = await formulaService.getFormulaById(req.params.id);
    return res.status(200).json({
      success: true, data: formula, message: 'Formula retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_NOT_FOUND', message: 'Formula not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve formula' }, timestamp: new Date().toISOString() });
  }
};

const updateFormula = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const formula = await formulaService.updateFormula(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: formula, message: 'Formula updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_NOT_FOUND', message: 'Formula not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('already exists')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update formula' }, timestamp: new Date().toISOString() });
  }
};

const deleteFormula = async (req, res) => {
  try {
    const formula = await formulaService.deleteFormula(req.params.id);
    return res.status(200).json({
      success: true, data: formula, message: 'Formula deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_NOT_FOUND', message: 'Formula not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('Cannot delete')) return res.status(400).json({ success: false, error: { code: 'FORMULA_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete formula' }, timestamp: new Date().toISOString() });
  }
};

const toggleFormulaStatus = async (req, res) => {
  try {
    const formula = await formulaService.toggleFormulaStatus(req.params.id);
    return res.status(200).json({
      success: true, data: formula, message: `Formula ${formula.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Formula not found') return res.status(404).json({ success: false, error: { code: 'FORMULA_NOT_FOUND', message: 'Formula not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle formula status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createFormula, getAllFormulas, getFormulaById, updateFormula, deleteFormula, toggleFormulaStatus,
};
