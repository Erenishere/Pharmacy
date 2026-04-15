const dashboardService = require('../../src/services/dashboardService');
const Invoice = require('../../src/models/Invoice');
const Inventory = require('../../src/models/Inventory');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Account = require('../../src/models/Account');

jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Supplier');
jest.mock('../../src/models/Account');

describe('DashboardService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getKPIs', () => {
    it('should return comprehensive KPIs', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockSalesInvoices = [
        { totals: { grandTotal: 10000 }, status: 'confirmed', type: 'sales' },
        { totals: { grandTotal: 15000 }, status: 'confirmed', type: 'sales' },
      ];

      const mockPurchaseInvoices = [
        { totals: { grandTotal: 8000 }, status: 'confirmed', type: 'purchase' },
      ];

      const mockInventory = [
        { currentStock: 100, averageCost: 50, reorderLevel: 20 },
        { currentStock: 10, averageCost: 30, reorderLevel: 15 },
      ];

      const mockCustomers = [
        { status: 'active' },
        { status: 'active' },
      ];

      const mockSuppliers = [
        { status: 'active' },
      ];

      const mockCashAccounts = [
        { type: 'cash', balance: 50000 },
      ];

      // Mock Invoice.find to return different results based on query
      Invoice.find = jest.fn().mockImplementation((query) => {
        if (query.type === 'sales') {
          return Promise.resolve(mockSalesInvoices);
        } else if (query.type === 'purchase') {
          return Promise.resolve(mockPurchaseInvoices);
        }
        return Promise.resolve([]);
      });
      
      Inventory.find = jest.fn().mockResolvedValue(mockInventory);
      Customer.find = jest.fn().mockResolvedValue(mockCustomers);
      Supplier.find = jest.fn().mockResolvedValue(mockSuppliers);
      Account.find = jest.fn().mockResolvedValue(mockCashAccounts);

      const result = await dashboardService.getKPIs(startDate, endDate);

      expect(result.sales.totalSales).toBe(25000);
      expect(result.sales.totalInvoices).toBe(2);
      expect(result.sales.averageInvoiceValue).toBe(12500);
      expect(result.purchases.totalPurchases).toBe(8000);
      expect(result.inventory.totalItems).toBe(2);
      expect(result.inventory.totalValue).toBe(5300);
      expect(result.inventory.lowStockItems).toBe(1);
      expect(result.customers.totalCustomers).toBe(2);
      expect(result.suppliers.totalSuppliers).toBe(1);
      expect(result.cash.totalCash).toBe(50000);
    });
  });

  describe('getSalesTrend', () => {
    it('should return sales trend for specified months', async () => {
      const mockInvoices = [
        { totals: { grandTotal: 10000 }, status: 'confirmed', type: 'sales' },
        { totals: { grandTotal: 15000 }, status: 'confirmed', type: 'sales' },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await dashboardService.getSalesTrend(3);

      expect(result.reportType).toBe('sales_trend');
      expect(result.months).toBe(3);
      expect(result.trends).toHaveLength(3);
      expect(result.trends[0]).toHaveProperty('month');
      expect(result.trends[0]).toHaveProperty('totalSales');
      expect(result.trends[0]).toHaveProperty('totalInvoices');
      expect(result.trends[0]).toHaveProperty('averageInvoiceValue');
    });
  });

  describe('getTopItems', () => {
    it('should return top performing items', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockInvoices = [
        {
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          type: 'sales',
          items: [
            {
              itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
              quantity: 100,
              lineTotal: 5000,
            },
            {
              itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2' },
              quantity: 50,
              lineTotal: 3000,
            },
          ],
        },
        {
          invoiceDate: new Date('2025-01-20'),
          status: 'confirmed',
          type: 'sales',
          items: [
            {
              itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
              quantity: 50,
              lineTotal: 2500,
            },
          ],
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await dashboardService.getTopItems(startDate, endDate, 5);

      expect(result.reportType).toBe('top_items');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].revenue).toBeGreaterThanOrEqual(result.items[1].revenue);
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers by sales', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockInvoices = [
        {
          invoiceDate: new Date('2025-01-15'),
          customerId: { _id: 'cust1', name: 'Customer 1', code: 'C001' },
          totals: { grandTotal: 10000 },
          status: 'confirmed',
          type: 'sales',
        },
        {
          invoiceDate: new Date('2025-01-20'),
          customerId: { _id: 'cust1', name: 'Customer 1', code: 'C001' },
          totals: { grandTotal: 15000 },
          status: 'confirmed',
          type: 'sales',
        },
        {
          invoiceDate: new Date('2025-01-25'),
          customerId: { _id: 'cust2', name: 'Customer 2', code: 'C002' },
          totals: { grandTotal: 8000 },
          status: 'confirmed',
          type: 'sales',
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await dashboardService.getTopCustomers(startDate, endDate, 5);

      expect(result.reportType).toBe('top_customers');
      expect(result.customers).toHaveLength(2);
      expect(result.customers[0].totalSales).toBe(25000);
      expect(result.customers[0].invoiceCount).toBe(2);
      expect(result.customers[1].totalSales).toBe(8000);
    });
  });
});
