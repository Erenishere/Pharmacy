const investorProfitShareService = require('../services/investorProfitShareService');

const createProfitShare = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const profitShare = await investorProfitShareService.createProfitShare(req.body, userId);
    return res.status(201).json({
      success: true, data: profitShare, message: 'Profit share created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getProfitShares = async (req, res) => {
  try {
    const filters = { status: req.query.status, fromDate: req.query.fromDate, toDate: req.query.toDate };
    const options = { page: req.query.page, limit: req.query.limit };
    const result = await investorProfitShareService.getProfitShares(filters, options);
    return res.status(200).json({
      success: true, data: result.profitShares, pagination: result.pagination, message: 'Profit shares retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getProfitShareById = async (req, res) => {
  try {
    const profitShare = await investorProfitShareService.getProfitShareById(req.params.id);
    return res.status(200).json({
      success: true, data: profitShare, message: 'Profit share retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Profit share record not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const distributeProfitShare = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const profitShare = await investorProfitShareService.distributeProfitShare(req.params.id, userId);
    return res.status(200).json({
      success: true, data: profitShare, message: 'Profit share distributed successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const deleteProfitShare = async (req, res) => {
  try {
    const result = await investorProfitShareService.deleteProfitShare(req.params.id);
    return res.status(200).json({
      success: true, data: result, message: 'Profit share deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const calculateShares = async (req, res) => {
  try {
    const { totalProfit } = req.query;
    if (!totalProfit) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Total profit is required' }, timestamp: new Date().toISOString(),
      });
    }
    const shares = await investorProfitShareService.calculateShares(parseFloat(totalProfit));
    return res.status(200).json({
      success: true, data: shares, message: 'Shares calculated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { createProfitShare, getProfitShares, getProfitShareById, distributeProfitShare, deleteProfitShare, calculateShares };
