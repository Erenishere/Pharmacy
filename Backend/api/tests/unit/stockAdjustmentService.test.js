const StockAdjustmentService = require('../../src/services/stockAdjustmentService');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');

jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/Warehouse');
jest.mock('../../src/models/Item');
jest.mock('../../src/models/User', () => ({
  findById: jest.fn()
}));

describe('StockAdjustmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWarehouse = {
    _id: 'wh1',
    code: 'WH001',
    name: 'Main Warehouse',
    isActive: true
  };

  const mockItem = {
    _id: 'item1',
    code: 'ITEM001',
    name: 'Test Medicine',
    status: 'active',
    purchasePrice: 100
  };

  const mockInventory = {
    _id: 'inv1',
    item: 'item1',
    warehouse: 'wh1',
    quantity: 100,
    availableQuantity: 80,
    reservedQuantity: 20,
    save: jest.fn().mockResolvedValue(true)
  };

  describe('_requiresApproval', () => {
    it('should require approval for theft reason', () => {
      const result = StockAdjustmentService._requiresApproval(
        { adjustmentType: 'decrease', quantity: 1, reason: 'theft' },
        100,
        10
      );
      expect(result.required).toBe(true);
      expect(result.reason).toContain('theft');
    });

    it('should require approval when quantity exceeds 50% of stock', () => {
      const result = StockAdjustmentService._requiresApproval(
        { adjustmentType: 'decrease', quantity: 60, reason: 'damage' },
        100,
        10
      );
      expect(result.required).toBe(true);
      expect(result.reason).toContain('50%');
    });

    it('should require approval when value exceeds threshold', () => {
      const result = StockAdjustmentService._requiresApproval(
        { adjustmentType: 'increase', quantity: 5, reason: 'physical_count' },
        100,
        5000
      );
      expect(result.required).toBe(true);
      expect(result.reason).toContain('threshold');
    });

    it('should not require approval for small adjustments', () => {
      const result = StockAdjustmentService._requiresApproval(
        { adjustmentType: 'increase', quantity: 5, reason: 'physical_count' },
        100,
        10
      );
      expect(result.required).toBe(false);
    });
  });

  describe('createAdjustment', () => {
    it('should throw error when required fields are missing', async () => {
      await expect(
        StockAdjustmentService.createAdjustment({})
      ).rejects.toThrow('Item, warehouse, adjustment type, quantity, reason, and notes are required');
    });

    it('should throw error for invalid adjustment type', async () => {
      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'invalid',
          quantity: 10,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Adjustment type must be either "increase" or "decrease"');
    });

    it('should throw error for quantity <= 0', async () => {
      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 0,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Adjustment quantity must be greater than 0');
    });

    it('should throw error for invalid reason', async () => {
      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'invalid_reason',
          notes: 'test notes'
        })
      ).rejects.toThrow('Reason must be one of');
    });

    it('should throw error for "other" reason with short notes', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);

      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'other',
          notes: 'short'
        })
      ).rejects.toThrow('Detailed notes (minimum 10 characters) are required');
    });

    it('should throw error when warehouse not found', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(null);

      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Warehouse not found');
    });

    it('should throw error when warehouse is inactive', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue({ ...mockWarehouse, isActive: false });

      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Warehouse is not active');
    });

    it('should throw error when item not found', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(null);

      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Item not found');
    });

    it('should throw error for decrease when insufficient stock', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue({ ...mockInventory, availableQuantity: 5 });

      await expect(
        StockAdjustmentService.createAdjustment({
          itemId: 'item1',
          warehouseId: 'wh1',
          adjustmentType: 'decrease',
          quantity: 10,
          reason: 'damage',
          notes: 'test notes'
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should create auto-approved increase adjustment successfully', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);
      StockMovement.create = jest.fn().mockResolvedValue({
        _id: 'mov1',
        movementType: 'in',
        quantity: 5,
        status: 'completed'
      });

      const result = await StockAdjustmentService.createAdjustment({
        itemId: 'item1',
        warehouseId: 'wh1',
        adjustmentType: 'increase',
        quantity: 5,
        reason: 'physical_count',
        notes: 'test notes for adjustment',
        createdBy: 'user1'
      });

      expect(result.success).toBe(true);
      expect(result.approvalStatus).toBe('auto_approved');
      expect(result.requiresApproval).toBe(false);
      expect(mockInventory.save).toHaveBeenCalled();
    });

    it('should create pending approval adjustment for theft', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);
      StockMovement.create = jest.fn().mockResolvedValue({
        _id: 'mov1',
        movementType: 'out',
        quantity: 5,
        status: 'pending'
      });

      const result = await StockAdjustmentService.createAdjustment({
        itemId: 'item1',
        warehouseId: 'wh1',
        adjustmentType: 'decrease',
        quantity: 5,
        reason: 'theft',
        notes: 'test notes for theft adjustment',
        createdBy: 'user1'
      });

      expect(result.success).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalStatus).toBe('pending_approval');
    });
  });

  describe('getCurrentStock', () => {
    it('should throw error when itemId missing', async () => {
      await expect(
        StockAdjustmentService.getCurrentStock(null, 'wh1')
      ).rejects.toThrow('Item ID and Warehouse ID are required');
    });

    it('should return zero stock when no inventory found', async () => {
      Inventory.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      const result = await StockAdjustmentService.getCurrentStock('item1', 'wh1');
      expect(result.exists).toBe(false);
      expect(result.currentStock).toBe(0);
    });

    it('should return stock info when inventory exists', async () => {
      const populatedInventory = {
        item: { _id: 'item1', code: 'ITEM001', name: 'Test', unit: 'pcs' },
        warehouse: { _id: 'wh1', code: 'WH001', name: 'Main' },
        quantity: 100,
        availableQuantity: 80,
        reservedQuantity: 20,
        lastUpdated: new Date()
      };

      Inventory.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(populatedInventory)
        })
      });

      const result = await StockAdjustmentService.getCurrentStock('item1', 'wh1');
      expect(result.exists).toBe(true);
      expect(result.currentStock).toBe(100);
      expect(result.availableStock).toBe(80);
      expect(result.reservedStock).toBe(20);
    });
  });

  describe('_getReasonLabel', () => {
    it('should return correct labels for known reasons', () => {
      expect(StockAdjustmentService._getReasonLabel('physical_count')).toBe('Physical Count Correction');
      expect(StockAdjustmentService._getReasonLabel('damage')).toBe('Damage');
      expect(StockAdjustmentService._getReasonLabel('expiry')).toBe('Expiry');
      expect(StockAdjustmentService._getReasonLabel('theft')).toBe('Theft');
      expect(StockAdjustmentService._getReasonLabel('other')).toBe('Other');
    });

    it('should return the input for unknown reasons', () => {
      expect(StockAdjustmentService._getReasonLabel('custom_reason')).toBe('custom_reason');
    });
  });

  describe('requestApproval', () => {
    it('should throw error when params missing', async () => {
      await expect(
        StockAdjustmentService.requestApproval(null, 'user1')
      ).rejects.toThrow('Adjustment ID and User ID are required');
    });

    it('should throw error when adjustment not found', async () => {
      StockMovement.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        StockAdjustmentService.requestApproval('adj1', 'user1')
      ).rejects.toThrow('Adjustment not found');
    });

    it('should throw error when already approved', async () => {
      StockMovement.findOne = jest.fn().mockResolvedValue({
        approvalStatus: 'approved'
      });

      await expect(
        StockAdjustmentService.requestApproval('adj1', 'user1')
      ).rejects.toThrow('already approved');
    });

    it('should submit approval request successfully', async () => {
      const mockMovement = {
        approvalStatus: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      StockMovement.findOne = jest.fn().mockResolvedValue(mockMovement);

      const result = await StockAdjustmentService.requestApproval('adj1', 'user1');
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending_approval');
      expect(mockMovement.save).toHaveBeenCalled();
    });
  });

  describe('rejectAdjustment', () => {
    it('should throw error when params missing', async () => {
      await expect(
        StockAdjustmentService.rejectAdjustment('adj1', 'approver1', null)
      ).rejects.toThrow('Adjustment ID, Approver ID, and Rejection reason are required');
    });

    it('should throw error when approver not a manager', async () => {
      const User = require('../../src/models/User');
      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', role: 'sales' });

      await expect(
        StockAdjustmentService.rejectAdjustment('adj1', 'user1', 'Not needed')
      ).rejects.toThrow('Only managers can reject');
    });
  });

  describe('getAdjustmentHistory', () => {
    it('should return paginated adjustment history', async () => {
      StockMovement.countDocuments = jest.fn().mockResolvedValue(2);
      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([
                    {
                      referenceId: 'adj1',
                      movementDate: new Date(),
                      itemId: { _id: 'item1', code: 'ITEM001', name: 'Test', unit: 'pcs' },
                      warehouse: { _id: 'wh1', code: 'WH001', name: 'Main' },
                      movementType: 'in',
                      quantity: 10,
                      notes: 'Damage - test notes',
                      batchInfo: null,
                      createdBy: { _id: 'user1', username: 'admin', email: 'a@b.com' },
                      status: 'completed'
                    }
                  ])
                })
              })
            })
          })
        })
      });

      const result = await StockAdjustmentService.getAdjustmentHistory({ page: 1, limit: 50 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
    });
  });
});
