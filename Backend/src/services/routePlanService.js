const RoutePlan = require('../models/RoutePlan');

class RoutePlanService {
  async createRoutePlan(data, userId) {
    const { monthYear, salesmanId, dimensionId, salesTarget, recoveryTarget, visitTarget, days } = data;

    if (!monthYear || !salesmanId) {
      throw new Error('Month/Year and salesman are required');
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
        .populate('salesmanId', 'username fullName')
        .populate('dimensionId', 'name')
        .populate('days.areaId', 'name')
        .populate('createdBy', 'username')
        .sort({ monthYear: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RoutePlan.countDocuments(query),
    ]);

    return {
      routePlans,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRoutePlanById(id) {
    const plan = await RoutePlan.findById(id)
      .populate('salesmanId', 'username fullName')
      .populate('dimensionId', 'name')
      .populate('days.areaId', 'name')
      .populate('createdBy', 'username');
    if (!plan) throw new Error('Route plan not found');
    return plan;
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
