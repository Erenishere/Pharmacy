const mongoose = require('mongoose');
const purchaseReportService = require('../purchaseReportService');
const Invoice = require('../../models/Invoice');

// Mock dependencies
jest.mock('../../models/Invoice');

describe('PurchaseReportService', () => {
  let mockInvoiceId;
  let mockSupplierId;
  let mockItemId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceId = new mongoose.Types.ObjectId();
    mockSupplierId = new mongoose.Types.ObjectId();
    mockItemId = new mongoose.Types.ObjectId();
  });

  describe('getPurchaseSummary', () => {
    // Requirement 6.2: Total purchases, total invoices, average invoice value
    it('should return purchase summary with totals and averages', async () => {
      const mockAggregateResult = [
        {
          _id: null,
          totalInvoices: 10,
          totalPurchaseAmount: 100000,
          totalReturnAmount: -5000,
          totalGST18: 15000,
          totalGST4: 2000,
          totalAdvanceTax: 500,
          totalNonFilerGST: 100,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockAggregateResult);
      Invoice.countDocuments
        .mockResolvedValueOnce(8) // purchase invoices
        .mockResolvedValueOnce(2); // return invoices

      const result = await purchaseReportService.getPurchaseSummary(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result.totalInvoices).toBe(10);
      expect(result.purchaseInvoices).toBe(8);
      expect(result.returnInvoices).toBe(2);
      expect(result.totalPurchaseAmount).toBe(100000);
      expect(result.totalReturnAmount).toBe(5000);
      expect(result.netAmount).toBe(95000);
      expect(result.averageInvoiceValue).toBe(12500); // 100000 / 8
      expect(result.gstSummary.gst18).toBe(15000);
      expect(result.gstSummary.gst4).toBe(2000);
      expect(result.gstSummary.totalGST).toBe(17000);
    });

    it('should handle empty results gracefully', async () => {
      Invoice.aggregate.mockResolvedValue([]);
      Invoice.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await purchaseReportService.getPurchaseSummary(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result.totalInvoices).toBe(0);
      expect(result.totalPurchaseAmount).toBe(0);
      expect(result.averageInvoiceValue).toBe(0);
      expect(result.gstSummary.totalGST).toBe(0);
    });

    it('should filter by date range', async () => {
      Invoice.aggregate.mockResolvedValue([
        {
          _id: null,
          totalInvoices: 5,
          totalPurchaseAmount: 50000,
          totalReturnAmount: 0,
          totalGST18: 7500,
          totalGST4: 1000,
          totalAdvanceTax: 250,
          totalNonFilerGST: 50,
        },
      ]);
      Invoice.countDocuments
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      const dateFrom = '2025-01-01';
      const dateTo = '2025-01-31';

      const result = await purchaseReportService.getPurchaseSummary(dateFrom, dateTo);

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              invoiceDate: expect.objectContaining({
                $gte: expect.any(Date),
                $lte: expect.any(Date),
              }),
            }),
          }),
        ]),
      );
      expect(result.dateRange.from).toBe(dateFrom);
      expect(result.dateRange.to).toBe(dateTo);
    });

    it('should exclude cancelled invoices', async () => {
      Invoice.aggregate.mockResolvedValue([]);
      Invoice.countDocuments.mockResolvedValue(0);

      await purchaseReportService.getPurchaseSummary();

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              status: { $ne: 'cancelled' },
            }),
          }),
        ]),
      );
    });
  });

  describe('getPurchaseBySupplier', () => {
    // Requirement 6.3: Purchase by supplier breakdown
    it('should return purchase breakdown by supplier', async () => {
      const mockSupplierData = [
        {
          _id: mockSupplierId,
          supplierName: 'ABC Pharma',
          invoiceCount: 5,
          totalAmount: 50000,
          totalGST18: 7500,
          totalGST4: 1000,
          supplier: {
            _id: mockSupplierId,
            code: 'SUP001',
            contactPerson: 'John Doe',
            phone: '1234567890',
            town: 'Karachi',
          },
          supplierId: mockSupplierId,
          supplierCode: 'SUP001',
          contactPerson: 'John Doe',
          phone: '1234567890',
          town: 'Karachi',
          totalGST: 8500,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockSupplierData);

      const result = await purchaseReportService.getPurchaseBySupplier(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result).toHaveLength(1);
      expect(result[0].supplierName).toBe('ABC Pharma');
      expect(result[0].invoiceCount).toBe(5);
      expect(result[0].totalAmount).toBe(50000);
      expect(result[0].totalGST).toBe(8500);
    });

    it('should sort suppliers by total amount descending', async () => {
      const mockSupplierData = [
        {
          _id: new mongoose.Types.ObjectId(),
          supplierName: 'Supplier A',
          totalAmount: 100000,
          invoiceCount: 10,
          totalGST18: 15000,
          totalGST4: 2000,
          supplier: {},
          supplierId: new mongoose.Types.ObjectId(),
          totalGST: 17000,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          supplierName: 'Supplier B',
          totalAmount: 50000,
          invoiceCount: 5,
          totalGST18: 7500,
          totalGST4: 1000,
          supplier: {},
          supplierId: new mongoose.Types.ObjectId(),
          totalGST: 8500,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockSupplierData);

      const result = await purchaseReportService.getPurchaseBySupplier();

      expect(result[0].totalAmount).toBeGreaterThan(result[1].totalAmount);
    });

    it('should only include purchase type invoices', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      await purchaseReportService.getPurchaseBySupplier();

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              type: 'purchase',
            }),
          }),
        ]),
      );
    });
  });

  describe('getPurchaseByItem', () => {
    // Requirement 6.4: Purchase by item breakdown
    it('should return purchase breakdown by item', async () => {
      const mockItemData = [
        {
          _id: mockItemId,
          itemName: 'Paracetamol 500mg',
          totalQuantity: 1000,
          totalBoxQty: 10,
          totalUnitQty: 0,
          totalAmount: 50000,
          totalGST18: 0,
          totalGST4: 2000,
          item: {
            _id: mockItemId,
            code: 'ITEM001',
            unit: 'tablets',
            category: 'Medicine',
          },
          itemId: mockItemId,
          itemCode: 'ITEM001',
          unit: 'tablets',
          category: 'Medicine',
          totalGST: 2000,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockItemData);

      const result = await purchaseReportService.getPurchaseByItem(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result).toHaveLength(1);
      expect(result[0].itemName).toBe('Paracetamol 500mg');
      expect(result[0].totalQuantity).toBe(1000);
      expect(result[0].totalAmount).toBe(50000);
      expect(result[0].totalGST).toBe(2000);
    });

    it('should sort items by total amount descending', async () => {
      const mockItemData = [
        {
          _id: new mongoose.Types.ObjectId(),
          itemName: 'Item A',
          totalAmount: 100000,
          totalQuantity: 2000,
          totalBoxQty: 20,
          totalUnitQty: 0,
          totalGST18: 15000,
          totalGST4: 0,
          item: {},
          itemId: new mongoose.Types.ObjectId(),
          totalGST: 15000,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          itemName: 'Item B',
          totalAmount: 50000,
          totalQuantity: 1000,
          totalBoxQty: 10,
          totalUnitQty: 0,
          totalGST18: 7500,
          totalGST4: 0,
          item: {},
          itemId: new mongoose.Types.ObjectId(),
          totalGST: 7500,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockItemData);

      const result = await purchaseReportService.getPurchaseByItem();

      expect(result[0].totalAmount).toBeGreaterThan(result[1].totalAmount);
    });
  });

  describe('getPurchaseAnalysis', () => {
    // Requirements 6.5-6.7: Cost analysis, scheme/discount analysis
    it('should return comprehensive purchase analysis', async () => {
      const mockAnalysisData = [
        {
          _id: null,
          totalPurchaseValue: 100000,
          totalQuantity: 5000,
          totalScheme1: 500,
          totalScheme2: 250,
          totalDiscount1: 5000,
          totalDiscount2: 2000,
          totalGST18: 15000,
          totalGST4: 2000,
          totalAdvanceTax: 500,
          itemCount: 50,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockAnalysisData);
      Invoice.countDocuments.mockResolvedValue(10);

      const result = await purchaseReportService.getPurchaseAnalysis(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result.costAnalysis.totalPurchaseValue).toBe(100000);
      expect(result.costAnalysis.totalQuantity).toBe(5000);
      expect(result.costAnalysis.averageCostPerUnit).toBe(20); // 100000 / 5000
      expect(result.costAnalysis.itemCount).toBe(50);
      expect(result.costAnalysis.invoiceCount).toBe(10);

      expect(result.schemeAnalysis.totalScheme1Units).toBe(500);
      expect(result.schemeAnalysis.totalScheme2Units).toBe(250);
      expect(result.schemeAnalysis.totalSchemeUnits).toBe(750);
      expect(result.schemeAnalysis.schemePercentage).toBe(0.75); // (750 / 100000) * 100

      expect(result.discountAnalysis.totalDiscount1).toBe(5000);
      expect(result.discountAnalysis.totalDiscount2).toBe(2000);
      expect(result.discountAnalysis.totalDiscounts).toBe(7000);
      expect(result.discountAnalysis.discountPercentage).toBe(7); // (7000 / 100000) * 100

      expect(result.taxAnalysis.gst18).toBe(15000);
      expect(result.taxAnalysis.gst4).toBe(2000);
      expect(result.taxAnalysis.totalGST).toBe(17000);
      expect(result.taxAnalysis.advanceTax).toBe(500);
    });

    it('should handle zero values gracefully', async () => {
      Invoice.aggregate.mockResolvedValue([]);
      Invoice.countDocuments.mockResolvedValue(0);

      const result = await purchaseReportService.getPurchaseAnalysis();

      expect(result.costAnalysis.totalPurchaseValue).toBe(0);
      expect(result.costAnalysis.averageCostPerUnit).toBe(0);
      expect(result.schemeAnalysis.totalSchemeUnits).toBe(0);
      expect(result.schemeAnalysis.schemePercentage).toBe(0);
      expect(result.discountAnalysis.totalDiscounts).toBe(0);
      expect(result.discountAnalysis.discountPercentage).toBe(0);
    });

    it('should calculate percentages correctly', async () => {
      const mockAnalysisData = [
        {
          _id: null,
          totalPurchaseValue: 100000,
          totalQuantity: 5000,
          totalScheme1: 1000,
          totalScheme2: 500,
          totalDiscount1: 10000,
          totalDiscount2: 5000,
          totalGST18: 15000,
          totalGST4: 2000,
          totalAdvanceTax: 500,
          itemCount: 50,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockAnalysisData);
      Invoice.countDocuments.mockResolvedValue(10);

      const result = await purchaseReportService.getPurchaseAnalysis();

      // Scheme percentage: (1500 / 100000) * 100 = 1.5%
      expect(result.schemeAnalysis.schemePercentage).toBe(1.5);

      // Discount percentage: (15000 / 100000) * 100 = 15%
      expect(result.discountAnalysis.discountPercentage).toBe(15);
    });
  });

  describe('getGSTInputSummary', () => {
    // Requirement 6.8: Input GST by rate (18% and 4%)
    it('should return GST input summary with dual rates', async () => {
      const mockGSTData = [
        {
          _id: null,
          totalGST18: 15000,
          totalGST4: 2000,
          totalAdvanceTax: 500,
          totalNonFilerGST: 100,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockGSTData);

      const result = await purchaseReportService.getGSTInputSummary(
        '2025-01-01',
        '2025-01-31',
      );

      expect(result.gst18).toBe(15000);
      expect(result.gst4).toBe(2000);
      expect(result.totalInputGST).toBe(17000);
      expect(result.advanceTax).toBe(500);
      expect(result.nonFilerGST).toBe(100);
    });

    it('should handle empty GST data', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      const result = await purchaseReportService.getGSTInputSummary();

      expect(result.gst18).toBe(0);
      expect(result.gst4).toBe(0);
      expect(result.totalInputGST).toBe(0);
      expect(result.advanceTax).toBe(0);
      expect(result.nonFilerGST).toBe(0);
    });

    it('should filter by date range', async () => {
      Invoice.aggregate.mockResolvedValue([
        {
          _id: null,
          totalGST18: 10000,
          totalGST4: 1000,
          totalAdvanceTax: 250,
          totalNonFilerGST: 50,
        },
      ]);

      const dateFrom = '2025-01-01';
      const dateTo = '2025-01-31';

      const result = await purchaseReportService.getGSTInputSummary(dateFrom, dateTo);

      expect(result.dateRange.from).toBe(dateFrom);
      expect(result.dateRange.to).toBe(dateTo);
    });
  });

  describe('getSupplierAgingReport', () => {
    // Requirement 7.7: Supplier aging analysis
    it('should return supplier aging report with buckets', async () => {
      const mockAgingData = [
        {
          _id: mockSupplierId,
          supplierName: 'ABC Pharma',
          aging: [
            {
              bucket: 'current',
              amount: 10000,
              invoices: [
                {
                  invoiceNumber: 'PI2025000001',
                  invoiceDate: new Date('2025-01-15'),
                  dueDate: new Date('2025-02-15'),
                  daysOverdue: 5,
                  amount: 10000,
                  dueAmount: 10000,
                },
              ],
            },
            {
              bucket: '1-30',
              amount: 5000,
              invoices: [
                {
                  invoiceNumber: 'PI2025000002',
                  invoiceDate: new Date('2024-12-15'),
                  dueDate: new Date('2025-01-15'),
                  daysOverdue: 20,
                  amount: 5000,
                  dueAmount: 5000,
                },
              ],
            },
          ],
          totalOutstanding: 15000,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockAgingData);

      const result = await purchaseReportService.getSupplierAgingReport();

      expect(result.suppliers).toHaveLength(1);
      expect(result.suppliers[0].supplierName).toBe('ABC Pharma');
      expect(result.suppliers[0].totalOutstanding).toBe(15000);
      expect(result.summary.current).toBe(10000);
      expect(result.summary['1-30']).toBe(5000);
      expect(result.summary.totalOutstanding).toBe(15000);
    });

    it('should handle empty aging data', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      const result = await purchaseReportService.getSupplierAgingReport();

      expect(result.suppliers).toHaveLength(0);
      expect(result.summary.totalOutstanding).toBe(0);
      expect(result.summary.current).toBe(0);
    });

    it('should only include overdue invoices', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      await purchaseReportService.getSupplierAgingReport();

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              type: 'purchase',
              status: { $in: ['confirmed', 'paid'] },
              paymentStatus: { $ne: 'paid' },
              dueDate: { $lt: expect.any(Date) },
            }),
          }),
        ]),
      );
    });

    it('should sort suppliers by total outstanding descending', async () => {
      const mockAgingData = [
        {
          _id: new mongoose.Types.ObjectId(),
          supplierName: 'Supplier A',
          aging: [{ bucket: 'current', amount: 50000, invoices: [] }],
          totalOutstanding: 50000,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          supplierName: 'Supplier B',
          aging: [{ bucket: 'current', amount: 30000, invoices: [] }],
          totalOutstanding: 30000,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockAgingData);

      const result = await purchaseReportService.getSupplierAgingReport();

      expect(result.suppliers[0].totalOutstanding).toBeGreaterThan(
        result.suppliers[1].totalOutstanding,
      );
    });
  });

  describe('getPaymentDueReport', () => {
    // Requirement 7.8: Payment due report
    it('should return payment due report with invoices', async () => {
      const mockDueInvoices = [
        {
          invoiceNumber: 'PI2025000001',
          invoiceDate: new Date('2025-01-01'),
          dueDate: new Date('2025-02-01'),
          supplierName: 'ABC Pharma',
          supplierId: mockSupplierId,
          grandTotal: 50000,
          dueAmount: 50000,
          paymentStatus: 'pending',
          creditDays: 30,
        },
        {
          invoiceNumber: 'PI2025000002',
          invoiceDate: new Date('2025-01-15'),
          dueDate: new Date('2025-02-15'),
          supplierName: 'XYZ Medical',
          supplierId: new mongoose.Types.ObjectId(),
          grandTotal: 30000,
          dueAmount: 30000,
          paymentStatus: 'pending',
          creditDays: 30,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockDueInvoices);

      const result = await purchaseReportService.getPaymentDueReport('2025-02-28');

      expect(result.invoices).toHaveLength(2);
      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.totalDueAmount).toBe(80000);
    });

    it('should calculate overdue invoices correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockDueInvoices = [
        {
          invoiceNumber: 'PI2025000001',
          invoiceDate: new Date('2024-12-01'),
          dueDate: pastDate,
          supplierName: 'ABC Pharma',
          supplierId: mockSupplierId,
          grandTotal: 50000,
          dueAmount: 50000,
          paymentStatus: 'pending',
          creditDays: 30,
        },
        {
          invoiceNumber: 'PI2025000002',
          invoiceDate: new Date('2025-01-15'),
          dueDate: futureDate,
          supplierName: 'XYZ Medical',
          supplierId: new mongoose.Types.ObjectId(),
          grandTotal: 30000,
          dueAmount: 30000,
          paymentStatus: 'pending',
          creditDays: 30,
        },
      ];

      Invoice.aggregate.mockResolvedValue(mockDueInvoices);

      const result = await purchaseReportService.getPaymentDueReport();

      expect(result.summary.overdueCount).toBe(1);
      expect(result.summary.overdueAmount).toBe(50000);
    });

    it('should filter by due date', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      const dateTo = '2025-02-28';
      await purchaseReportService.getPaymentDueReport(dateTo);

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              dueDate: { $lte: expect.any(Date) },
            }),
          }),
        ]),
      );
    });

    it('should exclude paid invoices', async () => {
      Invoice.aggregate.mockResolvedValue([]);

      await purchaseReportService.getPaymentDueReport();

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              paymentStatus: { $ne: 'paid' },
            }),
          }),
        ]),
      );
    });
  });

  describe('getPurchaseVsSalesComparison', () => {
    // Requirement 6.12: Purchase vs sales comparison
    it('should return purchase vs sales comparison by month', async () => {
      const mockPurchases = [
        {
          _id: '2025-01',
          totalPurchase: 100000,
          totalGST18: 15000,
          totalGST4: 2000,
          invoiceCount: 10,
        },
        {
          _id: '2025-02',
          totalPurchase: 120000,
          totalGST18: 18000,
          totalGST4: 2400,
          invoiceCount: 12,
        },
      ];

      const mockSales = [
        {
          _id: '2025-01',
          totalSales: 150000,
          totalGST18: 22500,
          totalGST4: 3000,
          invoiceCount: 15,
        },
        {
          _id: '2025-02',
          totalSales: 180000,
          totalGST18: 27000,
          totalGST4: 3600,
          invoiceCount: 18,
        },
      ];

      Invoice.aggregate
        .mockResolvedValueOnce(mockPurchases)
        .mockResolvedValueOnce(mockSales);

      const result = await purchaseReportService.getPurchaseVsSalesComparison(
        '2025-01-01',
        '2025-02-28',
      );

      expect(result.comparison).toHaveLength(2);
      expect(result.comparison[0].month).toBe('2025-01');
      expect(result.comparison[0].purchase.amount).toBe(100000);
      expect(result.comparison[0].sales.amount).toBe(150000);
      expect(result.comparison[0].difference.amount).toBe(50000);
    });

    it('should handle months with only purchases or only sales', async () => {
      const mockPurchases = [
        {
          _id: '2025-01',
          totalPurchase: 100000,
          totalGST18: 15000,
          totalGST4: 2000,
          invoiceCount: 10,
        },
      ];

      const mockSales = [
        {
          _id: '2025-02',
          totalSales: 150000,
          totalGST18: 22500,
          totalGST4: 3000,
          invoiceCount: 15,
        },
      ];

      Invoice.aggregate
        .mockResolvedValueOnce(mockPurchases)
        .mockResolvedValueOnce(mockSales);

      const result = await purchaseReportService.getPurchaseVsSalesComparison();

      expect(result.comparison).toHaveLength(2);
      expect(result.comparison[0].purchase.amount).toBe(100000);
      expect(result.comparison[0].sales.amount).toBe(0);
      expect(result.comparison[1].purchase.amount).toBe(0);
      expect(result.comparison[1].sales.amount).toBe(150000);
    });

    it('should calculate difference correctly', async () => {
      const mockPurchases = [
        {
          _id: '2025-01',
          totalPurchase: 100000,
          totalGST18: 15000,
          totalGST4: 2000,
          invoiceCount: 10,
        },
      ];

      const mockSales = [
        {
          _id: '2025-01',
          totalSales: 150000,
          totalGST18: 22500,
          totalGST4: 3000,
          invoiceCount: 15,
        },
      ];

      Invoice.aggregate
        .mockResolvedValueOnce(mockPurchases)
        .mockResolvedValueOnce(mockSales);

      const result = await purchaseReportService.getPurchaseVsSalesComparison();

      // Difference = Sales - Purchase = 150000 - 100000 = 50000
      expect(result.comparison[0].difference.amount).toBe(50000);
    });

    it('should sort comparison by month', async () => {
      const mockPurchases = [
        {
          _id: '2025-02',
          totalPurchase: 120000,
          totalGST18: 18000,
          totalGST4: 2400,
          invoiceCount: 12,
        },
        {
          _id: '2025-01',
          totalPurchase: 100000,
          totalGST18: 15000,
          totalGST4: 2000,
          invoiceCount: 10,
        },
      ];

      const mockSales = [];

      Invoice.aggregate
        .mockResolvedValueOnce(mockPurchases)
        .mockResolvedValueOnce(mockSales);

      const result = await purchaseReportService.getPurchaseVsSalesComparison();

      expect(result.comparison[0].month).toBe('2025-01');
      expect(result.comparison[1].month).toBe('2025-02');
    });

    it('should include dual GST breakdown', async () => {
      const mockPurchases = [
        {
          _id: '2025-01',
          totalPurchase: 100000,
          totalGST18: 15000,
          totalGST4: 2000,
          invoiceCount: 10,
        },
      ];

      const mockSales = [
        {
          _id: '2025-01',
          totalSales: 150000,
          totalGST18: 22500,
          totalGST4: 3000,
          invoiceCount: 15,
        },
      ];

      Invoice.aggregate
        .mockResolvedValueOnce(mockPurchases)
        .mockResolvedValueOnce(mockSales);

      const result = await purchaseReportService.getPurchaseVsSalesComparison();

      expect(result.comparison[0].purchase.gst18).toBe(15000);
      expect(result.comparison[0].purchase.gst4).toBe(2000);
      expect(result.comparison[0].sales.gst18).toBe(22500);
      expect(result.comparison[0].sales.gst4).toBe(3000);
    });

    it('should filter by date range', async () => {
      Invoice.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const dateFrom = '2025-01-01';
      const dateTo = '2025-12-31';

      const result = await purchaseReportService.getPurchaseVsSalesComparison(
        dateFrom,
        dateTo,
      );

      expect(result.dateRange.from).toBe(dateFrom);
      expect(result.dateRange.to).toBe(dateTo);
    });
  });
});
