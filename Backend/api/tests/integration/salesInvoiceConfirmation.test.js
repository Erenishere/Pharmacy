const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');
const batchService = require('../../src/services/batchService');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/LedgerEntry');
jest.mock('../../src/services/batchService');

describe('Sales Invoice Confirmation Workflow', () => {
  let mockInvoice;
  let mockCustomer;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session for transactions
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn()
    };

    Invoice.startSession = jest.fn().mockResolvedValue(mockSession);

    mockCustomer = {
      _id: 'customer123',
      name: 'Test Customer',
      currentBalance: 5000
    };

    mockInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      status: 'draft',
      customerId: 'customer123',
      invoiceDate: new Date(),
      items: [
        {
          itemId: 'item1',
          itemName: 'Test Item 1',
          warehouseId: 'warehouse1',
          totalUnitQty: 25,
          scheme1Qty: 2,
          scheme2Qty: 0,
          batchNumber: 'BATCH001'
        },
        {
          itemId: 'item2',
          itemName: 'Test Item 2',
          warehouseId: 'warehouse1',
          totalUnitQty: 30,
          scheme1Qty: 0,
          scheme2Qty: 5,
          batchNumber: null
        }
      ],
      totals: {
        netBillTotal: 10000,
        grossTotal: 9000,
        discountTotal: 500,
        gstTotal: 1500,
        advanceTaxTotal: 50,
        nonFilerGst: 0
      },
      claimAccountId: null
    };
  });

  describe('confirmInvoice', () => {
    it('should confirm a draft invoice and create all necessary records', async () => {
      // Mock getInvoiceById
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      // Mock stock validation
      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({ valid: true });
      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({ isExpired: false });
      batchService.deductFromBatch = jest.fn().mockResolvedValue(true);

      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });
      Inventory.findOneAndUpdate = jest.fn().mockResolvedValue({ quantity: 70 });

      // Mock stock movement creation
      StockMovement.create = jest.fn().mockResolvedValue([
        { _id: 'movement1', itemId: 'item1', quantity: 27 },
        { _id: 'movement2', itemId: 'item2', quantity: 35 }
      ]);

      // Mock customer update
      Customer.findByIdAndUpdate = jest.fn().mockResolvedValue(mockCustomer);

      // Mock ledger entry creation
      LedgerEntry.create = jest.fn().mockResolvedValue([{ _id: 'ledger1' }]);

      // Mock invoice update
      const confirmedInvoice = {
        ...mockInvoice,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: 'user123'
      };

      Invoice.findByIdAndUpdate = jest.fn().mockResolvedValue(confirmedInvoice);

      // Mock final getInvoiceById call to return confirmed invoice
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockInvoice)
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(confirmedInvoice)
        });

      // Execute confirmation
      const result = await salesInvoiceService.confirmInvoice('invoice123', 'user123');

      // Verify invoice status check
      expect(Invoice.findById).toHaveBeenCalledWith('invoice123');

      // Verify transaction was started
      expect(Invoice.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();

      // Verify stock movements were created (called once per item)
      expect(StockMovement.create).toHaveBeenCalledTimes(2);
      
      // Verify first item stock movement
      expect(StockMovement.create).toHaveBeenCalledWith(
        [expect.objectContaining({
          itemId: 'item1',
          movementType: 'out',
          quantity: 27, // 25 + 2
          fromWarehouse: 'warehouse1'
        })],
        expect.objectContaining({ session: mockSession })
      );

      // Verify second item stock movement
      expect(StockMovement.create).toHaveBeenCalledWith(
        [expect.objectContaining({
          itemId: 'item2',
          movementType: 'out',
          quantity: 35, // 30 + 5
          fromWarehouse: 'warehouse1'
        })],
        expect.objectContaining({ session: mockSession })
      );

      // Verify inventory was updated
      expect(Inventory.findOneAndUpdate).toHaveBeenCalled();

      // Verify batch deduction
      expect(batchService.deductFromBatch).toHaveBeenCalledWith('BATCH001', 27, mockSession);

      // Verify customer balance was updated
      expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer123',
        { $inc: { currentBalance: 10000 } },
        expect.objectContaining({ session: mockSession })
      );

      // Verify ledger entries were created
      expect(LedgerEntry.create).toHaveBeenCalled();
      const ledgerCalls = LedgerEntry.create.mock.calls;
      expect(ledgerCalls.length).toBeGreaterThan(0);

      // Verify invoice was updated to confirmed
      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          status: 'confirmed',
          confirmedBy: 'user123'
        }),
        expect.objectContaining({ new: true, session: mockSession })
      );

      // Verify transaction was committed
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify result
      expect(result.status).toBe('confirmed');
    });

    it('should not confirm an already confirmed invoice', async () => {
      const confirmedInvoice = { ...mockInvoice, status: 'confirmed' };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(confirmedInvoice)
      });

      await expect(
        salesInvoiceService.confirmInvoice('invoice123', 'user123')
      ).rejects.toThrow('Only draft invoices can be confirmed');

      // Verify no transaction was started
      expect(Invoice.startSession).not.toHaveBeenCalled();
    });

    it('should fail confirmation if stock is insufficient', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      // Mock batch validation to pass (so we get to inventory check)
      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({ valid: true });
      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({ isExpired: false });

      // Mock insufficient stock
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 10 }); // Less than required

      await expect(
        salesInvoiceService.confirmInvoice('invoice123', 'user123')
      ).rejects.toThrow('Stock validation failed');

      // Verify no transaction was started
      expect(Invoice.startSession).not.toHaveBeenCalled();
    });

    it('should rollback all changes if confirmation fails', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      // Mock successful validation
      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({ valid: true });
      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({ isExpired: false });
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });

      // Mock stock movement creation success
      StockMovement.create = jest.fn().mockResolvedValue([{}]);
      Inventory.findOneAndUpdate = jest.fn().mockResolvedValue({});
      batchService.deductFromBatch = jest.fn().mockResolvedValue(true);
      Customer.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      // Mock ledger entry creation failure
      LedgerEntry.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        salesInvoiceService.confirmInvoice('invoice123', 'user123')
      ).rejects.toThrow('Failed to confirm invoice');

      // Verify transaction was aborted
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify invoice was not updated
      expect(Invoice.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should create claim account ledger entry when claim account is used', async () => {
      const invoiceWithClaim = {
        ...mockInvoice,
        claimAccountId: 'claim123'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(invoiceWithClaim)
      });

      // Mock successful operations
      batchService.validateBatchQuantity = jest.fn().mockResolvedValue({ valid: true });
      batchService.checkBatchExpiry = jest.fn().mockResolvedValue({ isExpired: false });
      batchService.deductFromBatch = jest.fn().mockResolvedValue(true);
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });
      Inventory.findOneAndUpdate = jest.fn().mockResolvedValue({});
      StockMovement.create = jest.fn().mockResolvedValue([{}]);
      Customer.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      LedgerEntry.create = jest.fn().mockResolvedValue([{}]);
      Invoice.findByIdAndUpdate = jest.fn().mockResolvedValue({ ...invoiceWithClaim, status: 'confirmed' });

      await salesInvoiceService.confirmInvoice('invoice123', 'user123');

      // Verify claim account ledger entry was created
      const ledgerCalls = LedgerEntry.create.mock.calls;
      const claimEntry = ledgerCalls.find(call => 
        call[0].some(entry => entry.accountId === 'claim123' && entry.accountType === 'Claim_Account')
      );

      expect(claimEntry).toBeDefined();
    });
  });
});
