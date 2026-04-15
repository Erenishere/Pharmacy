const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const taxService = require('../../src/services/taxService');
const AppError = require('../../src/utils/appError');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Item');
jest.mock('../../src/services/taxService');

describe('SalesInvoiceService - Update and Delete Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateInvoice', () => {
    const mockDraftInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      status: 'draft',
      customerId: 'customer123',
      items: [
        {
          itemId: 'item123',
          boxQty: 1,
          unitQty: 5,
          totalUnitQty: 15,
          totalAmountBeforeDiscount: 150,
          discount1Amount: 0,
          discount2Amount: 0,
          gstTotal: 27,
          advanceTaxAmount: 0.75
        }
      ],
      totals: {
        grossTotal: 150,
        discountTotal: 0,
        gstTotal: 27,
        advanceTaxTotal: 0.75,
        nonFilerGst: 0,
        netBillTotal: 177.75
      }
    };

    const mockUpdatedInvoice = {
      ...mockDraftInvoice,
      otherTitle: 'Updated Title',
      memoNo: 'MEMO123'
    };

    beforeEach(() => {
      // Mock getInvoiceById calls
      Invoice.findById = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockDraftInvoice)
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockUpdatedInvoice)
        });

      Invoice.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedInvoice);
    });

    it('should update draft invoice with simple field changes', async () => {
      const updates = {
        otherTitle: 'Updated Title',
        memoNo: 'MEMO123'
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          otherTitle: 'Updated Title',
          memoNo: 'MEMO123',
          updatedBy: 'user123',
          updatedAt: expect.any(Date)
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
      expect(result.otherTitle).toBe('Updated Title');
    });

    it('should update draft invoice with items and recalculate totals', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'ITEM001',
        packing: 10,
        company: { name: 'Test Company' }
      };

      const mockCustomer = {
        _id: 'customer123',
        name: 'Test Customer'
      };

      const newItems = [
        {
          itemId: 'item123',
          warehouseId: 'warehouse123',
          boxQty: 2,
          unitQty: 10,
          boxTP: 100,
          unitTP: 10,
          discount1Percent: 10
        }
      ];

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);

      taxService.getTaxRateForCustomer = jest.fn().mockResolvedValue({
        advanceTaxRate: 0.5,
        isNonFiler: false
      });

      taxService.getTaxRateForItem = jest.fn().mockResolvedValue({
        gstRate: 18
      });

      taxService.calculateBoxUnitGST = jest.fn()
        .mockReturnValueOnce({ boxGSTAmount: 36, unitGSTAmount: 0 })
        .mockReturnValueOnce({ boxGSTAmount: 0, unitGSTAmount: 18 });

      const updates = { items: newItems };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Item.findById).toHaveBeenCalledWith('item123');
      expect(taxService.getTaxRateForCustomer).toHaveBeenCalledWith('customer123');
      expect(Invoice.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when updating confirmed invoice', async () => {
      const confirmedInvoice = {
        ...mockDraftInvoice,
        status: 'confirmed'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(confirmedInvoice)
      });

      await expect(
        salesInvoiceService.updateInvoice('invoice123', { otherTitle: 'Test' }, 'user123')
      ).rejects.toThrow('Only draft invoices can be updated');
    });

    it('should throw error when updating cancelled invoice', async () => {
      const cancelledInvoice = {
        ...mockDraftInvoice,
        status: 'cancelled'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(cancelledInvoice)
      });

      await expect(
        salesInvoiceService.updateInvoice('invoice123', { otherTitle: 'Test' }, 'user123')
      ).rejects.toThrow('Only draft invoices can be updated');
    });

    it('should throw error when invoice not found', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        salesInvoiceService.updateInvoice('nonexistent', { otherTitle: 'Test' }, 'user123')
      ).rejects.toThrow('Invoice not found');
    });

    it('should update invoice with credit days and recalculate due date', async () => {
      const updates = {
        creditDays: 45
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          creditDays: 45,
          updatedBy: 'user123'
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
    });

    it('should update invoice with claim account', async () => {
      const updates = {
        claimAccountId: 'claim123'
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          claimAccountId: 'claim123',
          updatedBy: 'user123'
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
    });

    it('should update invoice with salesman', async () => {
      const updates = {
        salesmanId: 'salesman456'
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          salesmanId: 'salesman456',
          updatedBy: 'user123'
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
    });

    it('should update invoice with detail notes and warranty', async () => {
      const updates = {
        detailNote: 'Special handling required',
        warrantyInfo: '1 year warranty'
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          detailNote: 'Special handling required',
          warrantyInfo: '1 year warranty',
          updatedBy: 'user123'
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        otherTitle: 'Updated Title',
        memoNo: 'MEMO123',
        poReference: 'PO456',
        creditDays: 30,
        detailNote: 'Urgent delivery'
      };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          otherTitle: 'Updated Title',
          memoNo: 'MEMO123',
          poReference: 'PO456',
          creditDays: 30,
          detailNote: 'Urgent delivery',
          updatedBy: 'user123',
          updatedAt: expect.any(Date)
        }),
        { new: true, runValidators: true }
      );

      expect(result).toBeDefined();
    });

    it('should set updatedBy and updatedAt fields', async () => {
      const updates = { otherTitle: 'Test' };
      const userId = 'user123';

      await salesInvoiceService.updateInvoice('invoice123', updates, userId);

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        expect.objectContaining({
          updatedBy: userId,
          updatedAt: expect.any(Date)
        }),
        { new: true, runValidators: true }
      );
    });

    it('should return fully populated invoice after update', async () => {
      const updates = { otherTitle: 'Test' };

      const result = await salesInvoiceService.updateInvoice('invoice123', updates, 'user123');

      // Verify getInvoiceById was called twice (once for validation, once for return)
      expect(Invoice.findById).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
      expect(result.otherTitle).toBe('Updated Title');
    });
  });

  describe('deleteInvoice', () => {
    const mockDraftInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2025000001',
      status: 'draft',
      customerId: 'customer123'
    };

    beforeEach(() => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDraftInvoice)
      });

      Invoice.findByIdAndDelete = jest.fn().mockResolvedValue(mockDraftInvoice);
    });

    it('should delete draft invoice successfully', async () => {
      const result = await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      expect(Invoice.findByIdAndDelete).toHaveBeenCalledWith('invoice123');
      expect(result).toBe(true);
    });

    it('should throw error when deleting confirmed invoice', async () => {
      const confirmedInvoice = {
        ...mockDraftInvoice,
        status: 'confirmed'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(confirmedInvoice)
      });

      await expect(
        salesInvoiceService.deleteInvoice('invoice123', 'user123')
      ).rejects.toThrow('Only draft invoices can be deleted');
    });

    it('should throw error when deleting cancelled invoice', async () => {
      const cancelledInvoice = {
        ...mockDraftInvoice,
        status: 'cancelled'
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(cancelledInvoice)
      });

      await expect(
        salesInvoiceService.deleteInvoice('invoice123', 'user123')
      ).rejects.toThrow('Only draft invoices can be deleted');
    });

    it('should throw error when invoice not found', async () => {
      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        salesInvoiceService.deleteInvoice('nonexistent', 'user123')
      ).rejects.toThrow('Invoice not found');
    });

    it('should verify invoice status before deletion', async () => {
      await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      // Verify getInvoiceById was called to check status
      expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
    });

    it('should delete invoice by ID', async () => {
      const invoiceId = 'invoice123';

      await salesInvoiceService.deleteInvoice(invoiceId, 'user123');

      expect(Invoice.findByIdAndDelete).toHaveBeenCalledWith(invoiceId);
    });

    it('should return true on successful deletion', async () => {
      const result = await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      expect(result).toBe(true);
    });

    it('should handle deletion of invoice with items', async () => {
      const invoiceWithItems = {
        ...mockDraftInvoice,
        items: [
          {
            itemId: 'item123',
            boxQty: 2,
            unitQty: 5,
            totalUnitQty: 25
          },
          {
            itemId: 'item456',
            boxQty: 1,
            unitQty: 10,
            totalUnitQty: 20
          }
        ]
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(invoiceWithItems)
      });

      const result = await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      expect(Invoice.findByIdAndDelete).toHaveBeenCalledWith('invoice123');
      expect(result).toBe(true);
    });

    it('should handle deletion of invoice with totals', async () => {
      const invoiceWithTotals = {
        ...mockDraftInvoice,
        totals: {
          grossTotal: 1000,
          discountTotal: 100,
          gstTotal: 180,
          advanceTaxTotal: 5,
          netBillTotal: 1085
        }
      };

      Invoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(invoiceWithTotals)
      });

      const result = await salesInvoiceService.deleteInvoice('invoice123', 'user123');

      expect(Invoice.findByIdAndDelete).toHaveBeenCalledWith('invoice123');
      expect(result).toBe(true);
    });
  });

  describe('Status Validation', () => {
    it('should allow update only for draft status', async () => {
      const statuses = ['confirmed', 'cancelled'];

      for (const status of statuses) {
        const invoice = {
          _id: 'invoice123',
          status: status
        };

        Invoice.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(invoice)
        });

        await expect(
          salesInvoiceService.updateInvoice('invoice123', { otherTitle: 'Test' }, 'user123')
        ).rejects.toThrow('Only draft invoices can be updated');
      }
    });

    it('should allow delete only for draft status', async () => {
      const statuses = ['confirmed', 'cancelled'];

      for (const status of statuses) {
        const invoice = {
          _id: 'invoice123',
          status: status
        };

        Invoice.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(invoice)
        });

        await expect(
          salesInvoiceService.deleteInvoice('invoice123', 'user123')
        ).rejects.toThrow('Only draft invoices can be deleted');
      }
    });
  });
});
