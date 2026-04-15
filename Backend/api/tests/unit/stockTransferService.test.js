const stockTransferService = require('../../src/services/stockTransferService');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');

jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/Warehouse');
jest.mock('../../src/models/Item');

describe('Stock Transfer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockItem = {
    _id: 'item123',
    code: 'ITEM001',
    name: 'Test Product',
    packingConfig: {
      cartonToBoxes: 10,
      boxToUnits: 100
    }
  };

  const mockFromWarehouse = {
    _id: 'wh1',
    code: 'WH001',
    name: 'Warehouse 1'
  };

  const mockToWarehouse = {
    _id: 'wh2',
    code: 'WH002',
    name: 'Warehouse 2'
  };

  describe('createTransfer', () => {
    test('should create transfer with simple quantity successfully', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      const destinationInventory = {
        _id: 'inv2',
        item: 'item123',
        warehouse: 'wh2',
        quantity: 50,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn()
        .mockResolvedValueOnce(sourceInventory)
        .mockResolvedValueOnce(destinationInventory);
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      const result = await stockTransferService.createTransfer({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        notes: 'Stock rebalancing',
        createdBy: 'user123'
      });

      expect(result.success).toBe(true);
      expect(result.transfer.quantity).toBe(20);
      expect(sourceInventory.quantity).toBe(80);
      expect(destinationInventory.quantity).toBe(70);
      expect(sourceInventory.save).toHaveBeenCalled();
      expect(destinationInventory.save).toHaveBeenCalled();
    });

    test('should create transfer with carton/box/unit quantities', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 5000,
        availableQuantity: 5000,
        reservedQuantity: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn()
        .mockResolvedValueOnce(sourceInventory);
      Inventory.create = jest.fn().mockResolvedValue({
        _id: 'inv2',
        quantity: 2550,
        save: jest.fn()
      });
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      // Transfer: 2 cartons + 5 boxes + 50 units
      // = (2 × 10 × 100) + (5 × 100) + 50 = 2000 + 500 + 50 = 2550 units
      const result = await stockTransferService.createTransfer({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantities: {
          qtyCtn: 2,
          qtyBox: 5,
          qtyUnit: 50
        },
        notes: 'Stock rebalancing',
        createdBy: 'user123'
      });

      expect(result.success).toBe(true);
      expect(result.transfer.quantity).toBe(2550);
      expect(sourceInventory.quantity).toBe(2450); // 5000 - 2550
    });

    test('should create transfer with batch number', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        batchNumber: 'BATCH001',
        quantity: 100,
        availableQuantity: 100,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn()
        .mockResolvedValueOnce(sourceInventory);
      Inventory.create = jest.fn().mockResolvedValue({
        _id: 'inv2',
        quantity: 20,
        save: jest.fn()
      });
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      const result = await stockTransferService.createTransfer({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        batchNumber: 'BATCH001',
        expiryDate: new Date('2025-12-31'),
        createdBy: 'user123'
      });

      expect(result.success).toBe(true);
      expect(result.transfer.batchNumber).toBe('BATCH001');
      expect(Inventory.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ batchNumber: 'BATCH001' })
      );
    });

    test('should create in-transit transfer', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 100,
        availableQuantity: 100,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn().mockResolvedValueOnce(sourceInventory);
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      const result = await stockTransferService.createTransfer({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        status: 'in_transit',
        createdBy: 'user123'
      });

      expect(result.success).toBe(true);
      expect(result.transfer.status).toBe('in_transit');
      expect(sourceInventory.quantity).toBe(80); // Deducted from source
      // Destination inventory should NOT be created for in-transit
      expect(Inventory.create).not.toHaveBeenCalled();
    });

    test('should throw error when warehouses are the same', async () => {
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn().mockResolvedValue(mockFromWarehouse);

      await expect(
        stockTransferService.createTransfer({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh1',
          quantity: 20
        })
      ).rejects.toThrow('Source and destination warehouses must be different');
    });

    test('should throw error when insufficient stock', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 10,
        availableQuantity: 10
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn().mockResolvedValueOnce(sourceInventory);

      await expect(
        stockTransferService.createTransfer({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh2',
          quantity: 20
        })
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('receiveTransfer', () => {
    test('should receive in-transit transfer successfully', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: 'wh1',
          quantity: 20,
          status: 'in_transit',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: { _id: 'wh2', name: 'Warehouse 2' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(null);
      Inventory.create = jest.fn().mockResolvedValue({
        _id: 'inv2',
        quantity: 20
      });

      const result = await stockTransferService.receiveTransfer('transfer123', 'user123');

      expect(result.success).toBe(true);
      expect(result.receivedQuantity).toBe(20);
      expect(mockMovements[0].status).toBe('completed');
      expect(mockMovements[1].status).toBe('completed');
    });

    test('should receive in-transit transfer and add to existing inventory', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: 'wh1',
          quantity: 20,
          status: 'in_transit',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: { _id: 'wh2', name: 'Warehouse 2' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      const existingInventory = {
        _id: 'inv2',
        item: 'item123',
        warehouse: 'wh2',
        quantity: 50,
        save: jest.fn().mockResolvedValue(true)
      };

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(existingInventory);

      const result = await stockTransferService.receiveTransfer('transfer123', 'user123');

      expect(result.success).toBe(true);
      expect(result.receivedQuantity).toBe(20);
      expect(existingInventory.quantity).toBe(70); // 50 + 20
      expect(existingInventory.save).toHaveBeenCalled();
    });

    test('should receive in-transit transfer with batch number', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: 'wh1',
          quantity: 20,
          status: 'in_transit',
          batchInfo: { batchNumber: 'BATCH001' },
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: { _id: 'wh2', name: 'Warehouse 2' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: { batchNumber: 'BATCH001' },
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(null);
      Inventory.create = jest.fn().mockResolvedValue({
        _id: 'inv2',
        quantity: 20,
        batchNumber: 'BATCH001'
      });

      const result = await stockTransferService.receiveTransfer('transfer123', 'user123');

      expect(result.success).toBe(true);
      expect(Inventory.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ batchNumber: 'BATCH001' })
      );
    });

    test('should throw error when transfer ID is missing', async () => {
      await expect(
        stockTransferService.receiveTransfer(null, 'user123')
      ).rejects.toThrow('Transfer ID is required');
    });

    test('should throw error when in-transit transfer not found', async () => {
      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      await expect(
        stockTransferService.receiveTransfer('transfer123', 'user123')
      ).rejects.toThrow('In-transit transfer not found');
    });

    test('should throw error when inbound movement not found', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: 'wh1',
          quantity: 20,
          status: 'in_transit',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      await expect(
        stockTransferService.receiveTransfer('transfer123', 'user123')
      ).rejects.toThrow('Inbound movement not found');
    });
  });

  describe('cancelTransfer', () => {
    test('should cancel in-transit transfer successfully', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 80,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: { _id: 'wh1', name: 'Warehouse 1' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: 'wh2',
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(sourceInventory);

      const result = await stockTransferService.cancelTransfer(
        'transfer123',
        'user123',
        'Wrong destination'
      );

      expect(result.success).toBe(true);
      expect(result.cancelledQuantity).toBe(20);
      expect(sourceInventory.quantity).toBe(100); // 80 + 20 restored
      expect(sourceInventory.save).toHaveBeenCalled();
      expect(mockMovements[0].status).toBe('cancelled');
      expect(mockMovements[1].status).toBe('cancelled');
      expect(mockMovements[0].notes).toContain('Cancelled: Wrong destination');
    });

    test('should cancel in-transit transfer with batch number', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        batchNumber: 'BATCH001',
        quantity: 80,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: { _id: 'wh1', name: 'Warehouse 1' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: { batchNumber: 'BATCH001' },
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: 'wh2',
          quantity: 20,
          status: 'in_transit',
          batchInfo: { batchNumber: 'BATCH001' },
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(sourceInventory);

      const result = await stockTransferService.cancelTransfer(
        'transfer123',
        'user123',
        'Batch issue'
      );

      expect(result.success).toBe(true);
      expect(Inventory.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ batchNumber: 'BATCH001' })
      );
      expect(sourceInventory.quantity).toBe(100);
    });

    test('should throw error when transfer ID is missing', async () => {
      await expect(
        stockTransferService.cancelTransfer(null, 'user123', 'reason')
      ).rejects.toThrow('Transfer ID is required');
    });

    test('should throw error when in-transit transfer not found', async () => {
      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      await expect(
        stockTransferService.cancelTransfer('transfer123', 'user123', 'reason')
      ).rejects.toThrow('In-transit transfer not found');
    });

    test('should throw error when outbound movement not found', async () => {
      const mockMovements = [
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: 'wh2',
          quantity: 20,
          status: 'in_transit',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      await expect(
        stockTransferService.cancelTransfer('transfer123', 'user123', 'reason')
      ).rejects.toThrow('Outbound movement not found');
    });

    test('should handle cancellation when source inventory exists', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 80,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: { _id: 'wh1', name: 'Warehouse 1' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: '',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: 'wh2',
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: '',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(sourceInventory);

      const result = await stockTransferService.cancelTransfer(
        'transfer123',
        'user123',
        'Test cancellation'
      );

      expect(result.success).toBe(true);
      expect(result.restoredToWarehouse.id).toBe('wh1');
      expect(result.reason).toBe('Test cancellation');
    });

    test('should handle cancellation when source inventory does not exist', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          movementType: 'out',
          itemId: 'item123',
          warehouse: { _id: 'wh1', name: 'Warehouse 1' },
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'mov2',
          movementType: 'in',
          itemId: 'item123',
          warehouse: 'wh2',
          quantity: 20,
          status: 'in_transit',
          batchInfo: {},
          notes: 'Stock transfer',
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMovements)
      });

      Inventory.findOne = jest.fn().mockResolvedValue(null);

      const result = await stockTransferService.cancelTransfer(
        'transfer123',
        'user123',
        'Inventory not found'
      );

      // Should still succeed even if inventory not found (graceful handling)
      expect(result.success).toBe(true);
      expect(mockMovements[0].status).toBe('cancelled');
      expect(mockMovements[1].status).toBe('cancelled');
    });
  });

  describe('listTransfers', () => {
    test('should list transfers with pagination', async () => {
      const mockTransfers = [
        {
          _id: 'mov1',
          movementDate: new Date(),
          itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
          warehouse: { _id: 'wh1', code: 'WH001', name: 'Warehouse 1' },
          transferInfo: {
            transferId: 'transfer1',
            toWarehouse: { _id: 'wh2', code: 'WH002', name: 'Warehouse 2' }
          },
          quantity: 20,
          status: 'completed',
          createdBy: { username: 'user1' },
          notes: 'Test transfer'
        }
      ];

      StockMovement.countDocuments = jest.fn().mockResolvedValue(1);
      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockTransfers)
      });

      const result = await stockTransferService.listTransfers({
        page: 1,
        limit: 50
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].item.code).toBe('ITEM001');
    });
  });

  describe('validateTransferData', () => {
    test('should validate successful transfer', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { quantity: 100, availableQuantity: 100 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalQuantity).toBe(20);
    });

    test('should detect insufficient stock', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { quantity: 10, availableQuantity: 10 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('Insufficient'))).toBe(true);
    });

    test('should detect same source and destination warehouse', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse = { _id: 'wh1', code: 'WH001', name: 'WH1' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh1',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('must be different'))).toBe(true);
    });

    test('should detect negative quantity', async () => {
      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: -10
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('cannot be negative'))).toBe(true);
    });

    test('should detect invalid quantity type', async () => {
      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 'invalid'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('must be a valid number'))).toBe(true);
    });

    test('should detect zero quantity', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      Item.findById = jest.fn().mockResolvedValue(mockItem);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 0
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('must be greater than 0'))).toBe(true);
    });

    test('should detect missing required fields', async () => {
      const result = await stockTransferService.validateTransferData({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item ID is required');
      expect(result.errors).toContain('Source warehouse ID is required');
      expect(result.errors).toContain('Destination warehouse ID is required');
    });

    test('should detect non-existent item', async () => {
      Item.findById = jest.fn().mockResolvedValue(null);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce({ _id: 'wh1', code: 'WH001', name: 'WH1' })
        .mockResolvedValueOnce({ _id: 'wh2', code: 'WH002', name: 'WH2' });

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item not found');
    });

    test('should detect non-existent warehouse', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'wh2', code: 'WH002', name: 'WH2' });

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source warehouse not found');
    });

    test('should detect inactive item', async () => {
      const mockItem = { 
        _id: 'item123', 
        code: 'ITEM001', 
        name: 'Test',
        status: 'inactive'
      };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('inactive'))).toBe(true);
    });

    test('should detect discontinued item', async () => {
      const mockItem = { 
        _id: 'item123', 
        code: 'ITEM001', 
        name: 'Test',
        isDiscontinued: true
      };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('discontinued'))).toBe(true);
    });

    test('should detect inactive warehouse', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { 
        _id: 'wh1', 
        code: 'WH001', 
        name: 'WH1',
        status: 'inactive'
      };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('inactive'))).toBe(true);
    });

    test('should detect expired batch', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const mockInventory = { 
        quantity: 100, 
        availableQuantity: 100,
        batchNumber: 'BATCH001',
        expiryDate: yesterday
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        batchNumber: 'BATCH001'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('expired'))).toBe(true);
    });

    test('should detect invalid expiry date in transfer data', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        expiryDate: yesterday
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('Expiry date must be in the future'))).toBe(true);
    });

    test('should warn about near-expiry batch', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const nearExpiry = new Date();
      nearExpiry.setDate(nearExpiry.getDate() + 15); // 15 days from now
      const mockInventory = { 
        quantity: 100, 
        availableQuantity: 100
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        expiryDate: nearExpiry
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(warn => warn.includes('expires in'))).toBe(true);
    });

    test('should warn about large stock transfer', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { 
        quantity: 100, 
        availableQuantity: 100
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 85 // 85% of stock
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(warn => warn.includes('Transferring'))).toBe(true);
    });

    test('should validate negative carton quantity', async () => {
      const mockItem = { 
        _id: 'item123', 
        code: 'ITEM001', 
        name: 'Test',
        packingConfig: {
          cartonToBoxes: 10,
          boxToUnits: 100
        }
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantities: {
          qtyCtn: -1,
          qtyBox: 0,
          qtyUnit: 0
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('Carton quantity'))).toBe(true);
    });

    test('should detect item not in source warehouse', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(null);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('not found in source warehouse'))).toBe(true);
    });

    test('should return detailed validation result', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { 
        quantity: 100, 
        availableQuantity: 100,
        reservedQuantity: 0,
        batchNumber: 'BATCH001'
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransferData({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20
      });

      expect(result.isValid).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.fromWarehouse).toBeDefined();
      expect(result.toWarehouse).toBeDefined();
      expect(result.sourceInventory).toBeDefined();
      expect(result.sourceInventory.quantity).toBe(100);
      expect(result.sourceInventory.availableQuantity).toBe(100);
    });
  });
});
