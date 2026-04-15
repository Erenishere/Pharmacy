const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const AppError = require('../../src/utils/appError');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');

describe('SalesInvoiceService - Query Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvoices', () => {
    const mockInvoices = [
      {
        _id: 'invoice1',
        invoiceNumber: 'SI2025000001',
        invoiceDate: new Date('2025-01-15'),
        customerId: { _id: 'customer1', name: 'Customer A', code: 'CUST001', town: 'Town A' },
        salesmanId: { _id: 'salesman1', name: 'Salesman A', code: 'SALES001' },
        status: 'confirmed',
        totals: {
          grossTotal: 10000,
          gstTotal: 1800,
          discountTotal: 500,
          netBillTotal: 11300
        }
      },
      {
        _id: 'invoice2',
        invoiceNumber: 'SI2025000002',
        invoiceDate: new Date('2025-01-16'),
        customerId: { _id: 'customer2', name: 'Customer B', code: 'CUST002', town: 'Town B' },
        salesmanId: { _id: 'salesman1', name: 'Salesman A', code: 'SALES001' },
        status: 'draft',
        totals: {
          grossTotal: 5000,
          gstTotal: 900,
          discountTotal: 250,
          netBillTotal: 5650
        }
      }
    ];

    const mockSummary = [
      {
        _id: null,
        totalInvoices: 2,
        totalAmount: 16950,
        totalGST: 2700,
        totalDiscount: 750,
        grossTotal: 15000
      }
    ];

    beforeEach(() => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockInvoices)
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(2);
      Invoice.aggregate = jest.fn().mockResolvedValue(mockSummary);
    });

    it('should return paginated invoices with default pagination', async () => {
      const result = await salesInvoiceService.getInvoices({}, {});

      expect(result.data).toEqual(mockInvoices);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });
      expect(result.summary).toBeDefined();
      expect(result.summary.totalInvoices).toBe(2);
    });

    it('should apply custom pagination', async () => {
      const pagination = { page: 2, limit: 10 };
      await salesInvoiceService.getInvoices({}, pagination);

      const findChain = Invoice.find();
      expect(findChain.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      expect(findChain.limit).toHaveBeenCalledWith(10);
    });

    it('should filter by sales type', async () => {
      const filters = { salesType: 'return' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          salesType: 'return'
        })
      );
    });

    it('should filter by status', async () => {
      const filters = { status: 'confirmed' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          status: 'confirmed'
        })
      );
    });

    it('should filter by customer ID', async () => {
      const filters = { customerId: 'customer123' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          customerId: 'customer123'
        })
      );
    });

    it('should filter by salesman ID', async () => {
      const filters = { salesmanId: 'salesman123' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          salesmanId: 'salesman123'
        })
      );
    });

    it('should filter by invoice number with regex', async () => {
      const filters = { invoiceNumber: 'SI2025' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          invoiceNumber: { $regex: 'SI2025', $options: 'i' }
        })
      );
    });

    it('should filter by date range', async () => {
      const filters = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31'
      };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          invoiceDate: {
            $gte: new Date('2025-01-01'),
            $lte: new Date('2025-01-31')
          }
        })
      );
    });

    it('should filter by date from only', async () => {
      const filters = { dateFrom: '2025-01-01' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          invoiceDate: {
            $gte: new Date('2025-01-01')
          }
        })
      );
    });

    it('should filter by date to only', async () => {
      const filters = { dateTo: '2025-01-31' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          invoiceDate: {
            $lte: new Date('2025-01-31')
          }
        })
      );
    });

    it('should filter by tax invoice type', async () => {
      const filters = { taxInvoiceType: 'sales_tax' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          taxInvoiceType: 'sales_tax'
        })
      );
    });

    it('should filter by claim account ID', async () => {
      const filters = { claimAccountId: 'claim123' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          claimAccountId: 'claim123'
        })
      );
    });

    it('should filter by customer name', async () => {
      const mockCustomers = [
        { _id: 'customer1' },
        { _id: 'customer2' }
      ];

      Customer.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCustomers)
      });

      const filters = { customerName: 'Test Customer' };
      await salesInvoiceService.getInvoices(filters, {});

      expect(Customer.find).toHaveBeenCalledWith({
        name: { $regex: 'Test Customer', $options: 'i' }
      });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          customerId: { $in: ['customer1', 'customer2'] }
        })
      );
    });

    it('should apply custom sorting', async () => {
      const pagination = {
        sortBy: 'invoiceDate',
        sortOrder: 'asc'
      };

      await salesInvoiceService.getInvoices({}, pagination);

      const findChain = Invoice.find();
      expect(findChain.sort).toHaveBeenCalledWith({ invoiceDate: 1 });
    });

    it('should apply descending sort by default', async () => {
      const pagination = {
        sortBy: 'invoiceNumber'
      };

      await salesInvoiceService.getInvoices({}, pagination);

      const findChain = Invoice.find();
      expect(findChain.sort).toHaveBeenCalledWith({ invoiceNumber: -1 });
    });

    it('should populate all related fields', async () => {
      await salesInvoiceService.getInvoices({}, {});

      const findChain = Invoice.find();
      expect(findChain.populate).toHaveBeenCalledWith('customerId', 'name code town currentBalance creditLimit');
      expect(findChain.populate).toHaveBeenCalledWith('salesmanId', 'name code');
      expect(findChain.populate).toHaveBeenCalledWith('claimAccountId', 'name code');
      expect(findChain.populate).toHaveBeenCalledWith('createdBy', 'name email');
      expect(findChain.populate).toHaveBeenCalledWith('confirmedBy', 'name email');
    });

    it('should calculate summary statistics', async () => {
      const result = await salesInvoiceService.getInvoices({}, {});

      expect(Invoice.aggregate).toHaveBeenCalled();
      expect(result.summary).toEqual({
        totalInvoices: 2,
        totalAmount: 16950,
        totalGST: 2700,
        totalDiscount: 750,
        grossTotal: 15000
      });
    });

    it('should return empty summary when no invoices found', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      const result = await salesInvoiceService.getInvoices({}, {});

      expect(result.data).toEqual([]);
      expect(result.summary).toEqual({
        totalInvoices: 0,
        totalAmount: 0,
        totalGST: 0,
        totalDiscount: 0,
        grossTotal: 0
      });
    });

    it('should apply multiple filters together', async () => {
      const filters = {
        salesType: 'new',
        status: 'confirmed',
        customerId: 'customer123',
        salesmanId: 'salesman456',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        taxInvoiceType: 'normal'
      };

      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          salesType: 'new',
          status: 'confirmed',
          customerId: 'customer123',
          salesmanId: 'salesman456',
          taxInvoiceType: 'normal',
          invoiceDate: expect.any(Object)
        })
      );
    });
  });

  describe('getInvoiceById', () => {
    const mockInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      customerId: {
        _id: 'customer123',
        name: 'Test Customer',
        code: 'CUST001',
        town: 'Test Town',
        creditLimit: 50000,
        currentBalance: 10000
      },
      salesmanId: {
        _id: 'salesman123',
        name: 'Test Salesman',
        code: 'SALES001'
      },
      items: [
        {
          itemId: {
            _id: 'item123',
            name: 'Test Item',
            code: 'ITEM001',
            company: 'Test Company',
            packing: 10
          },
          warehouseId: {
            _id: 'warehouse123',
            name: 'Main Warehouse',
            code: 'WH001'
          }
        }
      ]
    };

    it('should return invoice with all populated fields', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      const result = await salesInvoiceService.getInvoiceById('invoice123');

      expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
      expect(result).toEqual(mockInvoice);
      
      const populateChain = Invoice.findById();
      expect(populateChain.populate).toHaveBeenCalledWith('customerId', 'name code town creditLimit currentBalance');
      expect(populateChain.populate).toHaveBeenCalledWith('salesmanId', 'name code');
      expect(populateChain.populate).toHaveBeenCalledWith('claimAccountId', 'name code');
      expect(populateChain.populate).toHaveBeenCalledWith('dimensionId', 'name code');
      expect(populateChain.populate).toHaveBeenCalledWith('items.itemId', 'name code company packing');
      expect(populateChain.populate).toHaveBeenCalledWith('items.warehouseId', 'name code');
      expect(populateChain.populate).toHaveBeenCalledWith('createdBy', 'name email');
      expect(populateChain.populate).toHaveBeenCalledWith('confirmedBy', 'name email');
      expect(populateChain.populate).toHaveBeenCalledWith('updatedBy', 'name email');
    });

    it('should throw error when invoice not found', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        salesInvoiceService.getInvoiceById('nonexistent')
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('getInvoiceByNumber', () => {
    const mockInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      type: 'sales',
      customerId: {
        _id: 'customer123',
        name: 'Test Customer'
      }
    };

    it('should return invoice by invoice number', async () => {
      // Create a proper mock chain that resolves at the end
      const mockChain = {
        populate: jest.fn().mockReturnThis()
      };
      
      // Make the last call in the chain resolve to the invoice (9 populate calls)
      mockChain.populate.mockImplementation(() => {
        if (mockChain.populate.mock.calls.length >= 9) {
          return Promise.resolve(mockInvoice);
        }
        return mockChain;
      });

      Invoice.findOne = jest.fn().mockReturnValue(mockChain);

      const result = await salesInvoiceService.getInvoiceByNumber('SI2025000001');

      expect(Invoice.findOne).toHaveBeenCalledWith({
        invoiceNumber: 'SI2025000001',
        type: 'sales'
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should throw error when invoice not found by number', async () => {
      // Create a proper mock chain that resolves to null at the end
      const mockChain = {
        populate: jest.fn().mockReturnThis()
      };
      
      mockChain.populate.mockImplementation(() => {
        if (mockChain.populate.mock.calls.length >= 9) {
          return Promise.resolve(null);
        }
        return mockChain;
      });

      Invoice.findOne = jest.fn().mockReturnValue(mockChain);

      await expect(
        salesInvoiceService.getInvoiceByNumber('NONEXISTENT')
      ).rejects.toThrow('Invoice not found');
    });

    it('should populate all related fields', async () => {
      const populateSpy = jest.fn().mockReturnThis();
      
      populateSpy.mockImplementation(() => {
        if (populateSpy.mock.calls.length >= 9) {
          return Promise.resolve(mockInvoice);
        }
        return { populate: populateSpy };
      });

      Invoice.findOne = jest.fn().mockReturnValue({
        populate: populateSpy
      });

      await salesInvoiceService.getInvoiceByNumber('SI2025000001');

      expect(Invoice.findOne).toHaveBeenCalledWith({
        invoiceNumber: 'SI2025000001',
        type: 'sales'
      });
      
      // Verify populate was called 9 times for different fields
      expect(populateSpy).toHaveBeenCalled();
      expect(populateSpy.mock.calls.length).toBe(9);
    });
  });

  describe('getCustomerInvoices', () => {
    it('should call getInvoices with customer filter', async () => {
      const mockResult = {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        summary: { totalInvoices: 0, totalAmount: 0 }
      };

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      const result = await salesInvoiceService.getCustomerInvoices('customer123', {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          customerId: 'customer123'
        })
      );
      expect(result).toBeDefined();
    });

    it('should merge additional filters with customer filter', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      const additionalFilters = {
        status: 'confirmed',
        dateFrom: '2025-01-01'
      };

      await salesInvoiceService.getCustomerInvoices('customer123', additionalFilters);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          customerId: 'customer123',
          status: 'confirmed',
          invoiceDate: expect.any(Object)
        })
      );
    });
  });

  describe('getSalesmanInvoices', () => {
    it('should call getInvoices with salesman filter', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      await salesInvoiceService.getSalesmanInvoices('salesman123', {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          salesmanId: 'salesman123'
        })
      );
    });

    it('should merge additional filters with salesman filter', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      const additionalFilters = {
        salesType: 'new',
        dateTo: '2025-12-31'
      };

      await salesInvoiceService.getSalesmanInvoices('salesman123', additionalFilters);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          salesmanId: 'salesman123',
          salesType: 'new',
          invoiceDate: expect.any(Object)
        })
      );
    });
  });

  describe('calculateInvoiceSummary', () => {
    it('should calculate summary from aggregate results', async () => {
      const mockAggregateResult = [
        {
          _id: null,
          totalInvoices: 5,
          totalAmount: 50000.5555,
          totalGST: 9000.1234,
          totalDiscount: 2500.9876,
          grossTotal: 43500.4321
        }
      ];

      Invoice.aggregate = jest.fn().mockResolvedValue(mockAggregateResult);

      const query = { type: 'sales', status: 'confirmed' };
      const summary = await salesInvoiceService.calculateInvoiceSummary(query);

      expect(Invoice.aggregate).toHaveBeenCalledWith([
        { $match: query },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: '$totals.netBillTotal' },
            totalGST: { $sum: '$totals.gstTotal' },
            totalDiscount: { $sum: '$totals.discountTotal' },
            grossTotal: { $sum: '$totals.grossTotal' }
          }
        }
      ]);

      expect(summary).toEqual({
        totalInvoices: 5,
        totalAmount: 50000.56, // Rounded to 2 decimals
        totalGST: 9000.12,
        totalDiscount: 2500.99,
        grossTotal: 43500.43
      });
    });

    it('should return zero summary when no results', async () => {
      Invoice.aggregate = jest.fn().mockResolvedValue([]);

      const query = { type: 'sales' };
      const summary = await salesInvoiceService.calculateInvoiceSummary(query);

      expect(summary).toEqual({
        totalInvoices: 0,
        totalAmount: 0,
        totalGST: 0,
        totalDiscount: 0,
        grossTotal: 0
      });
    });
  });
});
