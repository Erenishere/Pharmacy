const letterService = require('../services/letterService');

const createLetter = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const letter = await letterService.createLetter(req.body, userId);
    return res.status(201).json({
      success: true, data: letter, message: 'Letter created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getLetters = async (req, res) => {
  try {
    const filters = {
      letterType: req.query.letterType,
      status: req.query.status,
      accountId: req.query.accountId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      search: req.query.search,
    };
    const options = { page: req.query.page, limit: req.query.limit };
    const result = await letterService.getLetters(filters, options);
    return res.status(200).json({
      success: true, data: result.letters, pagination: result.pagination, message: 'Letters retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getLetterById = async (req, res) => {
  try {
    const letter = await letterService.getLetterById(req.params.id);
    return res.status(200).json({
      success: true, data: letter, message: 'Letter retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Letter not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const updateLetter = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const letter = await letterService.updateLetter(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: letter, message: 'Letter updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Letter not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const deleteLetter = async (req, res) => {
  try {
    const result = await letterService.deleteLetter(req.params.id);
    return res.status(200).json({
      success: true, data: result, message: 'Letter deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Letter not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { createLetter, getLetters, getLetterById, updateLetter, deleteLetter };
