const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');
const supplierService = require('../../src/services/supplierService');
const itemService = require('../../src/services/itemService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');
const accountService = require('../../src/services/accountService');
const ledgerService = require('../../src/services/ledgerService');
const Item = require('../../src/models/Item');

// Mock dependencies
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/services/supplierService');
jest.mock('../../src/services/itemService');
jest.mock('../../src/repositories/stockMovementRepository');
jest.mock('../../src/services/accountService');
jest.mock('../../src/services/ledgerService');
jest.mock('../../src/models/Item');

describe('Purchase Invoice Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPurchaseInvoice', () => {
    const mockSupplier = {
      _id: 'supplier123',
      code: 'SUPP001',
      name: 'Test Supplier',
      type: 'supplier',
      isActive: true,
      financialInfo: {
        paymentTerms: 30
      }
    };

    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Item',
      isActive: true,
      pricing: {
        costPrice: 80,
        salePrice: 100
      },
      tax: {
        gstRate: 18,
        whtRate: 2
      },
      inventory: {
        currentStock: 50
      }
    };

    const validInvoiceData = {
      supplierId: 'supplier123',
      items: [
        {
          itemId: 'item123',
          quantity: 20,
          unitPrice: 80,
          discount: 5,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }
      ],
      createdBy: 'user123',
      invoiceDate: new Date('2024-01-15'),
      notes: 'Test purchase invoice'
    };

    beforeEach(() => {
      supplierService.getSupplierById = jest.fn().mockResolvedValue(mockSupplier);
      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      invoiceRepository.generateInvoiceNumber = jest.fn().mockResolvedValue('PI2024000001');
      invoiceRepository.create = jest.fn().mockImplementation(data => Promise.resolve({ _id: 'invoice123', ...data }));
    });

    test('should create purchase invoice with valid data', async () => {
      const result = await purchaseInvoiceService.createPurchaseInvoice(validInvoiceData);

      expect(result).toBeDefined();
      expect(result.type).toBe('purchase');
      expect(result.supplierId).toBe('supplier123');
      expect(result.invoiceNumber).toBe('PI2024000001');
      expect(result.status).toBe('draft');
      expect(result.paymentStatus).toBe('pending');
      expect(supplierService.getSupplierById).toHaveBeenCalledWith('supplier123');
      expect(itemService.getItemById).toHaveBeenCalledWith('item123');
      expect(invoiceRepository.create).toHaveBeenCalled();
    });

    test('should throw error when supplier ID is missing', async () => {
      const invalidData = { ...validInvoiceData, supplierId: null };

      await expect(purchaseInvoiceService.createPurchaseInvoice(invalidData))
        .rejects.toThrow('Supplier ID is required');
    });

    test('should throw error when items array is empty', async () => {
      const invalidData = { ...validInvoiceData, items: [] };

      await expect(purchaseInvoiceService.createPurchaseInvoice(invalidData))
        .rejects.toThrow('At least one item is required');
    });

    test('should throw error when createdBy is missing', async () => {
      const invalidData = { ...validInvoiceData, createdBy: null };

      await expect(purchaseInvoiceService.createPurchaseInvoice(invalidData))
        .rejects.toThrow('Created by user ID is required');
    });

    test('should throw error when supplier is not active', async () => {
      supplierService.getSupplierById = jest.fn().mockResolvedValue({
        ...mockSupplier,
        isActive: false
      });

      await expect(purchaseInvoiceService.createPurchaseInvoice(validInvoiceData))
        .rejects.toThrow('Supplier is not active');
    });

    test('should throw error when supplier type is not supplier or both', async () => {
      supplierService.getSupplierById = jest.fn().mockResolvedValue({
        ...mockSupplier,
        type: 'customer'
      });

      await expect(purchaseInvoiceService.createPurchaseInvoice(validInvoiceData))
        .rejects.toThrow('Selected entity is not a supplier');
    });

    test('should calculate totals correctly', async () => {
      const result = await purchaseInvoiceService.createPurchaseInvoice(validInvoiceData);

      expect(result.totals).toBeDefined();
      expect(result.totals.subtotal).toBe(1600); // 20 * 80
      expect(result.totals.totalDiscount).toBe(80); // 5% of 1600
      expect(result.totals.totalTax).toBeGreaterThan(0);
      expect(result.totals.grandTotal).toBeGreaterThan(0);
    });

    test('should use supplier payment terms for due date calculation', async () => {
      // Create invoice data without dueDate to test automatic calculation
      const invoiceDataWithoutDueDate = {
        ...validInvoiceData,
        dueDate: undefined
      };

      const result = await purchaseInvoiceService.createPurchaseInvoice(invoiceDataWithoutDueDate);

      const today = new Date();
      const dueDate = new Date(result.dueDate);
      
      // Calculate the difference in days from today (since calculateDueDate uses new Date())
      const diffTime = dueDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      expect(result.dueDate).toBeDefined();
      // Should be approximately 30 days from today (allow 1 day variance for test execution time)
      expect(Math.abs(diffDays - 30)).toBeLessThanOrEqual(1);
    });
  });

  describe('processInvoiceItems', () => {
    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Item',
      isActive: true,
      tax: {
        gstRate: 18,
        whtRate: 2
      }
    };

    beforeEach(() => {
      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
    });

    test('should process valid invoice items', async () => {
      const items = [
        {
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100,
          discount: 10
        }
      ];

      const result = await purchaseInvoiceService.processInvoiceItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(10);
      expect(result[0].unitPrice).toBe(100);
      expect(result[0].discount).toBe(10);
      expect(result[0].taxAmount).toBeGreaterThan(0);
      expect(result[0].lineTotal).toBeGreaterThan(0);
    });

    test('should throw error for missing item ID', async () => {
      const items = [{ quantity: 10, unitPrice: 100 }];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Item ID is required for all items');
    });

    test('should throw error for invalid quantity', async () => {
      const items = [{ itemId: 'item123', quantity: 0, unitPrice: 100 }];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Invalid quantity for item item123');
    });

    test('should throw error for negative unit price', async () => {
      const items = [{ itemId: 'item123', quantity: 10, unitPrice: -50 }];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Invalid unit price for item item123');
    });

    test('should throw error for discount over 100%', async () => {
      const items = [{ itemId: 'item123', quantity: 10, unitPrice: 100, discount1Percent: 150 }];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Discount 1 must be between 0 and 100 for item item123');
    });

    test('should throw error when item is not active', async () => {
      itemService.getItemById = jest.fn().mockResolvedValue({
        ...mockItem,
        isActive: false
      });

      const items = [{ itemId: 'item123', quantity: 10, unitPrice: 100 }];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Item Test Item is not active');
    });

    test('should validate batch info dates', async () => {
      const items = [
        {
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-06-01'),
            expiryDate: new Date('2024-01-01') // Expiry before manufacturing
          }
        }
      ];

      await expect(purchaseInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Expiry date must be after manufacturing date');
    });

    test('should handle items without batch info', async () => {
      const items = [
        {
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100
        }
      ];

      const result = await purchaseInvoiceService.processInvoiceItems(items);

      expect(result[0].batchInfo).toEqual({});
    });
  });

  describe('calculateItemTax', () => {
    test('should calculate GST correctly', async () => {
      const item = {
        tax: {
          gstRate: 18,
          whtRate: 2
        }
      };

      const taxAmount = await purchaseInvoiceService.calculateItemTax(item, 1000);

      expect(taxAmount).toBe(180); // 18% of 1000
    });

    test('should return 0 for items without tax rates', async () => {
      const item = {
        tax: {
          gstRate: 0,
          whtRate: 0
        }
      };

      const taxAmount = await purchaseInvoiceService.calculateItemTax(item, 1000);

      expect(taxAmount).toBe(0);
    });

    test('should handle missing tax configuration', async () => {
      const item = { tax: {} };

      const taxAmount = await purchaseInvoiceService.calculateItemTax(item, 1000);

      expect(taxAmount).toBe(0);
    });
  });

  describe('calculateInvoiceTotals', () => {
    test('should calculate totals correctly for multiple items', () => {
      const items = [
        {
          quantity: 10,
          unitPrice: 100,
          lineSubtotal: 1000,
          discount1Amount: 100,
          discount2Amount: 0,
          taxAmount: 162
        },
        {
          quantity: 5,
          unitPrice: 200,
          lineSubtotal: 1000,
          discount1Amount: 50,
          discount2Amount: 0,
          taxAmount: 171
        }
      ];

      const totals = purchaseInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(2000); // (10*100) + (5*200)
      expect(totals.totalDiscount).toBe(150); // 100 + 50
      expect(totals.totalDiscount1).toBe(150); // 100 + 50
      expect(totals.totalDiscount2).toBe(0);
      expect(totals.totalTax).toBe(333); // 162 + 171
      expect(totals.grandTotal).toBe(2183); // 2000 - 150 + 333
    });

    test('should handle items with no discount', () => {
      const items = [
        {
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 180
        }
      ];

      const totals = purchaseInvoiceService.calculateInvoiceTotals(items);

      expect(totals.subtotal).toBe(1000);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.totalTax).toBe(180);
      expect(totals.grandTotal).toBe(1180);
    });
  });

  describe('generateInvoiceNumber', () => {
    test('should generate purchase invoice number', async () => {
      invoiceRepository.generateInvoiceNumber = jest.fn().mockResolvedValue('PI2024000001');

      const invoiceNumber = await purchaseInvoiceService.generateInvoiceNumber();

      expect(invoiceNumber).toBe('PI2024000001');
      expect(invoiceRepository.generateInvoiceNumber).toHaveBeenCalledWith('purchase');
    });
  });

  describe('validateInvoiceNumber', () => {
    test('should validate correct invoice number format', async () => {
      invoiceRepository.invoiceNumberExists = jest.fn().mockResolvedValue(false);

      const result = await purchaseInvoiceService.validateInvoiceNumber('PI2024000001');

      expect(result).toBe(true);
    });

    test('should throw error for empty invoice number', async () => {
      await expect(purchaseInvoiceService.validateInvoiceNumber(''))
        .rejects.toThrow('Invoice number is required');
    });

    test('should throw error for invalid format', async () => {
      await expect(purchaseInvoiceService.validateInvoiceNumber('INVALID123'))
        .rejects.toThrow('Invalid invoice number format');
    });

    test('should throw error for duplicate invoice number', async () => {
      invoiceRepository.invoiceNumberExists = jest.fn().mockResolvedValue(true);

      await expect(purchaseInvoiceService.validateInvoiceNumber('PI2024000001'))
        .rejects.toThrow('Invoice number PI2024000001 already exists');
    });
  });

  describe('getPurchaseInvoiceById', () => {
    test('should retrieve purchase invoice by ID', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        invoiceNumber: 'PI2024000001'
      };

      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);

      const result = await purchaseInvoiceService.getPurchaseInvoiceById('invoice123');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.findById).toHaveBeenCalledWith('invoice123');
    });

    test('should throw error when invoice not found', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(purchaseInvoiceService.getPurchaseInvoiceById('invalid123'))
        .rejects.toThrow('Purchase invoice not found');
    });

    test('should throw error when invoice is not purchase type', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'sales'
      };

      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);

      await expect(purchaseInvoiceService.getPurchaseInvoiceById('invoice123'))
        .rejects.toThrow('Invoice is not a purchase invoice');
    });
  });

  describe('getAllPurchaseInvoices', () => {
    test('should retrieve paginated purchase invoices', async () => {
      const mockInvoices = [
        { _id: 'inv1', type: 'purchase' },
        { _id: 'inv2', type: 'purchase' }
      ];

      invoiceRepository.search = jest.fn().mockResolvedValue(mockInvoices);
      invoiceRepository.count = jest.fn().mockResolvedValue(20);

      const result = await purchaseInvoiceService.getAllPurchaseInvoices({}, { page: 1, limit: 10 });

      expect(result.invoices).toEqual(mockInvoices);
      expect(result.pagination.totalItems).toBe(20);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(invoiceRepository.search).toHaveBeenCalledWith(
        { type: 'purchase' },
        expect.objectContaining({ limit: 10, skip: 0 })
      );
    });

    test('should apply filters correctly', async () => {
      invoiceRepository.search = jest.fn().mockResolvedValue([]);
      invoiceRepository.count = jest.fn().mockResolvedValue(0);

      const filters = { status: 'confirmed', supplierId: 'supplier123' };
      await purchaseInvoiceService.getAllPurchaseInvoices(filters);

      expect(invoiceRepository.search).toHaveBeenCalledWith(
        { ...filters, type: 'purchase' },
        expect.any(Object)
      );
    });
  });

  describe('updatePurchaseInvoice', () => {
    const mockInvoice = {
      _id: 'invoice123',
      type: 'purchase',
      status: 'draft',
      items: []
    };

    beforeEach(() => {
      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);
      invoiceRepository.update = jest.fn().mockImplementation((id, data) => 
        Promise.resolve({ ...mockInvoice, ...data })
      );
    });

    test('should update draft invoice', async () => {
      const updateData = { notes: 'Updated notes' };

      const result = await purchaseInvoiceService.updatePurchaseInvoice('invoice123', updateData);

      expect(result.notes).toBe('Updated notes');
      expect(invoiceRepository.update).toHaveBeenCalledWith('invoice123', updateData);
    });

    test('should throw error when updating confirmed invoice items', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        status: 'confirmed'
      });

      const updateData = { items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }] };

      await expect(purchaseInvoiceService.updatePurchaseInvoice('invoice123', updateData))
        .rejects.toThrow('Cannot modify confirmed invoice items');
    });

    test('should reprocess items when updating', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        tax: { gstRate: 18, whtRate: 0 }
      };

      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);

      const updateData = {
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }]
      };

      const result = await purchaseInvoiceService.updatePurchaseInvoice('invoice123', updateData);

      expect(result.items).toBeDefined();
      expect(result.totals).toBeDefined();
      expect(itemService.getItemById).toHaveBeenCalled();
    });
  });

  describe('deletePurchaseInvoice', () => {
    test('should delete draft invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        status: 'draft'
      };

      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);
      invoiceRepository.delete = jest.fn().mockResolvedValue(mockInvoice);

      const result = await purchaseInvoiceService.deletePurchaseInvoice('invoice123');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.delete).toHaveBeenCalledWith('invoice123');
    });

    test('should throw error when deleting confirmed invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        status: 'confirmed'
      };

      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);

      await expect(purchaseInvoiceService.deletePurchaseInvoice('invoice123'))
        .rejects.toThrow('Cannot delete confirmed or paid invoices');
    });
  });

  describe('confirmPurchaseInvoice', () => {
    const mockInvoice = {
      _id: 'invoice123',
      type: 'purchase',
      status: 'draft',
      invoiceNumber: 'PI2024000001',
      supplierId: 'supplier123',
      items: [
        {
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100
        }
      ],
      totals: {
        grandTotal: 1000
      }
    };

    beforeEach(() => {
      // Mock Warehouse model with proper chaining
      const Warehouse = require('../../src/models/Warehouse');
      const mockWarehouse = {
        _id: 'warehouse123',
        name: 'Main Warehouse',
        isActive: true
      };
      Warehouse.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockWarehouse)
      });

      // Mock accountService
      accountService.getAccountByCode = jest.fn().mockResolvedValue({
        _id: 'account123',
        code: 'INVENTORY_ASSET',
        name: 'Inventory Asset'
      });

      // Mock ledgerService
      ledgerService.createDoubleEntry = jest.fn().mockResolvedValue([
        { _id: 'ledger1', entryType: 'debit' },
        { _id: 'ledger2', entryType: 'credit' }
      ]);

      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);
      invoiceRepository.update = jest.fn().mockImplementation((id, data) =>
        Promise.resolve({ ...mockInvoice, ...data })
      );
      stockMovementRepository.create = jest.fn().mockImplementation(data =>
        Promise.resolve({ _id: 'movement123', ...data })
      );
      Item.findById = jest.fn().mockResolvedValue({
        _id: 'item123',
        inventory: { currentStock: 50 },
        save: jest.fn().mockResolvedValue(true)
      });
    });

    test('should confirm draft invoice and create stock movements', async () => {
      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice123', 'user123');

      expect(result.invoice.status).toBe('confirmed');
      expect(result.stockMovements).toBeDefined();
      expect(result.stockMovements.length).toBeGreaterThan(0);
      expect(stockMovementRepository.create).toHaveBeenCalled();
      expect(ledgerService.createDoubleEntry).toHaveBeenCalled();
    });

    test('should throw error when confirming non-draft invoice', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        status: 'confirmed'
      });

      await expect(purchaseInvoiceService.confirmPurchaseInvoice('invoice123', 'user123'))
        .rejects.toThrow('Cannot confirm invoice with status: confirmed');
    });

    test('should update inventory levels on confirmation', async () => {
      const mockItemDoc = {
        _id: 'item123',
        inventory: { currentStock: 50 },
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItemDoc);

      await purchaseInvoiceService.confirmPurchaseInvoice('invoice123', 'user123');

      expect(mockItemDoc.inventory.currentStock).toBe(60); // 50 + 10
      expect(mockItemDoc.save).toHaveBeenCalled();
    });
  });

  // Requirement 1.20-1.24, 10.1-10.10: Dual GST Rate Support
  describe('calculateDualGST', () => {
    test('should calculate GST 18% for standard items', () => {
      const items = [
        {
          boxQty: 10,
          boxTP: 100,
          unitQty: 0,
          unitTP: 0,
          discount: 0,
          gstRate: 18
        }
      ];

      const result = purchaseInvoiceService.calculateDualGST(items, {});

      expect(result.gst18Total).toBe(180); // (10 * 100) * 18%
      expect(result.gst4Total).toBe(0);
      expect(result.totalGST).toBe(180);
    });

    test('should calculate GST 4% for essential medicines', () => {
      const items = [
        {
          boxQty: 10,
          boxTP: 100,
          unitQty: 0,
          unitTP: 0,
          discount: 0,
          gstRate: 4
        }
      ];

      const result = purchaseInvoiceService.calculateDualGST(items, {});

      expect(result.gst18Total).toBe(0);
      expect(result.gst4Total).toBe(40); // (10 * 100) * 4%
      expect(result.totalGST).toBe(40);
    });

    test('should handle mixed GST rates in same invoice', () => {
      const items = [
        {
          boxQty: 10,
          boxTP: 100,
          unitQty: 0,
          unitTP: 0,
          discount: 0,
          gstRate: 18
        },
        {
          boxQty: 5,
          boxTP: 200,
          unitQty: 0,
          unitTP: 0,
          discount: 0,
          gstRate: 4
        }
      ];

      const result = purchaseInvoiceService.calculateDualGST(items, {});

      expect(result.gst18Total).toBe(180); // (10 * 100) * 18%
      expect(result.gst4Total).toBe(40); // (5 * 200) * 4%
      expect(result.totalGST).toBe(220); // 180 + 40
    });

    test('should apply discount before calculating GST', () => {
      const items = [
        {
          boxQty: 10,
          boxTP: 100,
          unitQty: 0,
          unitTP: 0,
          discount: 10, // 10% discount
          gstRate: 18
        }
      ];

      const result = purchaseInvoiceService.calculateDualGST(items, {});

      // Gross: 1000, After discount: 900, GST 18%: 162
      expect(result.gst18Total).toBe(162);
      expect(result.totalGST).toBe(162);
    });

    test('should handle box and unit quantities together', () => {
      const items = [
        {
          boxPacking: 10,
          boxQty: 5,
          boxTP: 100,
          unitQty: 20,
          unitTP: 10,
          discount: 0,
          gstRate: 18
        }
      ];

      const result = purchaseInvoiceService.calculateDualGST(items, {});

      // Box amount: 5 * 100 = 500, Unit amount: 20 * 10 = 200, Total: 700, GST 18%: 126
      expect(result.gst18Total).toBe(126);
      expect(result.totalGST).toBe(126);
    });
  });

  // Requirement 1.5, 1.25: Advance Tax Calculations
  describe('calculateAdvanceTax', () => {
    test('should calculate 0.5% advance tax for filer suppliers', () => {
      const supplier = { isTaxFiler: true };
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateAdvanceTax(supplier, taxableAmount);

      expect(result.rate).toBe(0.5);
      expect(result.taxAmount).toBe(50); // 10000 * 0.5%
      expect(result.isFiler).toBe(true);
      expect(result.description).toContain('0.5%');
    });

    test('should calculate 2.5% advance tax for non-filer suppliers', () => {
      const supplier = { isTaxFiler: false };
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateAdvanceTax(supplier, taxableAmount);

      expect(result.rate).toBe(2.5);
      expect(result.taxAmount).toBe(250); // 10000 * 2.5%
      expect(result.isFiler).toBe(false);
      expect(result.description).toContain('2.5%');
    });

    test('should default to filer rate when status not specified', () => {
      const supplier = {};
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateAdvanceTax(supplier, taxableAmount);

      expect(result.rate).toBe(0.5);
      expect(result.taxAmount).toBe(50);
      expect(result.isFiler).toBe(true);
    });
  });

  // Requirement 1.36: Non-filer GST 0.1%
  describe('calculateNonFilerGST', () => {
    test('should calculate 0.1% non-filer GST for non-filer accounts', () => {
      const supplier = {
        isNonFilerAccount: () => true
      };
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateNonFilerGST(supplier, taxableAmount);

      expect(result.rate).toBe(0.1);
      expect(result.taxAmount).toBe(10); // 10000 * 0.1%
      expect(result.isNonFiler).toBe(true);
      expect(result.description).toContain('0.1%');
    });

    test('should return zero for filer accounts', () => {
      const supplier = {
        isNonFilerAccount: () => false
      };
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateNonFilerGST(supplier, taxableAmount);

      expect(result.rate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.isNonFiler).toBe(false);
    });

    test('should handle supplier without isNonFilerAccount method', () => {
      const supplier = {};
      const taxableAmount = 10000;

      const result = purchaseInvoiceService.calculateNonFilerGST(supplier, taxableAmount);

      expect(result.rate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.isNonFiler).toBe(false);
    });
  });

  // Requirement 2.2-2.5: Batch Validation
  describe('validateBatchInfo', () => {
    test('should validate batch with all required fields', () => {
      const batchInfo = {
        batchNumber: 'BATCH001',
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01')
      };

      const result = purchaseInvoiceService.validateBatchInfo(batchInfo, 'Test Item');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return valid for missing batch info', () => {
      const result = purchaseInvoiceService.validateBatchInfo(null, 'Test Item');

      expect(result.isValid).toBe(true);
    });

    test('should return valid for batch without batch number', () => {
      const batchInfo = {
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01')
      };

      const result = purchaseInvoiceService.validateBatchInfo(batchInfo, 'Test Item');

      expect(result.isValid).toBe(true);
    });

    test('should require manufacturing date when batch number provided', () => {
      const batchInfo = {
        batchNumber: 'BATCH001',
        expiryDate: new Date('2025-01-01')
      };

      const result = purchaseInvoiceService.validateBatchInfo(batchInfo, 'Test Item');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manufacturing date is required for batch BATCH001 of Test Item');
    });

    test('should require expiry date when batch number provided', () => {
      const batchInfo = {
        batchNumber: 'BATCH001',
        manufacturingDate: new Date('2024-01-01')
      };

      const result = purchaseInvoiceService.validateBatchInfo(batchInfo, 'Test Item');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiry date is required for batch BATCH001 of Test Item');
    });

    test('should validate expiry date is after manufacturing date', () => {
      const batchInfo = {
        batchNumber: 'BATCH001',
        manufacturingDate: new Date('2025-01-01'),
        expiryDate: new Date('2024-01-01')
      };

      const result = purchaseInvoiceService.validateBatchInfo(batchInfo, 'Test Item');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiry date must be after manufacturing date for batch BATCH001 of Test Item');
    });
  });

  // Requirement 1.48: Cancel invoice with reversals
  describe('cancelPurchaseInvoice', () => {
    const mockInvoice = {
      _id: 'invoice123',
      type: 'purchase',
      status: 'confirmed',
      invoiceNumber: 'PI2024000001',
      items: [
        {
          itemId: 'item123',
          quantity: 10
        }
      ]
    };

    beforeEach(() => {
      invoiceRepository.findById = jest.fn().mockResolvedValue(mockInvoice);
      invoiceRepository.update = jest.fn().mockImplementation((id, data) =>
        Promise.resolve({ ...mockInvoice, ...data })
      );
      stockMovementRepository.create = jest.fn().mockImplementation(data =>
        Promise.resolve({ _id: 'movement123', ...data })
      );
      Item.findById = jest.fn().mockResolvedValue({
        _id: 'item123',
        inventory: { currentStock: 60 },
        save: jest.fn().mockResolvedValue(true)
      });
    });

    test('should cancel confirmed invoice and reverse stock movements', async () => {
      const result = await purchaseInvoiceService.cancelPurchaseInvoice('invoice123', 'user123', 'Test cancellation');

      expect(result.status).toBe('cancelled');
      expect(result.cancelledBy).toBe('user123');
      expect(result.cancellationReason).toBe('Test cancellation');
      expect(stockMovementRepository.create).toHaveBeenCalled();
    });

    test('should throw error when cancelling already cancelled invoice', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        status: 'cancelled'
      });

      await expect(purchaseInvoiceService.cancelPurchaseInvoice('invoice123', 'user123'))
        .rejects.toThrow('Invoice is already cancelled');
    });

    test('should throw error when cancelling paid invoice', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
        paymentStatus: 'paid'
      });

      await expect(purchaseInvoiceService.cancelPurchaseInvoice('invoice123', 'user123'))
        .rejects.toThrow('Cannot cancel paid invoice');
    });

    test('should reduce inventory levels on cancellation', async () => {
      const mockItemDoc = {
        _id: 'item123',
        inventory: { currentStock: 60 },
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItemDoc);

      await purchaseInvoiceService.cancelPurchaseInvoice('invoice123', 'user123', 'Test cancellation');

      expect(mockItemDoc.inventory.currentStock).toBe(50); // 60 - 10
      expect(mockItemDoc.save).toHaveBeenCalled();
    });

    test('should allow cancelling draft invoice without reversals', async () => {
      invoiceRepository.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        status: 'draft'
      });

      const result = await purchaseInvoiceService.cancelPurchaseInvoice('invoice123', 'user123', 'Test cancellation');

      expect(result.status).toBe('cancelled');
      // Stock movements should not be created for draft invoices
      expect(stockMovementRepository.create).not.toHaveBeenCalled();
    });
  });

  // Requirement 1.1: Generate invoice number with format PI2025000001
  describe('Invoice Number Format', () => {
    test('should generate invoice number with correct format', async () => {
      const mockInvoiceNumber = 'PI2025000001';
      invoiceRepository.generateInvoiceNumber = jest.fn().mockResolvedValue(mockInvoiceNumber);

      const result = await purchaseInvoiceService.generateInvoiceNumber();

      expect(result).toMatch(/^PI\d{10}$/);
      expect(result).toBe(mockInvoiceNumber);
    });

    test('should validate invoice number format PI + Year + 6 digits', async () => {
      invoiceRepository.invoiceNumberExists = jest.fn().mockResolvedValue(false);

      await expect(purchaseInvoiceService.validateInvoiceNumber('PI2025000001')).resolves.toBe(true);
      await expect(purchaseInvoiceService.validateInvoiceNumber('PI2024123456')).resolves.toBe(true);
    });

    test('should reject invalid invoice number formats', async () => {
      await expect(purchaseInvoiceService.validateInvoiceNumber('SI2025000001'))
        .rejects.toThrow('Invalid invoice number format');
      
      await expect(purchaseInvoiceService.validateInvoiceNumber('PI202500001'))
        .rejects.toThrow('Invalid invoice number format');
      
      await expect(purchaseInvoiceService.validateInvoiceNumber('PI20250000001'))
        .rejects.toThrow('Invalid invoice number format');
    });
  });

  // Requirement 1.7: Supplier Bill No validation
  describe('checkDuplicateSupplierBill', () => {
    test('should detect duplicate supplier bill number', async () => {
      const Invoice = require('../../src/models/Invoice');
      Invoice.findOne = jest.fn().mockResolvedValue({
        _id: 'existing123',
        invoiceNumber: 'PI2024000001',
        invoiceDate: new Date('2024-01-01')
      });

      const result = await purchaseInvoiceService.checkDuplicateSupplierBill('supplier123', 'BILL001');

      expect(result.isDuplicate).toBe(true);
      expect(result.existingInvoiceNumber).toBe('PI2024000001');
      expect(result.message).toContain('already exists');
    });

    test('should allow unique supplier bill number', async () => {
      const Invoice = require('../../src/models/Invoice');
      Invoice.findOne = jest.fn().mockResolvedValue(null);

      const result = await purchaseInvoiceService.checkDuplicateSupplierBill('supplier123', 'BILL002');

      expect(result.isDuplicate).toBe(false);
      expect(result.message).toContain('unique');
    });

    test('should exclude current invoice when checking duplicates', async () => {
      const Invoice = require('../../src/models/Invoice');
      Invoice.findOne = jest.fn().mockResolvedValue(null);

      const result = await purchaseInvoiceService.checkDuplicateSupplierBill(
        'supplier123',
        'BILL001',
        'invoice123'
      );

      expect(result.isDuplicate).toBe(false);
      expect(Invoice.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $ne: 'invoice123' }
        })
      );
    });
  });

  // Requirement 1.14: Calculate total unit quantity
  describe('calculateItemTaxableAmount', () => {
    test('should calculate taxable amount from box and unit quantities', () => {
      const item = {
        boxPacking: 10,
        boxQty: 5,
        boxTP: 100,
        unitQty: 20,
        unitTP: 10,
        discount: 0
      };

      const result = purchaseInvoiceService.calculateItemTaxableAmount(item);

      // Box: 5 * 100 = 500, Unit: 20 * 10 = 200, Total: 700
      expect(result).toBe(700);
    });

    test('should apply discount to taxable amount', () => {
      const item = {
        boxQty: 10,
        boxTP: 100,
        unitQty: 0,
        unitTP: 0,
        discount: 10
      };

      const result = purchaseInvoiceService.calculateItemTaxableAmount(item);

      // Gross: 1000, Discount 10%: 100, Taxable: 900
      expect(result).toBe(900);
    });

    test('should handle items with only box quantities', () => {
      const item = {
        boxQty: 10,
        boxTP: 100,
        unitQty: 0,
        unitTP: 0,
        discount: 0
      };

      const result = purchaseInvoiceService.calculateItemTaxableAmount(item);

      expect(result).toBe(1000);
    });

    test('should handle items with only unit quantities', () => {
      const item = {
        boxQty: 0,
        boxTP: 0,
        unitQty: 50,
        unitTP: 20,
        discount: 0
      };

      const result = purchaseInvoiceService.calculateItemTaxableAmount(item);

      expect(result).toBe(1000);
    });
  });
});
