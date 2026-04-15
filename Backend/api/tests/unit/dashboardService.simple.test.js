const dashboardService = require('../../src/services/dashboardService');

describe('DashboardService - Simple Tests', () => {
  describe('Service Methods Exist', () => {
    it('should have getKPIs method', () => {
      expect(typeof dashboardService.getKPIs).toBe('function');
    });

    it('should have getSalesTrend method', () => {
      expect(typeof dashboardService.getSalesTrend).toBe('function');
    });

    it('should have getTopItems method', () => {
      expect(typeof dashboardService.getTopItems).toBe('function');
    });

    it('should have getTopCustomers method', () => {
      expect(typeof dashboardService.getTopCustomers).toBe('function');
    });
  });
});
