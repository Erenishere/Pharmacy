const eOrderService = require('../services/eOrderService');

exports.createOrder = async (req, res) => {
  try {
    const order = await eOrderService.createOrder({
      ...req.body,
      createdBy: req.user?.id,
      deviceId: req.headers['x-device-id'],
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      customerId: req.query.customerId,
      salesmanId: req.query.salesmanId,
      routeId: req.query.routeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort: req.query.sort || '-createdAt',
    };
    const result = await eOrderService.getOrders(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await eOrderService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

exports.approveOrder = async (req, res) => {
  try {
    const order = await eOrderService.approveOrder(req.params.id, req.user?.id);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await eOrderService.cancelOrder(req.params.id, req.body.reason);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.convertToInvoice = async (req, res) => {
  try {
    const invoice = await eOrderService.convertToInvoice(req.params.id, req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await eOrderService.updateOrder(req.params.id, req.body);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const result = await eOrderService.deleteOrder(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.syncFromMobile = async (req, res) => {
  try {
    const { orders } = req.body;
    const deviceId = req.headers['x-device-id'];
    const result = await eOrderService.syncFromMobile(orders, deviceId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getPendingOrders = async (req, res) => {
  try {
    const result = await eOrderService.getPendingOrders(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOrderSummary = async (req, res) => {
  try {
    const summary = await eOrderService.getOrderSummary(req.query);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
