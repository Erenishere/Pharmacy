const dashboardService = require('../services/dashboardService');
const dashboardOverviewService = require('../services/dashboardOverviewService');
const Response = require('../utils/response');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard and KPIs
 */
class DashboardController {
  /**
   * Get overview payload for the redesigned dashboard
   */
  getOverview = catchAsync(async (req, res) => {
    const overview = await dashboardOverviewService.getOverview(req.query);

    return Response.success(res, overview, 'Dashboard overview retrieved successfully');
  });

  /**
   * Get key performance indicators
   */
  getKPIs = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const kpis = await dashboardService.getKPIs(
      new Date(startDate),
      new Date(endDate),
    );

    return Response.success(res, kpis, 'KPIs retrieved successfully');
  });

  /**
   * Get sales trend analysis
   */
  getSalesTrend = catchAsync(async (req, res) => {
    const { months = 12 } = req.query;

    const trend = await dashboardService.getSalesTrend(parseInt(months));

    return Response.success(res, trend, 'Sales trend retrieved successfully');
  });

  /**
   * Get top performing items
   */
  getTopItems = catchAsync(async (req, res) => {
    const { startDate, endDate, limit = 10 } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const topItems = await dashboardService.getTopItems(
      new Date(startDate),
      new Date(endDate),
      parseInt(limit),
    );

    return Response.success(res, topItems, 'Top items retrieved successfully');
  });

  /**
   * Get top customers
   */
  getTopCustomers = catchAsync(async (req, res) => {
    const { startDate, endDate, limit = 10 } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const topCustomers = await dashboardService.getTopCustomers(
      new Date(startDate),
      new Date(endDate),
      parseInt(limit),
    );

    return Response.success(res, topCustomers, 'Top customers retrieved successfully');
  });
}

module.exports = new DashboardController();
