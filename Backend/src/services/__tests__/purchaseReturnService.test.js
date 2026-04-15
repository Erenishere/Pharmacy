const mongoose = require('mongoose');
const purchaseReturnService = require('../purchaseReturnService');
const Invoice = require('../../models/Invoice');
const inventoryService = require('../inventoryService');
const stockMovementRepository = require('../../repositories/stockMovementRepository');
const ledgerService = require('../ledgerService');

// Mock dependencies
jest.mock('../../models/Invoice');
jest.mock('../inventoryService');
jest.mock('../../repositories/stockMovementRepository');
jest.mock('../ledgerService');

describe('PurchaseReturnService', () => {
  let mockUserId;
  let mockInvoiceId;
  let mockItemId;
  let mockSupplierId;
  let mockWarehouseId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockInvoiceId = new mongoose.Types.ObjectId();
    mockItemId = new mongoose.Types.ObjectId();
    mockSupplierId = new mongoose.Types.ObjectId();
    mockWarehouseId = new mongoose.Types.ObjectId();
  });

  describe('validateReturnQuantities', () => {
    // Requirement 3.2: Allow reference to original purchase invoice
    it('should return error when original invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        [],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Original invoice not found');
    });

    // Requirement 3.1: Use purchase type "Purchase Return Invoice"
    it('should return error when invoice is not a purchase type', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'sales',
        items: [],
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        [],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Can only create returns for purchase invoices');
    });

    // Requirement 3.3: Use negative quantities for returned items
    it('should validate return quantities against original invoice', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 5,
            boxPacking: 10,
            quantity: 105,
          },
        ],
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Invoice.find.mockResolvedValue([]); // No existing returns

      const returnItems = [
        {
          itemId: mockItemId,
          boxQuantity: 5,
          unitQuantity: 2,
        },
      ];

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        returnItems,
      );

      expect(result.valid).toBe(true);
      expect(result.validatedItems).toHaveLength(1);
      expect(result.validatedItems[0].availableForReturn).toBe(105);
    });

    it('should reject return when quantity exceeds available', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 5,
            boxPacking: 10,
            quantity: 105,
          },
        ],
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Invoice.find.mockResolvedValue([]); // No existing returns

      const returnItems = [
        {
          itemId: mockItemId,
          boxQuantity: 20, // Exceeds available
          unitQuantity: 0,
        },
      ];

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        returnItems,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Cannot return');
    });

    it('should account for already returned quantities', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 0,
            boxPacking: 10,
            quantity: 100,
          },
        ],
      };

      const existingReturn = {
        items: [
          {
            itemId: mockItemId,
            boxQuantity: -5,
            unitQuantity: 0,
            quantity: -50,
          },
        ],
        status: 'confirmed',
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Invoice.find.mockResolvedValue([existingReturn]);

      const returnItems = [
        {
          itemId: mockItemId,
          boxQuantity: 6, // Would exceed available (100 - 50 = 50 available)
          unitQuantity: 0,
        },
      ];

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        returnItems,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('already returned');
    });

    it('should reject zero or negative return quantities', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 0,
            boxPacking: 10,
            quantity: 100,
          },
        ],
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Invoice.find.mockResolvedValue([]);

      const returnItems = [
        {
          itemId: mockItemId,
          boxQuantity: 0,
          unitQuantity: 0,
        },
      ];

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        returnItems,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than 0');
    });

    it('should reject return for item not in original invoice', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 0,
            boxPacking: 10,
            quantity: 100,
          },
        ],
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Invoice.find.mockResolvedValue([]);

      const differentItemId = new mongoose.Types.ObjectId();
      const returnItems = [
        {
          itemId: differentItemId,
          boxQuantity: 5,
          unitQuantity: 0,
        },
      ];

      const result = await purchaseReturnService.validateReturnQuantities(
        mockInvoiceId,
        returnItems,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not found in original invoice');
    });
  });

  describe('getReturnableItems', () => {
    it('should return list of items with returnable quantities', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: {
              _id: mockItemId,
              name: 'Test Item',
              code: 'TEST001',
            },
            boxQuantity: 10,
            unitQuantity: 5,
            boxPacking: 10,
            quantity: 105,
            boxRate: 100,
            unitRate: 10,
            gstRate: 18,
          },
        ],
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice),
      });
      Invoice.find.mockResolvedValue([]);

      const result = await purchaseReturnService.getReturnableItems(mockInvoiceId);

      expect(result).toHaveLength(1);
      expect(result[0].itemId).toEqual(mockItemId);
      expect(result[0].availableForReturn).toBe(105);
      expect(result[0].canReturn).toBe(true);
    });

    it('should exclude items with no available quantity', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        items: [
          {
            itemId: {
              _id: mockItemId,
              name: 'Test Item',
              code: 'TEST001',
            },
            boxQuantity: 10,
            unitQuantity: 0,
            boxPacking: 10,
            quantity: 100,
            boxRate: 100,
            unitRate: 10,
            gstRate: 18,
          },
        ],
      };

      const existingReturn = {
        items: [
          {
            itemId: mockItemId,
            quantity: -100, // All returned
          },
        ],
        status: 'confirmed',
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice),
      });
      Invoice.find.mockResolvedValue([existingReturn]);

      const result = await purchaseReturnService.getReturnableItems(mockInvoiceId);

      expect(result).toHaveLength(0);
    });

    it('should throw error for non-purchase invoice', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        type: 'sales',
        items: [],
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice),
      });

      await expect(
        purchaseReturnService.getReturnableItems(mockInvoiceId),
      ).rejects.toThrow('Can only get returnable items for purchase invoices');
    });
  });

  describe('generateDebitNote', () => {
    // Requirement 3.6: Generate debit note
    it('should generate debit note with correct structure', () => {
      const mockReturnInvoice = {
        invoiceNumber: 'PRI2025000001',
        invoiceDate: new Date('2025-01-15'),
        originalInvoiceId: {
          invoiceNumber: 'PI2025000001',
        },
        supplierId: mockSupplierId,
        supplierName: 'Test Supplier',
        totals: {
          grandTotal: -10000,
          gst18Total: -1500,
          gst4Total: -300,
        },
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Items damaged during transit',
        },
      };

      const debitNote = purchaseReturnService.generateDebitNote(mockReturnInvoice);

      expect(debitNote.debitNoteNumber).toBe('DNPRI2025000001');
      expect(debitNote.originalInvoiceNumber).toBe('PI2025000001');
      expect(debitNote.supplierId).toBe(mockSupplierId);
      expect(debitNote.supplierName).toBe('Test Supplier');
      expect(debitNote.totalAmount).toBe(10000); // Absolute value
      expect(debitNote.gst18Amount).toBe(1500); // Absolute value
      expect(debitNote.gst4Amount).toBe(300); // Absolute value
      expect(debitNote.reason).toBe('damaged');
      expect(debitNote.notes).toBe('Items damaged during transit');
    });

    it('should handle missing GST amounts', () => {
      const mockReturnInvoice = {
        invoiceNumber: 'PRI2025000002',
        invoiceDate: new Date('2025-01-15'),
        originalInvoiceId: {
          invoiceNumber: 'PI2025000002',
        },
        supplierId: mockSupplierId,
        supplierName: 'Test Supplier',
        totals: {
          grandTotal: -5000,
        },
        returnMetadata: {
          returnReason: 'wrong_item',
        },
      };

      const debitNote = purchaseReturnService.generateDebitNote(mockReturnInvoice);

      expect(debitNote.gst18Amount).toBe(0);
      expect(debitNote.gst4Amount).toBe(0);
    });
  });

  describe('createPurchaseReturn', () => {
    // Requirement 3.1-3.10: Complete return processing
    it('should create purchase return with negative quantities', async () => {
      const mockSupplier = {
        _id: mockSupplierId,
        name: 'Test Supplier',
        town: 'Test Town',
        isTaxFiler: true,
      };

      const mockOriginalInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        supplierId: mockSupplier,
        supplierBillNo: 'BILL001',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 5,
            quantity: 105,
            boxRate: 100,
            unitRate: 10,
            boxPacking: 10,
            discount1Percent: 5,
            gstRate: 18,
          },
        ],
      };

      // Mock validateReturnQuantities to return valid
      jest.spyOn(purchaseReturnService, 'validateReturnQuantities').mockResolvedValue({
        valid: true,
        errors: [],
        validatedItems: [
          {
            itemId: mockItemId.toString(),
            boxQuantity: 5,
            unitQuantity: 2,
            availableForReturn: 105,
            originalQuantity: 105,
            alreadyReturned: 0,
          },
        ],
      });

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOriginalInvoice),
      });
      Invoice.countDocuments.mockResolvedValue(0);

      const mockSave = jest.fn().mockResolvedValue(true);
      const mockReturnInvoice = {
        save: mockSave,
        _id: new mongoose.Types.ObjectId(),
        items: [],
        totals: {},
      };
      Invoice.mockImplementation(() => mockReturnInvoice);

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(true);
      ledgerService.createLedgerEntry.mockResolvedValue(true);

      const returnData = {
        originalInvoiceId: mockInvoiceId,
        returnItems: [
          {
            itemId: mockItemId,
            boxQuantity: 5,
            unitQuantity: 2,
          },
        ],
        returnReason: 'damaged',
        returnNotes: 'Items damaged',
        createdBy: mockUserId,
      };

      const result = await purchaseReturnService.createPurchaseReturn(returnData);

      expect(result.returnInvoice).toBeDefined();
      expect(result.debitNote).toBeDefined();
      expect(mockSave).toHaveBeenCalled();

      // Verify negative quantities (Requirement 3.3)
      const invoiceCall = Invoice.mock.calls[0][0];
      expect(invoiceCall.items[0].boxQuantity).toBe(-5);
      expect(invoiceCall.items[0].unitQuantity).toBe(-2);
      expect(invoiceCall.items[0].quantity).toBeLessThan(0);
    });

    // Requirement 3.5: Reverse GST and tax calculations
    it('should reverse GST calculations for dual rates', async () => {
      const mockSupplier = {
        _id: mockSupplierId,
        name: 'Test Supplier',
        town: 'Test Town',
        isTaxFiler: true,
      };

      const secondItemId = new mongoose.Types.ObjectId();

      const mockOriginalInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        supplierId: mockSupplier,
        supplierBillNo: 'BILL001',
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 0,
            quantity: 100,
            boxRate: 100,
            unitRate: 10,
            boxPacking: 10,
            discount1Percent: 0,
            gstRate: 18,
          },
          {
            itemId: secondItemId,
            boxQuantity: 5,
            unitQuantity: 0,
            quantity: 50,
            boxRate: 200,
            unitRate: 20,
            boxPacking: 10,
            discount1Percent: 0,
            gstRate: 4, // Essential medicine rate
          },
        ],
      };

      // Mock validateReturnQuantities to return valid
      jest.spyOn(purchaseReturnService, 'validateReturnQuantities').mockResolvedValue({
        valid: true,
        errors: [],
        validatedItems: [
          {
            itemId: mockItemId.toString(),
            boxQuantity: 5,
            unitQuantity: 0,
            availableForReturn: 100,
            originalQuantity: 100,
            alreadyReturned: 0,
          },
          {
            itemId: secondItemId.toString(),
            boxQuantity: 2,
            unitQuantity: 0,
            availableForReturn: 50,
            originalQuantity: 50,
            alreadyReturned: 0,
          },
        ],
      });

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOriginalInvoice),
      });
      Invoice.countDocuments.mockResolvedValue(0);

      const mockSave = jest.fn().mockResolvedValue(true);
      const mockReturnInvoice = {
        save: mockSave,
        _id: new mongoose.Types.ObjectId(),
        items: [],
        totals: {},
      };
      Invoice.mockImplementation(() => mockReturnInvoice);

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(true);
      ledgerService.createLedgerEntry.mockResolvedValue(true);

      const returnData = {
        originalInvoiceId: mockInvoiceId,
        returnItems: [
          {
            itemId: mockItemId,
            boxQuantity: 5,
            unitQuantity: 0,
          },
          {
            itemId: secondItemId,
            boxQuantity: 2,
            unitQuantity: 0,
          },
        ],
        returnReason: 'quality_issue',
        returnNotes: 'Quality issues',
        createdBy: mockUserId,
      };

      const result = await purchaseReturnService.createPurchaseReturn(returnData);

      const invoiceCall = Invoice.mock.calls[0][0];

      // Verify GST 18% is reversed
      expect(invoiceCall.totals.gst18Total).toBeLessThan(0);

      // Verify GST 4% is reversed
      expect(invoiceCall.totals.gst4Total).toBeLessThan(0);

      // Verify total GST is negative
      expect(invoiceCall.totals.totalTax).toBeLessThan(0);
    });

    it('should throw error when validation fails', async () => {
      const mockOriginalInvoice = {
        _id: mockInvoiceId,
        type: 'purchase',
        supplierId: {
          _id: mockSupplierId,
          name: 'Test Supplier',
        },
        items: [
          {
            itemId: mockItemId,
            boxQuantity: 10,
            unitQuantity: 0,
            quantity: 100,
          },
        ],
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOriginalInvoice),
      });
      Invoice.find.mockResolvedValue([]);

      const returnData = {
        originalInvoiceId: mockInvoiceId,
        returnItems: [
          {
            itemId: mockItemId,
            boxQuantity: 20, // Exceeds available
            unitQuantity: 0,
          },
        ],
        returnReason: 'damaged',
        createdBy: mockUserId,
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData),
      ).rejects.toThrow('Return validation failed');
    });

    it('should throw error for non-purchase invoice', async () => {
      const mockOriginalInvoice = {
        _id: mockInvoiceId,
        type: 'sales',
        items: [],
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOriginalInvoice),
      });

      const returnData = {
        originalInvoiceId: mockInvoiceId,
        returnItems: [],
        returnReason: 'damaged',
        createdBy: mockUserId,
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData),
      ).rejects.toThrow('Can only create returns for purchase invoices');
    });
  });

  describe('processReturnInventory', () => {
    // Requirement 3.4: Reduce stock from warehouse
    it('should reduce inventory for returned items', async () => {
      const mockReturnInvoice = {
        _id: new mongoose.Types.ObjectId(),
        invoiceDate: new Date(),
        createdBy: mockUserId,
        items: [
          {
            itemId: mockItemId,
            quantity: -50,
            warehouseId: mockWarehouseId,
          },
        ],
      };

      const mockOriginalInvoice = {
        items: [
          {
            itemId: mockItemId,
            warehouseId: mockWarehouseId,
          },
        ],
      };

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(true);

      await purchaseReturnService.processReturnInventory(
        mockReturnInvoice,
        mockOriginalInvoice,
      );

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        mockItemId,
        50, // Absolute value
        'decrease',
        'Purchase return',
      );

      // Requirement 3.9: Update stock movement records with return type
      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: mockItemId,
          movementType: 'return_to_supplier',
          quantity: -50,
          referenceType: 'return_purchase',
        }),
      );
    });
  });

  describe('createReverseLedgerEntries', () => {
    // Requirement 3.8: Create reverse ledger entries
    // Requirement 3.7: Reduce supplier balance
    it('should create reverse ledger entries for purchase return', async () => {
      const mockReturnInvoice = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'PRI2025000001',
        invoiceDate: new Date(),
        createdBy: mockUserId,
        totals: {
          grandTotal: -10000,
          totalTax: -1500,
          subtotal: -8500,
        },
      };

      const mockOriginalInvoice = {
        supplierId: {
          _id: mockSupplierId,
        },
      };

      ledgerService.createLedgerEntry.mockResolvedValue(true);

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice,
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);

      // Verify inventory account credit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'INVENTORY_ACCOUNT',
          debit: 0,
          credit: 8500,
        }),
      );

      // Verify supplier account debit (reduces balance)
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockSupplierId,
          debit: 10000,
          credit: 0,
        }),
      );

      // Verify GST input account credit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'GST_INPUT_ACCOUNT',
          debit: 0,
          credit: 1500,
        }),
      );
    });

    it('should skip GST entry when no tax', async () => {
      const mockReturnInvoice = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'PRI2025000002',
        invoiceDate: new Date(),
        createdBy: mockUserId,
        totals: {
          grandTotal: -5000,
          totalTax: 0,
          subtotal: -5000,
        },
      };

      const mockOriginalInvoice = {
        supplierId: {
          _id: mockSupplierId,
        },
      };

      ledgerService.createLedgerEntry.mockResolvedValue(true);

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice,
      );

      // Should only create 2 entries (inventory and supplier)
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelPurchaseReturn', () => {
    it('should reverse inventory adjustments when cancelling return', async () => {
      const mockReturnInvoice = {
        _id: new mongoose.Types.ObjectId(),
        type: 'return_purchase',
        status: 'confirmed',
        items: [
          {
            itemId: mockItemId,
            quantity: -50,
          },
        ],
      };

      Invoice.findById.mockResolvedValue(mockReturnInvoice);
      Invoice.findByIdAndUpdate.mockResolvedValue({
        ...mockReturnInvoice,
        status: 'cancelled',
      });

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(true);

      const result = await purchaseReturnService.cancelPurchaseReturn(
        mockReturnInvoice._id,
        mockUserId,
        'Cancelled by user',
      );

      // Should add back the inventory
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        mockItemId,
        50,
        'add',
        'Return cancellation',
      );

      expect(result.status).toBe('cancelled');
    });

    it('should throw error when return not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      await expect(
        purchaseReturnService.cancelPurchaseReturn(
          new mongoose.Types.ObjectId(),
          mockUserId,
          'Test reason',
        ),
      ).rejects.toThrow('Return invoice not found');
    });

    it('should throw error when invoice is not a return', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        type: 'purchase',
        status: 'confirmed',
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      await expect(
        purchaseReturnService.cancelPurchaseReturn(
          mockInvoice._id,
          mockUserId,
          'Test reason',
        ),
      ).rejects.toThrow('Not a purchase return invoice');
    });

    it('should throw error when return already cancelled', async () => {
      const mockReturnInvoice = {
        _id: new mongoose.Types.ObjectId(),
        type: 'return_purchase',
        status: 'cancelled',
      };

      Invoice.findById.mockResolvedValue(mockReturnInvoice);

      await expect(
        purchaseReturnService.cancelPurchaseReturn(
          mockReturnInvoice._id,
          mockUserId,
          'Test reason',
        ),
      ).rejects.toThrow('Return invoice is already cancelled');
    });
  });

  describe('generateReturnInvoiceNumber', () => {
    it('should generate return invoice number with correct format', async () => {
      const year = new Date().getFullYear();
      Invoice.countDocuments.mockResolvedValue(5);

      const invoiceNumber = await purchaseReturnService.generateReturnInvoiceNumber();

      expect(invoiceNumber).toBe(`PRI${year}000006`);
      expect(Invoice.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: expect.any(RegExp),
          type: 'return_purchase',
        }),
      );
    });

    it('should pad invoice number correctly', async () => {
      const year = new Date().getFullYear();
      Invoice.countDocuments.mockResolvedValue(0);

      const invoiceNumber = await purchaseReturnService.generateReturnInvoiceNumber();

      expect(invoiceNumber).toBe(`PRI${year}000001`);
    });
  });

  describe('Task 5.1 Wrapper Methods', () => {
    // Test createReturn wrapper method
    describe('createReturn', () => {
      it('should create return using wrapper method', async () => {
        const mockSupplier = {
          _id: mockSupplierId,
          name: 'Test Supplier',
          town: 'Test Town',
          isTaxFiler: true,
        };

        const mockOriginalInvoice = {
          _id: mockInvoiceId,
          type: 'purchase',
          supplierId: mockSupplier,
          supplierBillNo: 'BILL001',
          items: [
            {
              itemId: mockItemId,
              boxQuantity: 10,
              unitQuantity: 5,
              quantity: 105,
              boxRate: 100,
              unitRate: 10,
              boxPacking: 10,
              discount1Percent: 5,
              gstRate: 18,
            },
          ],
        };

        jest.spyOn(purchaseReturnService, 'validateReturnQuantities').mockResolvedValue({
          valid: true,
          errors: [],
          validatedItems: [
            {
              itemId: mockItemId.toString(),
              boxQuantity: 5,
              unitQuantity: 2,
              availableForReturn: 105,
              originalQuantity: 105,
              alreadyReturned: 0,
            },
          ],
        });

        Invoice.findById.mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOriginalInvoice),
        });
        Invoice.countDocuments.mockResolvedValue(0);

        const mockSave = jest.fn().mockResolvedValue(true);
        const mockReturnInvoice = {
          save: mockSave,
          _id: new mongoose.Types.ObjectId(),
          items: [],
          totals: {},
        };
        Invoice.mockImplementation(() => mockReturnInvoice);

        inventoryService.adjustInventory.mockResolvedValue(true);
        stockMovementRepository.create.mockResolvedValue(true);
        ledgerService.createLedgerEntry.mockResolvedValue(true);

        const returnData = {
          returnItems: [
            {
              itemId: mockItemId,
              boxQuantity: 5,
              unitQuantity: 2,
            },
          ],
          returnReason: 'damaged',
          returnNotes: 'Items damaged',
        };

        const result = await purchaseReturnService.createReturn(
          mockInvoiceId,
          returnData,
          mockUserId,
        );

        expect(result.returnInvoice).toBeDefined();
        expect(result.debitNote).toBeDefined();
        expect(mockSave).toHaveBeenCalled();
      });
    });

    // Test validateReturn wrapper method
    describe('validateReturn', () => {
      it('should validate return using wrapper method', async () => {
        const mockOriginalInvoice = {
          _id: mockInvoiceId,
          type: 'purchase',
          items: [
            {
              itemId: mockItemId,
              boxQuantity: 10,
              unitQuantity: 5,
              boxPacking: 10,
              quantity: 105,
            },
          ],
        };

        Invoice.findById.mockResolvedValue(mockOriginalInvoice);
        Invoice.find.mockResolvedValue([]);

        const returnItems = [
          {
            itemId: mockItemId,
            boxQuantity: 5,
            unitQuantity: 2,
          },
        ];

        const result = await purchaseReturnService.validateReturn(
          mockOriginalInvoice,
          returnItems,
        );

        expect(result.valid).toBe(true);
        expect(result.validatedItems).toHaveLength(1);
      });
    });

    // Test processReturn wrapper method
    describe('processReturn', () => {
      it('should process return for stock and ledger using wrapper method', async () => {
        const mockOriginalInvoice = {
          _id: mockInvoiceId,
          supplierId: {
            _id: mockSupplierId,
          },
          items: [
            {
              itemId: mockItemId,
              warehouseId: mockWarehouseId,
            },
          ],
        };

        const mockReturnInvoice = {
          _id: new mongoose.Types.ObjectId(),
          originalInvoiceId: mockInvoiceId,
          invoiceNumber: 'PRI2025000001',
          invoiceDate: new Date(),
          createdBy: mockUserId,
          items: [
            {
              itemId: mockItemId,
              quantity: -50,
              warehouseId: mockWarehouseId,
            },
          ],
          totals: {
            grandTotal: -10000,
            totalTax: -1500,
            subtotal: -8500,
          },
        };

        Invoice.findById.mockResolvedValue(mockOriginalInvoice);
        inventoryService.adjustInventory.mockResolvedValue(true);
        stockMovementRepository.create.mockResolvedValue(true);
        ledgerService.createLedgerEntry.mockResolvedValue(true);

        const result = await purchaseReturnService.processReturn(mockReturnInvoice);

        expect(result.success).toBe(true);
        expect(result.inventoryProcessed).toBe(true);
        expect(result.ledgerEntriesCreated).toBe(true);
        expect(inventoryService.adjustInventory).toHaveBeenCalled();
        expect(ledgerService.createLedgerEntry).toHaveBeenCalled();
      });

      it('should throw error when original invoice not found', async () => {
        const mockReturnInvoice = {
          _id: new mongoose.Types.ObjectId(),
          originalInvoiceId: mockInvoiceId,
          items: [],
        };

        Invoice.findById.mockResolvedValue(null);

        await expect(
          purchaseReturnService.processReturn(mockReturnInvoice),
        ).rejects.toThrow('Original invoice not found');
      });
    });
  });
});
