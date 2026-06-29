/**
 * Enhanced Dashboard Controller with Real-time Analytics
 * Provides comprehensive business intelligence and performance metrics
 */

const dashboardService = require('../services/dashboardService');
const analyticsService = require('../services/analyticsService');
const socketService = require('../services/socketService');

class EnhancedDashboardController {
  /**
   * Get comprehensive dashboard metrics with real-time updates
   * @route GET /api/v1/dashboard/enhanced
   */
  async getEnhancedDashboard(req, res) {
    try {
      const {
        startDate,
        endDate,
        period = '30d',
        refresh = false,
      } = req.query;

      // Use cached data unless refresh is requested
      if (!refresh && !startDate) {
        const cachedData = await this._getCachedDashboard(period);
        if (cachedData) {
          return res.status(200).json({
            success: true,
            data: cachedData,
            cached: true,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Calculate date range if not provided
      const dateRange = this._calculateDateRange(startDate, endDate, period);

      // Fetch all dashboard data in parallel
      const [
        kpis,
        salesTrend,
        inventoryMetrics,
        customerInsights,
        operationalMetrics,
        financialHealth,
      ] = await Promise.all([
        this._getKPIs(dateRange.startDate, dateRange.endDate),
        this._getSalesTrend(dateRange.startDate, dateRange.endDate),
        this._getInventoryMetrics(),
        this._getCustomerInsights(dateRange.startDate, dateRange.endDate),
        this._getOperationalMetrics(),
        this._getFinancialHealth(dateRange.startDate, dateRange.endDate),
      ]);

      const dashboardData = {
        period: dateRange,
        kpis,
        salesTrend,
        inventoryMetrics,
        customerInsights,
        operationalMetrics,
        financialHealth,
        generatedAt: new Date().toISOString(),
      };

      // Cache the results
      await this._cacheDashboard(period, dashboardData);

      // Broadcast real-time update to connected clients
      socketService.broadcastUpdate('dashboard', dashboardData);

      res.status(200).json({
        success: true,
        data: dashboardData,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Enhanced dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enhanced dashboard data',
        error: error.message,
      });
    }
  }

  /**
   * Get real-time sales analytics with drill-down capabilities
   * @route GET /api/v1/dashboard/sales-analytics
   */
  async getSalesAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        granularity = 'daily', // daily, weekly, monthly
        customerId,
        salesmanId,
        routeId,
        categoryId,
      } = req.query;

      const filters = {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date(),
        granularity,
        customerId,
        salesmanId,
        routeId,
        categoryId,
      };

      const analytics = await analyticsService.getSalesTrends(filters.startDate, filters.endDate, filters.granularity || 'daily');

      res.status(200).json({
        success: true,
        data: analytics,
        filters,
      });
    } catch (error) {
      console.error('Sales analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get inventory performance metrics
   * @route GET /api/v1/dashboard/inventory-performance
   */
  async getInventoryPerformance(req, res) {
    try {
      const {
        warehouseId,
        categoryId,
        stockStatus,
        sortBy = 'turnover_rate',
      } = req.query;

      const performance = await analyticsService.getInventoryTurnover(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error('Inventory performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory performance',
        error: error.message,
      });
    }
  }

  /**
   * Get customer behavior insights
   * @route GET /api/v1/dashboard/customer-behavior
   */
  async getCustomerBehavior(req, res) {
    try {
      const {
        startDate,
        endDate,
        customerId,
        segment = 'all',
      } = req.query;

      const behavior = await analyticsService.getTopCustomers(
        startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate || new Date(),
        10
      );

      res.status(200).json({
        success: true,
        data: behavior,
      });
    } catch (error) {
      console.error('Customer behavior error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customer behavior',
        error: error.message,
      });
    }
  }
  /**
   * Get operational metrics
   * @route GET /api/v1/dashboard/operational-metrics
   */
  async getOperationalMetrics(req, res) {
    try {
      const metrics = await analyticsService.getPaymentCollectionEfficiency(new Date());

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Operational metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch operational metrics',
        error: error.message,
      });
    }
  }

  /**
   * Get financial health insights
   * @route GET /api/v1/dashboard/financial-health
   */
  async getFinancialHealth(req, res) {
    try {
      const {
        startDate,
        endDate,
      } = req.query;

      const health = await analyticsService.getProfitMargins(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error('Financial health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch financial health',
        error: error.message,
      });
    }
  }
  // Private helper methods
  _calculateDateRange(startDate, endDate, period) {
    if (startDate && endDate) {
      return { startDate: new Date(startDate), endDate: new Date(endDate) };
    }

    const now = new Date();
    let start;

    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate: start, endDate: now };
  }

  async _getKPIs(startDate, endDate) {
    return await analyticsService.getRealTimeKPIs();
  }

  async _getSalesTrend(startDate, endDate) {
    return await analyticsService.getSalesTrends(startDate, endDate, 'daily');
  }

  async _getInventoryMetrics() {
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return await analyticsService.getInventoryTurnover(lastMonth, now);
  }

  async _getCustomerInsights(startDate, endDate) {
    return await analyticsService.getTopCustomers(startDate, endDate, 10);
  }

  async _getOperationalMetrics() {
    return await analyticsService.getPaymentCollectionEfficiency(new Date());
  }

  async _getFinancialHealth(startDate, endDate) {
    return await analyticsService.getProfitMargins(startDate, endDate);
  }

  async _getCachedDashboard(period) {
    // Implementation for caching layer
    return null; // Placeholder
  }

  async _cacheDashboard(period, data) {
    // Implementation for caching layer
    // TTL: 5 minutes
  }
}

module.exports = new EnhancedDashboardController();
