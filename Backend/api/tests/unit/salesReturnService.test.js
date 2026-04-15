const salesReturnService = require('../../src/services/salesReturnService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');
const batchService = require('../../src/services/batchService');
const AppError = require('../../src/utils/appError');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/LedgerEntry');
jest.mock('../../src/services/batchService');

describe('SalesReturnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReturnInvoiceNumber', () => {
    it('should generate return invoice number with correct format', async () => {
      const year = new Date().getFullYear();
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(null)
      });

      const invoiceNumber = await salesReturnService.generateReturnInvoiceNumber();
      
      expect(invoiceNumber).toMatch(new RegExp(`^SR${year}\\d{6}$`));
      expect(invoiceNumber).toBe(`SR${year}000001`);
    });

    it('should increment sequence number', async () => {
      const year = new Date().getFullYear();
      const lastReturn = { invoiceNumber: `SR${year}000005` };
      
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(lastReturn)
      });

      const invoiceNumber = await salesReturnService.generateReturnInvoiceNumber();
      
      expect(invoiceNumber).toBe(`SR${year}000006`);
    });
  });

  describe('validateReturn', () => {
    const mockOriginalInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      items: [
        {
          itemId: { _id: 'item123', name: 'Test Item' },
          itemName: 'Test Item',
          totalUnitQty: 100,
          quantity: 100,
          batchNumber: 'BATCH001'
        },
        {
          itemId: { _id: 'item456', name: 'Another Item' },
          itemName: 'Another Item',
          totalUnitQty: 50,
          quantity: 50,
          batchNumber: 'BATCH002'
        }
      ]
    };

    it('should pass validation for valid return items', async () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 50,
          batchNumber: 'BATCH001'
        }
      ];

      await expect(
        salesReturnService.validateReturn(mockOriginalInvoice, returnItems)
      ).resolves.not.toThrow();
    });

    it('should throw error when return quantity exceeds original quantity', async () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 150, // Exceeds original 100
          batchNumber: 'BATCH001'
        }
      ];

      await expect(
        salesReturnService.validateReturn(mockOriginalInvoice, returnItems)
      ).rejects.toThrow('Return validation failed');
    });

    it('should throw error when item not in original invoice', async () => {
      const returnItems = [
        {
          itemId: 'item999', // Not in original invoice
          returnQuantity: 10,
          batchNumber: 'BATCH999'
        }
      ];

      await expect(
        salesReturnService.validateReturn(mockOriginalInvoice, returnItems)
      ).rejects.toThrow('was not in the original invoice');
    });

    it('should throw error when batch number does not match', async () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 50,
          batchNumber: 'BATCH999' // Different from original BATCH001
        }
      ];

      await expect(
        salesReturnService.validateReturn(mockOriginalInvoice, returnItems)
      ).rejects.toThrow('Batch number');
    });

    it('should throw error when return quantity is zero or negative', async () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 0,
          batchNumber: 'BATCH001'
        }
      ];

      await expect(
        salesReturnService.validateReturn(mockOriginalInvoice, returnItems)
      ).rejects.toThrow('Return quantity must be greater than 0');
    });
  });

  describe('processReturnItems', () => {
    const mockOriginalInvoice = {
      items: [
        {
          itemId: {
            _id: 'item123',
            name: 'Test Item',
            code: 'ITEM001',
            packing: 10
          },
          itemName: 'Test Item',
          itemCode: 'ITEM001',
          companyName: 'Test Company',
          warehouseId: 'warehouse123',
          batchNumber: 'BATCH001',
          expiryDate: new Date('2026-12-31'),
          totalUnitQty: 100,
          quantity: 100,
          boxTP: 100,
          unitTP: 10,
          totalAmountBeforeDiscount: 1000,
          discount1Amount: 50,
          discount2Amount: 30,
          discount1Percent: 5,
          discount2Percent: 3,
          gstTotal: 180,
          gstBoxAmount: 150,
          gstUnitAmount: 30,
          gstRate: 18,
          advanceTaxAmount: 5,
          netAmount: 1105,
          unitPrice: 10
        }
      ]
    };

    it('should process return items with negative quantities', () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 50, // Half of original
          batchNumber: 'BATCH001'
        }
      ];

      const processedItems = salesReturnService.processReturnItems(
        mockOriginalInvoice,
        returnItems
      );

      expect(processedItems).toHaveLength(1);
      expect(processedItems[0].totalUnitQty).toBe(-50);
      expect(processedItems[0].quantity).toBe(-50);
      expect(processedItems[0].totalAmountBeforeDiscount).toBe(-500); // Half of 1000
      expect(processedItems[0].discount1Amount).toBe(-25); // Half of 50
      expect(processedItems[0].gstTotal).toBe(-90); // Half of 180
      expect(processedItems[0].netAmount).toBe(-552.5); // Half of 1105
    });

    it('should calculate box and unit quantities correctly', () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 25, // 2 boxes + 5 units (packing = 10)
          batchNumber: 'BATCH001'
        }
      ];

      const processedItems = salesReturnService.processReturnItems(
        mockOriginalInvoice,
        returnItems
      );

      expect(processedItems[0].boxQty).toBe(-2); // 25 / 10 = 2
      expect(processedItems[0].unitQty).toBe(-5); // 25 % 10 = 5
    });

    it('should set scheme quantities to zero for returns', () => {
      const returnItems = [
        {
          itemId: 'item123',
          returnQuantity: 50,
          batchNumber: 'BATCH001'
        }
      ];

      const processedItems = salesReturnService.processReturnItems(
        mockOriginalInvoice,
        returnItems
      );

      expect(processedItems[0].scheme1Qty).toBe(0);
      expect(processedItems[0].scheme2Qty).toBe(0);
    });
  });

  describe('calculateReturnTotals', () => {
    it('should calculate return totals with negative amounts', () => {
      const returnItems = [
        {
          totalAmountBeforeDiscount: -500,
          discount1Amount: -25,
          discount2Amount: -15,
          gstTotal: -90,
          advanceTaxAmount: -2.5
        },
        {
          totalAmountBeforeDiscount: -300,
          discount1Amount: -15,
          discount2Amount: -10,
          gstTotal: -54,
          advanceTaxAmount: -1.5
        }
      ];

      const totals = salesReturnService.calculateReturnTotals(returnItems);

      expect(totals.grossTotal).toBe(-800);
      expect(totals.discountTotal).toBe(-65);
      expect(totals.gstTotal).toBe(-144);
      expect(totals.advanceTaxTotal).toBe(-4);
      expect(totals.netBillTotal).toBe(-883); // -800 - (-65) + (-144) + (-4)
    });

    it('should round totals to 2 decimal places', () => {
      const returnItems = [
        {
          totalAmountBeforeDiscount: -333.333,
          discount1Amount: -16.666,
          discount2Amount: -10.111,
          gstTotal: -59.999,
          advanceTaxAmount: -1.666
        }
      ];

      const totals = salesReturnService.calculateReturnTotals(returnItems);

      expect(totals.grossTotal).toBe(-333.33);
      expect(totals.discountTotal).toBe(-26.78);
      expect(totals.gstTotal).toBe(-60);
      expect(totals.advanceTaxTotal).toBe(-1.67);
    });
  });

  describe('createReturn', () => {
    const mockOriginalInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      type: 'sales',
      status: 'confirmed',
      customerId: {
        _id: 'customer123',
        name: 'Test Customer',
        code: 'CUST001',
        town: 'Test Town',
        currentBalance: 5000,
        creditLimit: 50000
      },
      salesmanId: { _id: 'salesman123', name: 'Test Salesman', code: 'SM001' },
      dimensionId: 'dimension123',
      advanceTaxRate: 0.5,
      taxInvoiceType: 'normal',
      claimAccountId: 'claim123',
      items: [
        {
          itemId: {
            _id: 'item123',
            name: 'Test Item',
            code: 'ITEM001',
            packing: 10
          },
          itemName: 'Test Item',
          itemCode: 'ITEM001',
          companyName: 'Test Company',
          warehouseId: 'warehouse123',
          batchNumber: 'BATCH001',
          totalUnitQty: 100,
          quantity: 100,
          totalAmountBeforeDiscount: 1000,
          discount1Amount: 50,
          discount2Amount: 30,
          discount1Percent: 5,
          discount2Percent: 3,
          gstTotal: 180,
          gstBoxAmount: 150,
          gstUnitAmount: 30,
          gstRate: 18,
          advanceTaxAmount: 5,
          netAmount: 1105,
          unitPrice: 10,
          boxTP: 100,
          unitTP: 10
        }
      ]
    };

    const returnData = {
      returnItems: [
        {
          itemId: 'item123',
          returnQuantity: 50,
          batchNumber: 'BATCH001'
        }
      ],
      returnReason: 'damaged',
      returnNotes: 'Items damaged during transport'
    };

    it('should create return invoice successfully', async () => {
      const year = new Date().getFullYear();
      const createdReturn = {
        _id: 'return123',
        invoiceNumber: `SR${year}000001`,
        type: 'return_sales',
        salesType: 'return',
        customerId: mockOriginalInvoice.customerId,
        originalInvoiceId: 'invoice123'
      };

      // Mock Invoice.findById - first call for original invoice, second for return invoice
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockOriginalInvoice)
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(createdReturn)
        });

      // Mock generateReturnInvoiceNumber
      Invoice.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(null)
      });

      // Mock Invoice.create
      Invoice.create = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: `SR${year}000001`
      });

      const returnInvoice = await salesReturnService.createReturn(
        'invoice123',
        returnData,
        'user123'
      );

      expect(Invoice.create).toHaveBeenCalled();
      expect(returnInvoice).toBeDefined();
      expect(returnInvoice.type).toBe('return_sales');
    });

    it('should throw error if original invoice not found', async () => {
      // Mock Invoice.findById to return null
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        salesReturnService.createReturn('invoice999', returnData, 'user123')
      ).rejects.toThrow('Original invoice not found');
    });

    it('should throw error if original invoice is not a sales invoice', async () => {
      const purchaseInvoice = { ...mockOriginalInvoice, type: 'purchase' };
      
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(purchaseInvoice)
      });

      await expect(
        salesReturnService.createReturn('invoice123', returnData, 'user123')
      ).rejects.toThrow('Can only create returns for sales invoices');
    });

    it('should throw error if original invoice is not confirmed', async () => {
      const draftInvoice = { ...mockOriginalInvoice, status: 'draft' };
      
      // Mock Invoice.findById to return draft invoice
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(draftInvoice)
      });

      await expect(
        salesReturnService.createReturn('invoice123', returnData, 'user123')
      ).rejects.toThrow('Can only create returns for confirmed invoices');
    });

    it('should throw error if no return items provided', async () => {
      const invalidData = { ...returnData, returnItems: [] };

      await expect(
        salesReturnService.createReturn('invoice123', invalidData, 'user123')
      ).rejects.toThrow('Original invoice and return items are required');
    });
  });

  describe('processReturn', () => {
    const mockReturnInvoice = {
      _id: 'return123',
      invoiceNumber: 'SR2025000001',
      type: 'return_sales',
      status: 'draft',
      customerId: 'customer123',
      originalInvoiceId: 'invoice123',
      invoiceDate: new Date(),
      items: [
        {
          itemId: 'item123',
          itemName: 'Test Item',
          warehouseId: 'warehouse123',
          batchNumber: 'BATCH001',
          totalUnitQty: -50,
          netAmount: -552.5
        }
      ],
      totals: {
        netBillTotal: -552.5,
        grossTotal: -500,
        discountTotal: -40,
        gstTotal: -90,
        advanceTaxTotal: -2.5
      },
      claimAccountId: 'claim123'
    };

    beforeEach(() => {
      // Mock session
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };

      Invoice.startSession = jest.fn().mockResolvedValue(mockSession);

      // Mock getReturnInvoiceById
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockReturnInvoice)
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({ ...mockReturnInvoice, status: 'confirmed' })
        });

      // Mock StockMovement.create
      StockMovement.create = jest.fn().mockResolvedValue([{}]);

      // Mock Inventory update
      const Inventory = require('../../src/models/Inventory');
      Inventory.findOneAndUpdate = jest.fn().mockResolvedValue({});

      // Mock batchService
      batchService.returnToBatch = jest.fn().mockResolvedValue({});

      // Mock Customer update
      Customer.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      // Mock LedgerEntry.create
      LedgerEntry.create = jest.fn().mockResolvedValue([{}]);

      // Mock Invoice.findByIdAndUpdate
      Invoice.findByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: 'return123',
        status: 'confirmed'
      });
    });

    it('should process return successfully', async () => {
      const processedReturn = await salesReturnService.processReturn('return123', 'user123');

      expect(StockMovement.create).toHaveBeenCalled();
      expect(Customer.findByIdAndUpdate).toHaveBeenCalled();
      expect(LedgerEntry.create).toHaveBeenCalled();
      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'return123',
        expect.objectContaining({
          status: 'confirmed',
          confirmedBy: 'user123'
        }),
        expect.any(Object)
      );
    });

    it('should restore stock to warehouse', async () => {
      await salesReturnService.processReturn('return123', 'user123');

      expect(StockMovement.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            movementType: 'in',
            quantity: 50, // Absolute value of -50
            toWarehouse: 'warehouse123'
          })
        ]),
        expect.any(Object)
      );
    });

    it('should reduce customer balance', async () => {
      await salesReturnService.processReturn('return123', 'user123');

      expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer123',
        { $inc: { currentBalance: -552.5 } }, // Credit amount (absolute value)
        expect.any(Object)
      );
    });

    it('should create reverse ledger entries', async () => {
      await salesReturnService.processReturn('return123', 'user123');

      // Should create multiple ledger entries
      expect(LedgerEntry.create).toHaveBeenCalled();
      const calls = LedgerEntry.create.mock.calls;
      
      // Check for customer credit entry
      const customerEntry = calls.find(call => 
        call[0][0].accountId === 'customer123' && call[0][0].entryType === 'credit'
      );
      expect(customerEntry).toBeDefined();
    });

    it('should throw error if return is not in draft status', async () => {
      const confirmedReturn = { ...mockReturnInvoice, status: 'confirmed' };
      
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(confirmedReturn)
      });

      await expect(
        salesReturnService.processReturn('return123', 'user123')
      ).rejects.toThrow('Only draft return invoices can be processed');
    });
  });

  describe('generateCreditNote', () => {
    const mockReturnInvoice = {
      _id: 'return123',
      invoiceNumber: 'SR2025000001',
      type: 'return_sales',
      status: 'confirmed',
      invoiceDate: new Date('2025-01-15'),
      originalInvoiceId: 'invoice123',
      customerId: {
        _id: 'customer123',
        name: 'Test Customer',
        code: 'CUST001',
        town: 'Test Town',
        address: '123 Test St',
        phone: '555-1234'
      },
      returnMetadata: {
        returnReason: 'damaged',
        returnNotes: 'Items damaged during transport'
      },
      items: [
        {
          itemName: 'Test Item',
          itemCode: 'ITEM001',
          companyName: 'Test Company',
          totalUnitQty: -50,
          unitPrice: 10,
          totalAmountBeforeDiscount: -500,
          discount1Amount: -25,
          discount2Amount: -15,
          gstTotal: -90,
          advanceTaxAmount: -2.5,
          netAmount: -552.5
        }
      ],
      totals: {
        grossTotal: -500,
        discountTotal: -40,
        gstTotal: -90,
        advanceTaxTotal: -2.5,
        netBillTotal: -552.5
      }
    };

    const mockOriginalInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      invoiceDate: new Date('2025-01-01'),
      customerId: {
        _id: 'customer123',
        name: 'Test Customer',
        code: 'CUST001',
        town: 'Test Town',
        address: '123 Test St',
        phone: '555-1234'
      }
    };

    beforeEach(() => {
      // Mock getReturnInvoiceById - first call returns return invoice
      // Mock findById for original invoice - second call returns original invoice
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockReturnInvoice)
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockOriginalInvoice)
        });
    });

    it('should generate credit note successfully', async () => {
      const creditNote = await salesReturnService.generateCreditNote('return123');

      expect(creditNote).toBeDefined();
      expect(creditNote.creditNoteNumber).toBe('CN2025000001'); // CN + invoice number without SR
      expect(creditNote.returnInvoiceNumber).toBe('SR2025000001');
      expect(creditNote.originalInvoiceNumber).toBe('SI2025000001');
      expect(creditNote.totals.creditAmount).toBe(552.5); // Absolute value
    });

    it('should include customer information', async () => {
      const creditNote = await salesReturnService.generateCreditNote('return123');

      expect(creditNote.customer).toBeDefined();
      expect(creditNote.customer.name).toBe('Test Customer');
      expect(creditNote.customer.code).toBe('CUST001');
      expect(creditNote.customer.town).toBe('Test Town');
    });

    it('should include return reason and notes', async () => {
      const creditNote = await salesReturnService.generateCreditNote('return123');

      expect(creditNote.returnReason).toBe('damaged');
      expect(creditNote.returnNotes).toBe('Items damaged during transport');
    });

    it('should include items with absolute values', async () => {
      const creditNote = await salesReturnService.generateCreditNote('return123');

      expect(creditNote.items).toHaveLength(1);
      expect(creditNote.items[0].returnQuantity).toBe(50); // Absolute value
      expect(creditNote.items[0].amount).toBe(500); // Absolute value
      expect(creditNote.items[0].netAmount).toBe(552.5); // Absolute value
    });

    it('should throw error if return is not confirmed', async () => {
      const draftReturn = { ...mockReturnInvoice, status: 'draft' };
      
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(draftReturn)
      });

      await expect(
        salesReturnService.generateCreditNote('return123')
      ).rejects.toThrow('Only confirmed return invoices can have credit notes');
    });
  });

  describe('getReturnsForInvoice', () => {
    it('should get all returns for an invoice', async () => {
      const mockReturns = [
        {
          _id: 'return1',
          invoiceNumber: 'SR2025000001',
          originalInvoiceId: 'invoice123'
        },
        {
          _id: 'return2',
          invoiceNumber: 'SR2025000002',
          originalInvoiceId: 'invoice123'
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReturns)
      });

      const returns = await salesReturnService.getReturnsForInvoice('invoice123');

      expect(returns).toHaveLength(2);
      expect(Invoice.find).toHaveBeenCalledWith({
        originalInvoiceId: 'invoice123',
        type: 'return_sales'
      });
    });
  });

  describe('getReturnStatistics', () => {
    it('should calculate return statistics correctly', async () => {
      const mockReturns = [
        {
          status: 'confirmed',
          totals: { netBillTotal: -500 }
        },
        {
          status: 'confirmed',
          totals: { netBillTotal: -300 }
        },
        {
          status: 'draft',
          totals: { netBillTotal: -200 }
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReturns)
      });

      const stats = await salesReturnService.getReturnStatistics('invoice123');

      expect(stats.totalReturns).toBe(3);
      expect(stats.confirmedReturns).toBe(2);
      expect(stats.draftReturns).toBe(1);
      expect(stats.totalReturnAmount).toBe(1000); // 500 + 300 + 200 (absolute values)
    });

    it('should return zero statistics when no returns exist', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      const stats = await salesReturnService.getReturnStatistics('invoice123');

      expect(stats.totalReturns).toBe(0);
      expect(stats.confirmedReturns).toBe(0);
      expect(stats.draftReturns).toBe(0);
      expect(stats.totalReturnAmount).toBe(0);
    });
  });
});
