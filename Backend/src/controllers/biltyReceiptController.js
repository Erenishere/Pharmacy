const biltyReceiptService = require('../services/biltyReceiptService');

const create = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const doc = await biltyReceiptService.create(req.body, userId);
    return res.status(201).json({ success: true, data: doc, message: 'Bilty receipt created', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
};

const getAll = async (req, res) => {
  try {
    const result = await biltyReceiptService.getAll(
      { biltyType: req.query.biltyType, status: req.query.status, partyId: req.query.partyId, fromDate: req.query.fromDate, toDate: req.query.toDate },
      { page: req.query.page, limit: req.query.limit }
    );
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination, message: 'Bilty receipts retrieved', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
};

const getById = async (req, res) => {
  try {
    const doc = await biltyReceiptService.getById(req.params.id);
    return res.status(200).json({ success: true, data: doc, message: 'Bilty receipt retrieved', timestamp: new Date().toISOString() });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, error: { code: 'NOT_FOUND', message: error.message }, timestamp: new Date().toISOString() });
  }
};

const update = async (req, res) => {
  try {
    const doc = await biltyReceiptService.update(req.params.id, req.body);
    return res.status(200).json({ success: true, data: doc, message: 'Bilty receipt updated', timestamp: new Date().toISOString() });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
};

const remove = async (req, res) => {
  try {
    await biltyReceiptService.delete(req.params.id);
    return res.status(200).json({ success: true, data: null, message: 'Bilty receipt deleted', timestamp: new Date().toISOString() });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, error: { code: 'NOT_FOUND', message: error.message }, timestamp: new Date().toISOString() });
  }
};

module.exports = { create, getAll, getById, update, remove };
