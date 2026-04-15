const claimAccountService = require('../services/claimAccountService');

const createClaimAccount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const claimAccount = await claimAccountService.createClaimAccount(req.body, userId);
    return res.status(201).json({
      success: true, data: claimAccount, message: 'Claim account created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('required')) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create claim account' }, timestamp: new Date().toISOString() });
  }
};

const getAllClaimAccounts = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', keyword, isActive,
    } = req.query;
    const filters = { ...(keyword && { keyword }), ...(isActive !== undefined && { isActive: isActive === 'true' }) };
    const sortOptions = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const result = await claimAccountService.getClaimAccounts(filters, { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100), sort: sortOptions });
    return res.status(200).json({
      success: true, data: result.claimAccounts, pagination: result.pagination, message: 'Claim accounts retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve claim accounts' }, timestamp: new Date().toISOString() });
  }
};

const getClaimAccountById = async (req, res) => {
  try {
    const claimAccount = await claimAccountService.getClaimAccountById(req.params.id);
    return res.status(200).json({
      success: true, data: claimAccount, message: 'Claim account retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Claim account not found') return res.status(404).json({ success: false, error: { code: 'CLAIM_ACCOUNT_NOT_FOUND', message: 'Claim account not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve claim account' }, timestamp: new Date().toISOString() });
  }
};

const updateClaimAccount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const claimAccount = await claimAccountService.updateClaimAccount(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: claimAccount, message: 'Claim account updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Claim account not found') return res.status(404).json({ success: false, error: { code: 'CLAIM_ACCOUNT_NOT_FOUND', message: 'Claim account not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update claim account' }, timestamp: new Date().toISOString() });
  }
};

const deleteClaimAccount = async (req, res) => {
  try {
    const claimAccount = await claimAccountService.deleteClaimAccount(req.params.id);
    return res.status(200).json({
      success: true, data: claimAccount, message: 'Claim account deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Claim account not found') return res.status(404).json({ success: false, error: { code: 'CLAIM_ACCOUNT_NOT_FOUND', message: 'Claim account not found' }, timestamp: new Date().toISOString() });
    if (error.message.includes('Cannot delete')) return res.status(400).json({ success: false, error: { code: 'CLAIM_ACCOUNT_HAS_DEPENDENCIES', message: error.message }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to delete claim account' }, timestamp: new Date().toISOString() });
  }
};

const toggleClaimAccountStatus = async (req, res) => {
  try {
    const claimAccount = await claimAccountService.toggleClaimAccountStatus(req.params.id);
    return res.status(200).json({
      success: true, data: claimAccount, message: `Claim account ${claimAccount.isActive ? 'activated' : 'deactivated'} successfully`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message === 'Claim account not found') return res.status(404).json({ success: false, error: { code: 'CLAIM_ACCOUNT_NOT_FOUND', message: 'Claim account not found' }, timestamp: new Date().toISOString() });
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to toggle claim account status' }, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  createClaimAccount, getAllClaimAccounts, getClaimAccountById, updateClaimAccount, deleteClaimAccount, toggleClaimAccountStatus,
};
