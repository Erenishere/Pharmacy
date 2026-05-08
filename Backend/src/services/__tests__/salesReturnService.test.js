const mongoose = require('mongoose');

jest.mock('../../models/Invoice', () => ({
  startSession: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../models/Customer', () => ({
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../models/Item', () => ({}));

jest.mock('../../models/StockMovement', () => ({
  create: jest.fn(),
}));

jest.mock('../../models/Inventory', () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../batchService', () => ({
  returnToBatch: jest.fn(),
}));

jest.mock('../inventoryService', () => ({
  syncItemCurrentStock: jest.fn(),
}));

jest.mock('../invoicePaymentAllocationService', () => ({
  applyReturnCreditToInvoice: jest.fn(),
}));

const Invoice = require('../../models/Invoice');
const Customer = require('../../models/Customer');
const StockMovement = require('../../models/StockMovement');
const Inventory = require('../../models/Inventory');
const batchService = require('../batchService');
const inventoryService = require('../inventoryService');
const { applyReturnCreditToInvoice } = require('../invoicePaymentAllocationService');
const salesReturnService = require('../salesReturnService');

describe('SalesReturnService stock movement contracts', () => {
  const itemId = new mongoose.Types.ObjectId();
  const warehouseId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  let session;

  beforeEach(() => {
    jest.clearAllMocks();

    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    Invoice.startSession.mockResolvedValue(session);
    Invoice.findByIdAndUpdate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    Customer.findByIdAndUpdate.mockResolvedValue({});
    StockMovement.create.mockResolvedValue([{}]);
    Inventory.findOneAndUpdate.mockResolvedValue({});
    batchService.returnToBatch.mockResolvedValue({});
    inventoryService.syncItemCurrentStock.mockResolvedValue({});
    applyReturnCreditToInvoice.mockResolvedValue({});
  });

  afterEach(() => {
    delete salesReturnService.getReturnInvoiceById.mock;
    jest.restoreAllMocks();
  });

  it('preserves batch metadata when creating return invoice items', () => {
    const originalInvoice = {
      items: [{
        itemId: {
          _id: itemId,
          packSize: 10,
        },
        itemName: 'Returnable Item',
        quantity: 20,
        warehouseId,
        batchInfo: {
          batchNumber: 'SALE-BATCH-1',
          expiryDate: new Date('2027-02-28T00:00:00.000Z'),
        },
        unitPrice: 100,
        lineTotal: 2000,
      }],
    };

    const [returnItem] = salesReturnService.processReturnItems(originalInvoice, [{
      itemId,
      returnQuantity: 5,
    }]);

    expect(returnItem.quantity).toBe(-5);
    expect(returnItem.batchInfo).toEqual({
      batchNumber: 'SALE-BATCH-1',
      expiryDate: new Date('2027-02-28T00:00:00.000Z'),
    });
  });

  it('processes sales return stock as a schema-valid inbound warehouse movement', async () => {
    const returnInvoiceId = new mongoose.Types.ObjectId();
    const returnInvoice = {
      _id: returnInvoiceId,
      invoiceNumber: 'SRI2026000001',
      invoiceDate: new Date('2026-05-05T10:00:00.000Z'),
      customerId,
      originalInvoiceId: new mongoose.Types.ObjectId(),
      status: 'draft',
      totals: {
        netBillTotal: -500,
      },
      items: [{
        itemId,
        quantity: -5,
        warehouseId,
        batchInfo: {
          batchNumber: 'SALE-BATCH-1',
          expiryDate: new Date('2027-02-28T00:00:00.000Z'),
        },
      }],
    };

    const processedInvoice = {
      _id: returnInvoiceId,
      status: 'confirmed',
    };

    jest.spyOn(salesReturnService, 'getReturnInvoiceById')
      .mockResolvedValueOnce(returnInvoice)
      .mockResolvedValueOnce(processedInvoice);
    jest.spyOn(salesReturnService, 'createReverseLedgerEntries').mockResolvedValue();

    const result = await salesReturnService.processReturn(returnInvoiceId, userId);

    expect(result).toBe(processedInvoice);
    expect(StockMovement.create).toHaveBeenCalledWith([expect.objectContaining({
      itemId,
      warehouse: warehouseId,
      movementType: 'in',
      quantity: 5,
      referenceType: 'sales_return',
      referenceId: returnInvoiceId,
      batchInfo: {
        batchNumber: 'SALE-BATCH-1',
        expiryDate: new Date('2027-02-28T00:00:00.000Z'),
      },
      createdBy: userId,
    })], { session });
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      { item: itemId, warehouse: warehouseId },
      {
        $inc: {
          quantity: 5,
          available: 5,
        },
      },
      { session, upsert: true, setDefaultsOnInsert: true },
    );
    expect(batchService.returnToBatch).toHaveBeenCalledWith('SALE-BATCH-1', 5, { session });
    expect(applyReturnCreditToInvoice).toHaveBeenCalledWith(returnInvoice, { session });
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(inventoryService.syncItemCurrentStock).toHaveBeenCalledWith(itemId.toString());
  });
});
