const taxReportService = require('../../src/services/taxReportService');

describe('TaxReportService - Simple Tests', () => {
  describe('Service Methods Exist', () => {
    it('should have getGSTSalesReport method', () => {
      expect(typeof taxReportService.getGSTSalesReport).toBe('function');
    });

    it('should have getGSTPurchaseReport method', () => {
      expect(typeof taxReportService.getGSTPurchaseReport).toBe('function');
    });

    it('should have getWHTReport method', () => {
      expect(typeof taxReportService.getWHTReport).toBe('function');
    });

    it('should have getTaxComplianceSummary method', () => {
      expect(typeof taxReportService.getTaxComplianceSummary).toBe('function');
    });
  });
});
