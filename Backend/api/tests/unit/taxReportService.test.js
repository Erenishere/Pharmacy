const taxReportService = require('../../src/services/taxReportService');
const Invoice = require('../../src/models/Invoice');

jest.mock('../../src/models/Invoice');

describe('TaxReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGSTSalesReport', () => {
    it('should generate GST sales report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockInvoices = [
        {
          invoiceNumber: 'SI2025000001',
          invoiceDate: new Date('2025-01-15'),
          customerId: { _id: 'cust1', name: 'Customer 1', ntn: 'NTN001', gstNumber: 'GST001' },
          totals: { subtotal: 10000, totalTax: 1800, grandTotal: 11800 },
          items: [{ gstRate: 18 }],
          status: 'confirmed',
          type: 'sales',
        },
        {
          invoiceNumber: 'SI2025000002',
          invoiceDate: new Date('2025-01-20'),
          customerId: { _id: 'cust2', name: 'Customer 2', ntn: 'NTN002', gstNumber: 'GST002' },
          totals: { subtotal: 5000, totalTax: 900, grandTotal: 5900 },
          items: [{ gstRate: 18 }],
          status: 'confirmed',
          type: 'sales',
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await taxReportService.getGSTSalesReport(startDate, endDate);

      expect(result.reportType).toBe('gst_sales');
      expect(result.sales).toHaveLength(2);
      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.totalTaxableAmount).toBe(15000);
      expect(result.summary.totalGSTAmount).toBe(2700);
      expect(result.summary.totalAmount).toBe(17700);
    });

    it('should exclude cancelled invoices', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await taxReportService.getGSTSalesReport(startDate, endDate);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'cancelled' },
        })
      );
    });
  });

  describe('getGSTPurchaseReport', () => {
    it('should generate GST purchase report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockInvoices = [
        {
          invoiceNumber: 'PI2025000001',
          invoiceDate: new Date('2025-01-15'),
          supplierId: { _id: 'supp1', name: 'Supplier 1', ntn: 'NTN001', gstNumber: 'GST001' },
          totals: { subtotal: 20000, totalTax: 3600, grandTotal: 23600 },
          items: [{ gstRate: 18 }],
          status: 'confirmed',
          type: 'purchase',
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await taxReportService.getGSTPurchaseReport(startDate, endDate);

      expect(result.reportType).toBe('gst_purchase');
      expect(result.purchases).toHaveLength(1);
      expect(result.summary.totalInvoices).toBe(1);
      expect(result.summary.totalTaxableAmount).toBe(20000);
      expect(result.summary.totalGSTAmount).toBe(3600);
    });
  });

  describe('getWHTReport', () => {
    it('should generate withholding tax report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockInvoices = [
        {
          invoiceNumber: 'SI2025000001',
          invoiceDate: new Date('2025-01-15'),
          customerId: { _id: 'cust1', name: 'Customer 1', ntn: 'NTN001' },
          totals: { subtotal: 10000, grandTotal: 11750 },
          withholdingTax: 50,
          withholdingTaxRate: 0.5,
          status: 'confirmed',
          type: 'sales',
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await taxReportService.getWHTReport(startDate, endDate);

      expect(result.reportType).toBe('withholding_tax');
      expect(result.transactions).toHaveLength(1);
      expect(result.summary.totalWHTAmount).toBe(50);
      expect(result.summary.totalNetAmount).toBe(11700); // 11750 - 50
    });

    it('should only include invoices with WHT', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await taxReportService.getWHTReport(startDate, endDate);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          withholdingTax: { $gt: 0 },
        })
      );
    });
  });

  describe('getTaxComplianceSummary', () => {
    it('should generate comprehensive tax compliance summary', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockSalesInvoices = [
        {
          invoiceNumber: 'SI2025000001',
          invoiceDate: new Date('2025-01-15'),
          customerId: { _id: 'cust1', name: 'Customer 1', ntn: 'NTN001', gstNumber: 'GST001' },
          totals: { subtotal: 10000, totalTax: 1800, grandTotal: 11800 },
          withholdingTax: 50,
          withholdingTaxRate: 0.5,
          items: [{ gstRate: 18 }],
          status: 'confirmed',
          type: 'sales',
        },
      ];

      const mockPurchaseInvoices = [
        {
          invoiceNumber: 'PI2025000001',
          invoiceDate: new Date('2025-01-15'),
          supplierId: { _id: 'supp1', name: 'Supplier 1', ntn: 'NTN001', gstNumber: 'GST001' },
          totals: { subtotal: 5000, totalTax: 900, grandTotal: 5900 },
          items: [{ gstRate: 18 }],
          status: 'confirmed',
          type: 'purchase',
        },
      ];

      Invoice.find = jest.fn().mockImplementation((query) => {
        const result = query.type === 'sales' ? mockSalesInvoices : mockPurchaseInvoices;
        return {
          populate: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(result),
        };
      });

      const result = await taxReportService.getTaxComplianceSummary(startDate, endDate);

      expect(result.reportType).toBe('tax_compliance_summary');
      expect(result.gstSales.totalGSTAmount).toBe(1800);
      expect(result.gstPurchases.totalGSTAmount).toBe(900);
      expect(result.netGSTPayable).toBe(900); // 1800 - 900
      expect(result.withholdingTax.totalWHTAmount).toBe(50);
      expect(result.totalTaxLiability).toBe(950); // 900 + 50
    });
  });
});
