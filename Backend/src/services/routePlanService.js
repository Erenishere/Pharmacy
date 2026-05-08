const RoutePlan = require('../models/RoutePlan');
const Salesman = require('../models/Salesman');
const User = require('../models/User');
const { normalizeRole } = require('../utils/roleUtils');

const SALES_ROUTE_ROLES = new Set(['sales', 'salesman']);

const toPlainObject = (document) => (
  document && typeof document.toObject === 'function'
    ? document.toObject()
    : document
);

const getSalesmanUserId = (routePlan) => {
  const salesmanRef = routePlan?.salesmanId;

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

const attachSalesmanMetadata = async (routePlans) => {
  const plans = routePlans.map((routePlan) => toPlainObject(routePlan));
  const userIds = [...new Set(plans.map((routePlan) => getSalesmanUserId(routePlan)).filter(Boolean))];

  if (userIds.length === 0) {
    return plans;
  }

  const salesmanProfiles = await Salesman.find({ userId: { $in: userIds } })
    .select('userId name code')
    .lean();

  const profilesByUserId = new Map(
    salesmanProfiles.map((profile) => [profile.userId.toString(), profile]),
  );

  return plans.map((routePlan) => {
    const userId = getSalesmanUserId(routePlan);
    const profile = userId ? profilesByUserId.get(userId) : null;

    return {
      ...routePlan,
      salesmanProfile: profile
        ? {
          id: profile._id,
          userId: profile.userId,
          name: profile.name,
          code: profile.code,
        }
        : null,
      salesmanDisplayName: profile?.name || routePlan.salesmanId?.username || routePlan.salesmanId?.email || null,
    };
  });
};

class RoutePlanService {
  async createRoutePlan(data, userId) {
    const { monthYear, salesmanId, dimensionId, salesTarget, recoveryTarget, visitTarget, days } = data;

    if (!monthYear || !salesmanId) {
      throw new Error('Month/Year and salesman are required');
    }

    const salesmanUser = await User.findById(salesmanId).select('role');
    if (!salesmanUser) {
      throw new Error('Salesman user not found');
    }

    if (!SALES_ROUTE_ROLES.has(normalizeRole(salesmanUser.role))) {
      throw new Error('Selected user is not a salesman');
    }

    // Check for existing plan
    const existing = await RoutePlan.findOne({ monthYear, salesmanId });
    if (existing) {
      throw new Error('A route plan already exists for this salesman in this month');
    }

    return await RoutePlan.create({
      monthYear,
      salesmanId,
      dimensionId: dimensionId || undefined,
      salesTarget: salesTarget || 0,
      recoveryTarget: recoveryTarget || 0,
      visitTarget: visitTarget || 0,
      days: days || [],
      createdBy: userId,
    });
  }

  async getRoutePlans(filters = {}, options = {}) {
    const query = {};

    if (filters.monthYear) query.monthYear = filters.monthYear;
    if (filters.salesmanId) query.salesmanId = filters.salesmanId;
    if (filters.dimensionId) query.dimensionId = filters.dimensionId;

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [routePlans, total] = await Promise.all([
      RoutePlan.find(query)
        .populate('salesmanId', 'username email role')
        .populate('dimensionId', 'name')
        .populate('days.areaId', 'name')
        .populate('createdBy', 'username')
        .sort({ monthYear: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RoutePlan.countDocuments(query),
    ]);
    const enrichedRoutePlans = await attachSalesmanMetadata(routePlans);

    return {
      routePlans: enrichedRoutePlans,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRoutePlanById(id) {
    const plan = await RoutePlan.findById(id)
      .populate('salesmanId', 'username email role')
      .populate('dimensionId', 'name')
      .populate('days.areaId', 'name')
      .populate('createdBy', 'username');
    if (!plan) throw new Error('Route plan not found');
    const [enrichedPlan] = await attachSalesmanMetadata([plan]);
    return enrichedPlan;
  }

  async updateRoutePlan(id, updates, userId) {
    const plan = await RoutePlan.findById(id);
    if (!plan) throw new Error('Route plan not found');

    const allowedUpdates = ['salesTarget', 'recoveryTarget', 'visitTarget', 'days', 'dimensionId'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) plan[field] = updates[field];
    });

    await plan.save();
    return plan;
  }

  async deleteRoutePlan(id) {
    const plan = await RoutePlan.findById(id);
    if (!plan) throw new Error('Route plan not found');
    await RoutePlan.findByIdAndDelete(id);
    return { message: 'Route plan deleted successfully' };
  }
}

module.exports = new RoutePlanService();
