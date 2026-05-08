const mongoose = require('mongoose');

jest.mock('../../models/Inventory', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock('../../models/Item', () => ({
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../models/StockMovement', () => ({
  create: jest.fn(),
}));

jest.mock('../eventPublisherService', () => ({
  publishStockUpdated: jest.fn(),
}));

jest.mock('../../repositories/inventoryRepository', () => ({
  getTotalStock: jest.fn(),
  getStockByLocation: jest.fn(),
  updateQuantity: jest.fn(),
  transferInventory: jest.fn(),
  findByItemAndLocation: jest.fn(),
  getLowStockItems: jest.fn(),
  getMovementHistory: jest.fn(),
  getInventoryValuation: jest.fn(),
}));

jest.mock('../itemService', () => ({
  getItemById: jest.fn(),
}));

const Inventory = require('../../models/Inventory');
const Item = require('../../models/Item');
const StockMovement = require('../../models/StockMovement');
const inventoryService = require('../inventoryService');

describe('InventoryService source-of-truth stock mutations', () => {
  const itemId = new mongoose.Types.ObjectId().toString();
  const warehouseId = new mongoose.Types.ObjectId().toString();
  const destinationWarehouseId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const referenceId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    Inventory.aggregate.mockResolvedValue([{ total: 42 }]);
    Item.findByIdAndUpdate.mockResolvedValue({});
    StockMovement.create.mockResolvedValue({});
  });

  it('records purchase stock as Inventory quantity, StockMovement audit, and derived item stock', async () => {
    const updatedInventory = {
      _id: 'inventory-1',
      item: itemId,
      warehouse: warehouseId,
      quantity: 25,
    };
    Inventory.findOneAndUpdate.mockResolvedValue(updatedInventory);

    const result = await inventoryService.updateStockOnPurchase(itemId, warehouseId, 25, {
      batchNumber: 'BATCH-PURCHASE-1',
      referenceId,
      userId,
    });

    expect(result).toBe(updatedInventory);
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.any(mongoose.Types.ObjectId),
        warehouse: expect.any(mongoose.Types.ObjectId),
        batchNumber: 'BATCH-PURCHASE-1',
      }),
      expect.objectContaining({
        $inc: { quantity: 25 },
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );
    expect(StockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      itemId,
      warehouse: warehouseId,
      movementType: 'in',
      quantity: 25,
      referenceType: 'purchase_invoice',
      referenceId,
      status: 'completed',
      createdBy: userId,
    }));
    expect(Item.findByIdAndUpdate).toHaveBeenCalledWith(itemId, {
      'inventory.currentStock': 42,
    });
  });

  it('records sales stock as Inventory decrement without touching reservations unless requested', async () => {
    Inventory.findOne.mockResolvedValue({
      _id: 'inventory-1',
      quantity: 40,
      reservedQuantity: 10,
    });
    Inventory.findOneAndUpdate.mockResolvedValue({
      _id: 'inventory-1',
      quantity: 28,
      reservedQuantity: 10,
    });

    const result = await inventoryService.updateStockOnSale(itemId, warehouseId, 12, {
      batchNumber: 'BATCH-SALE-1',
      referenceId,
      userId,
    });

    expect(result.quantity).toBe(28);
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.any(mongoose.Types.ObjectId),
        warehouse: expect.any(mongoose.Types.ObjectId),
        batchNumber: 'BATCH-SALE-1',
      }),
      expect.objectContaining({
        $inc: { quantity: -12 },
      }),
      expect.objectContaining({
        new: true,
        runValidators: true,
      }),
    );
    expect(StockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      itemId,
      warehouse: warehouseId,
      movementType: 'out',
      quantity: 12,
      referenceType: 'sales_invoice',
      referenceId,
      status: 'completed',
      createdBy: userId,
    }));
    expect(Item.findByIdAndUpdate).toHaveBeenCalledWith(itemId, {
      'inventory.currentStock': 42,
    });
  });

  it('decrements reservation and stock together when fulfilling reserved sales stock', async () => {
    Inventory.findOne.mockResolvedValue({
      _id: 'inventory-1',
      quantity: 40,
      reservedQuantity: 10,
    });
    Inventory.findOneAndUpdate.mockResolvedValue({
      _id: 'inventory-1',
      quantity: 34,
      reservedQuantity: 4,
    });

    await inventoryService.updateStockOnSale(itemId, warehouseId, 6, {
      referenceId,
      userId,
      fromReservation: true,
    });

    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $inc: {
          quantity: -6,
          reservedQuantity: -6,
        },
      }),
      expect.any(Object),
    );
  });

  it('rolls back and rejects adjustments that would make Inventory negative', async () => {
    Inventory.findOneAndUpdate.mockResolvedValue({
      _id: 'inventory-1',
      quantity: -3,
    });

    await expect(inventoryService.updateStockOnAdjustment(itemId, warehouseId, -8, {
      reason: 'physical count correction',
      referenceId,
      userId,
    })).rejects.toThrow('Adjustment would result in negative stock');

    expect(Inventory.findByIdAndUpdate).toHaveBeenCalledWith('inventory-1', {
      $inc: { quantity: 8 },
    });
    expect(StockMovement.create).not.toHaveBeenCalled();
    expect(Item.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('records transfer audit metadata against the source warehouse', async () => {
    await inventoryService.logTransaction({
      itemId,
      warehouseId,
      fromWarehouseId: warehouseId,
      toWarehouseId: destinationWarehouseId,
      referenceId,
      transactionType: 'STOCK_TRANSFER',
      quantity: 15,
      createdBy: userId,
    });

    expect(StockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      itemId,
      warehouse: warehouseId,
      movementType: 'out',
      quantity: 15,
      referenceType: 'warehouse_transfer',
      referenceId,
      transferInfo: {
        fromWarehouse: warehouseId,
        toWarehouse: destinationWarehouseId,
      },
      status: 'completed',
      createdBy: userId,
    }));
  });
});
