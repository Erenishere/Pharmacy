const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const taxService = require('../../src/services/taxService');
const creditManagementService = require('../../src/services/creditManagementService');
const batchService = require('../../src/services/batchService');
const AppError = require('../../src/utils/appError');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Item');
jest.mock('../../src/services/taxService');
jest.mock('../../src/services/creditManagementService');
jest.mock('../../src/services/batchService');

describe('SalesInvoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', async () => {
      const year = new Date().getFullYear();
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(null)
      });

      const invoiceNumber = await salesInvoiceService.generateInvoiceNumber();
      
      expect(invoiceNumber).toMatch(new RegExp(`^SI${year}\\d{6}$`));
      expect(invoiceNumber).toBe(`SI${year}000001`);
    });

    it('should increment sequence number', async () => {
      const year = new Date().getFullYear();
      const lastInvoice = { invoiceNumber: `SI${year}000005` };
      
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(lastInvoice)
      });

      const invoiceNumber = await salesInvoiceService.generateInvoiceNumber();
      
      expect(invoiceNumber).toBe(`SI${year}000006`);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should calculate totals correctly', () => {
      const items = [
        {
          totalAmountBeforeDiscount: 1000,
          discount1Amount: 50,
          discount2Amount: 30,
          gstTotal: 180,
          advanceTaxAmount: 5
        },
        {
          totalAmountBeforeDiscount: 500,
          discount1Amount: 25,
          discount2Amount: 15,
          gstTotal: 90,
          advanceTaxAmount: 2.5
        }
      ];

      const customerTaxInfo = { isNonFiler: false };

      const totals = salesInvoiceService.calculateInvoiceTotals(items, customerTaxInfo);

      expect(totals.grossTotal).toBe(1500);
      expect(totals.discountTotal).toBe(120);
      expect(totals.gstTotal).toBe(270);
      expect(totals.advanceTaxTotal).toBe(7.5);
      expect(totals.nonFilerGst).toBe(0);
      expect(totals.netBillTotal).toBe(1657.5);
    });

    it('should calculate non-filer GST for non-filer customers', () => {
      const items = [
        {
          totalAmountBeforeDiscount: 1000,
          discount1Amount: 0,
          discount2Amount: 0,
          gstTotal: 180,
          advanceTaxAmount: 25
        }
      ];

      const customerTaxInfo = { isNonFiler: true };

      const totals = salesInvoiceService.calculateInvoiceTotals(items, customerTaxInfo);

      expect(totals.grossTotal).toBe(1000);
      expect(totals.nonFilerGst).toBe(1); // 0.1% of 1000
      expect(totals.netBillTotal).toBe(1206); // 1000 + 180 + 25 + 1
    });
  });

  describe('createInvoice', () => {
    const mockCustomer = {
      _id: 'customer123',
      name: 'Test Customer',
      town: 'Test Town',
      currentBalance: 5000,
      creditLimit: 50000,
      salesmanId: 'salesman123'
    };

    const mockItem = {
      _id: 'item123',
      name: 'Test Item',
      code: 'ITEM001',
      packing: 10,
      company: { name: 'Test Company' }
    };

    const invoiceData = {
      customerId: 'customer123',
      items: [
        {
          itemId: 'item123',
          warehouseId: 'warehouse123',
          boxQty: 2,
          unitQty: 5,
          boxTP: 100,
          unitTP: 10,
          discount1Percent: 5,
          scheme1Qty: 2
        }
      ],
      creditDays: 30,
      status: 'draft'
    };

    beforeEach(() => {
      // Mock Invoice.findOne for generateInvoiceNumber
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(null)
      });

      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      
      taxService.getTaxRateForCustomer = jest.fn().mockResolvedValue({
        advanceTaxRate: 0.5,
        isNonFiler: false
      });
      
      taxService.getTaxRateForItem = jest.fn().mockResolvedValue({
        gstRate: 18
      });

      taxService.calculateBoxUnitGST = jest.fn()
        .mockReturnValueOnce({ boxGSTAmount: 36, unitGSTAmount: 0 })
        .mockReturnValueOnce({ boxGSTAmount: 0, unitGSTAmount: 9 });

      creditManagementService.checkCreditLimit = jest.fn().mockResolvedValue({
        exceeded: false
      });

      Invoice.create = jest.fn().mockResolvedValue({
        _id: 'invoice123',
        invoiceNumber: 'SI2025000001'
      });

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: 'invoice123',
          invoiceNumber: 'SI2025000001'
        })
      });
    });

    it('should create invoice successfully', async () => {
      const createdInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'SI2025000001',
        customerId: mockCustomer._id,
        items: [],
        totals: {}
      };

      // Mock the final getInvoiceById call
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(createdInvoice)
      });

      const invoice = await salesInvoiceService.createInvoice(invoiceData, 'user123');

      expect(Customer.findById).toHaveBeenCalledWith('customer123');
      expect(Item.findById).toHaveBeenCalledWith('item123');
      expect(Invoice.create).toHaveBeenCalled();
      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toBe('SI2025000001');
    });

    it('should throw error if customer not found', async () => {
      Customer.findById = jest.fn().mockResolvedValue(null);

      await expect(
        salesInvoiceService.createInvoice(invoiceData, 'user123')
      ).rejects.toThrow('Customer not found');
    });

    it('should throw error if no items provided', async () => {
      const invalidData = { ...invoiceData, items: [] };

      await expect(
        salesInvoiceService.createInvoice(invalidData, 'user123')
      ).rejects.toThrow('Customer and at least one item are required');
    });

    it('should throw error if item not found', async () => {
      Item.findById = jest.fn().mockResolvedValue(null);

      await expect(
        salesInvoiceService.createInvoice(invoiceData, 'user123')
      ).rejects.toThrow('Item not found');
    });
  });

  describe('validateStockAvailability', () => {
    it('should pass validation when stock is sufficient', async () => {
      const items = [
        {
          itemId: 'item123',
          itemName: 'Test Item',
          warehouseId: 'warehouse123',
          totalUnitQty: 10,
          scheme1Qty: 2,
          scheme2Qty: 0,
          batchNumber: 'BATCH001'
        }
      ];

      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({
        valid: true
      });

      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({
        isExpired: false
      });

      await expect(
        salesInvoiceService.validateStockAvailability(items)
      ).resolves.not.toThrow();
    });

    it('should throw error when batch quantity is insufficient', async () => {
      const items = [
        {
          itemId: 'item123',
          itemName: 'Test Item',
          warehouseId: 'warehouse123',
          totalUnitQty: 10,
          scheme1Qty: 2,
          scheme2Qty: 0,
          batchNumber: 'BATCH001'
        }
      ];

      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({
        valid: false,
        error: 'Insufficient quantity'
      });

      await expect(
        salesInvoiceService.validateStockAvailability(items)
      ).rejects.toThrow('Stock validation failed');
    });

    it('should throw error when batch is expired', async () => {
      const items = [
        {
          itemId: 'item123',
          itemName: 'Test Item',
          warehouseId: 'warehouse123',
          totalUnitQty: 10,
          scheme1Qty: 0,
          scheme2Qty: 0,
          batchNumber: 'BATCH001'
        }
      ];

      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({
        valid: true
      });

      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({
        isExpired: true
      });

      await expect(
        salesInvoiceService.validateStockAvailability(items)
      ).rejects.toThrow('Batch BATCH001 has expired');
    });
  });

  describe('updateInvoice', () => {
    it('should update draft invoice successfully', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        status: 'draft',
        customerId: 'customer123'
      };

      const updatedInvoice = {
        ...mockInvoice,
        otherTitle: 'Updated Title'
      };

      // First call to getInvoiceById (to check status)
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockInvoice)
        })
        // Second call to getInvoiceById (after update)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(updatedInvoice)
        });

      Invoice.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedInvoice);

      const updates = { otherTitle: 'Updated Title' };
      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.otherTitle).toBe('Updated Title');
    });

    it('should throw error when updating confirmed invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        status: 'confirmed'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      await expect(
        salesInvoiceService.updateInvoice('invoice123', {}, 'user123')
      ).rejects.toThrow('Only draft invoices can be updated');
    });
  });

  describe('deleteInvoice', () => {
    it('should delete draft invoice successfully', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        status: 'draft'
      };

      // Mock getInvoiceById
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.findByIdAndDelete = jest.fn().mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      expect(Invoice.findByIdAndDelete).toHaveBeenCalledWith('invoice123');
      expect(result).toBe(true);
    });

    it('should throw error when deleting confirmed invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        status: 'confirmed'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      await expect(
        salesInvoiceService.deleteInvoice('invoice123', 'user123')
      ).rejects.toThrow('Only draft invoices can be deleted');
    });
  });

  describe('getInvoices', () => {
    it('should return paginated invoices', async () => {
      const mockInvoices = [
        { _id: 'invoice1', invoiceNumber: 'SI2025000001' },
        { _id: 'invoice2', invoiceNumber: 'SI2025000002' }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockInvoices)
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await salesInvoiceService.getInvoices({}, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockInvoices);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply filters correctly', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      Invoice.countDocuments = jest.fn().mockResolvedValue(0);

      const filters = {
        customerId: 'customer123',
        status: 'confirmed',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31'
      };

      await salesInvoiceService.getInvoices(filters, {});

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceType: 'sales',
          customerId: 'customer123',
          status: 'confirmed',
          invoiceDate: expect.any(Object)
        })
      );
    });
  });
});
