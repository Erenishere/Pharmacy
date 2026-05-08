const routePlanService = require('../services/routePlanService');
const { normalizeRole } = require('../utils/roleUtils');

const isSalesRouteUser = (user) => ['sales', 'salesman'].includes(normalizeRole(user?.role));

const getRoutePlanSalesmanUserId = (plan) => {
  const salesmanRef = plan?.salesmanId;

  if (!salesmanRef) {
    return null;
  }

  if (typeof salesmanRef === 'string') {
    return salesmanRef;
  }

  if (salesmanRef._id) {
    return salesmanRef._id.toString();
  }

  return salesmanRef.toString();
};

const createRoutePlan = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const plan = await routePlanService.createRoutePlan(req.body, userId);
    return res.status(201).json({
      success: true, data: plan, message: 'Route plan created successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getRoutePlans = async (req, res) => {
  try {
    const filters = {
      monthYear: req.query.monthYear,
      salesmanId: req.query.salesmanId,
      dimensionId: req.query.dimensionId,
    };

    if (isSalesRouteUser(req.user)) {
      filters.salesmanId = req.user?._id?.toString();
    }

    const options = { page: req.query.page, limit: req.query.limit };
    const result = await routePlanService.getRoutePlans(filters, options);
    return res.status(200).json({
      success: true, data: result.routePlans, pagination: result.pagination, message: 'Route plans retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const getRoutePlanById = async (req, res) => {
  try {
    const plan = await routePlanService.getRoutePlanById(req.params.id);

    if (isSalesRouteUser(req.user) && getRoutePlanSalesmanUserId(plan) !== req.user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this route plan' },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true, data: plan, message: 'Route plan retrieved successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Route plan not found' ? 404 : 500;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const updateRoutePlan = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const plan = await routePlanService.updateRoutePlan(req.params.id, req.body, userId);
    return res.status(200).json({
      success: true, data: plan, message: 'Route plan updated successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Route plan not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

const deleteRoutePlan = async (req, res) => {
  try {
    const result = await routePlanService.deleteRoutePlan(req.params.id);
    return res.status(200).json({
      success: true, data: result, message: 'Route plan deleted successfully', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode = error.message === 'Route plan not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false, error: { code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { createRoutePlan, getRoutePlans, getRoutePlanById, updateRoutePlan, deleteRoutePlan };
