const physicalCountService = require('../../src/services/physicalCountService');
const PhysicalCount = require('../../src/models/PhysicalCount');
const Inventory = require('../../src/models/Inventory');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const StockMovement = require('../../src/models/StockMovement');

jest.mock('../../src/models/PhysicalCount');
jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/Item');
jest.mock('../../src/models/Warehouse');
jest.mock('../../src/models/StockMovement');

describe('PhysicalCountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWarehouse = {
    _id: 'wh1',
    name: 'Main Warehouse',
    code: 'WH001'
  };

  const mockItem = {
    _id: 'item1',
    name: 'Test Medicine',
    code: 'MED001',
    unit: 'pcs'
  };

  describe('createCountSession', () => {
    it('should throw error when warehouse not found', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(null);

      await expect(
        physicalCountService.createCountSession({
          warehouseId: 'invalid',
          items: [],
          notes: 'test'
        })
      ).rejects.toThrow('Warehouse not found');
    });

    it('should throw error when item not found', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(null);

      await expect(
        physicalCountService.createCountSession({
          warehouseId: 'wh1',
          items: [{ itemId: 'invalid', physicalQuantity: 10 }],
          notes: 'test'
        })
      ).rejects.toThrow('Item not found');
    });

    it('should create count session with correct variance calculations', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });
      PhysicalCount.generateCountNumber = jest.fn().mockResolvedValue('PC-001');

      const mockCreatedCount = {
        _id: 'count1',
        countNumber: 'PC-001',
        warehouseId: 'wh1',
        items: [{
          itemId: 'item1',
          itemName: 'Test Medicine',
          itemCode: 'MED001',
          systemStock: 100,
          physicalStock: 95,
          variance: -5,
          variancePercentage: -5,
          varianceType: 'shortage'
        }],
        totals: {
          systemStock: 100,
          physicalStock: 95,
          variance: -5,
          variancePercentage: -5
        },
        status: 'pending'
      };

      PhysicalCount.create = jest.fn().mockResolvedValue(mockCreatedCount);
      PhysicalCount.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCreatedCount)
          })
        })
      });

      const result = await physicalCountService.createCountSession({
        warehouseId: 'wh1',
        items: [{ itemId: 'item1', physicalQuantity: 95 }],
        notes: 'Monthly count',
        createdBy: 'user1'
      });

      expect(PhysicalCount.create).toHaveBeenCalled();
      const createArg = PhysicalCount.create.mock.calls[0][0];
      expect(createArg.status).toBe('pending');
      expect(createArg.items[0].variance).toBe(-5);
      expect(createArg.items[0].varianceType).toBe('shortage');
    });

    it('should detect excess variance correctly', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });
      PhysicalCount.generateCountNumber = jest.fn().mockResolvedValue('PC-002');
      PhysicalCount.create = jest.fn().mockResolvedValue({ _id: 'count2' });
      PhysicalCount.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: 'count2' })
          })
        })
      });

      await physicalCountService.createCountSession({
        warehouseId: 'wh1',
        items: [{ itemId: 'item1', physicalQuantity: 110 }],
        notes: 'test',
        createdBy: 'user1'
      });

      const createArg = PhysicalCount.create.mock.calls[0][0];
      expect(createArg.items[0].variance).toBe(10);
      expect(createArg.items[0].varianceType).toBe('excess');
    });

    it('should detect match variance correctly', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });
      PhysicalCount.generateCountNumber = jest.fn().mockResolvedValue('PC-003');
      PhysicalCount.create = jest.fn().mockResolvedValue({ _id: 'count3' });
      PhysicalCount.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: 'count3' })
          })
        })
      });

      await physicalCountService.createCountSession({
        warehouseId: 'wh1',
        items: [{ itemId: 'item1', physicalQuantity: 100 }],
        notes: 'test',
        createdBy: 'user1'
      });

      const createArg = PhysicalCount.create.mock.calls[0][0];
      expect(createArg.items[0].variance).toBe(0);
      expect(createArg.items[0].varianceType).toBe('match');
    });
  });

  describe('getCountSessions', () => {
    it('should return paginated count sessions', async () => {
      const mockCounts = [
        { _id: 'count1', countNumber: 'PC-001', status: 'pending' },
        { _id: 'count2', countNumber: 'PC-002', status: 'approved' }
      ];

      PhysicalCount.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockCounts)
                  })
                })
              })
            })
          })
        })
      });
      PhysicalCount.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await physicalCountService.getCountSessions({ page: 1, limit: 50 });

      expect(result.counts).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by warehouse', async () => {
      PhysicalCount.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([])
                  })
                })
              })
            })
          })
        })
      });
      PhysicalCount.countDocuments = jest.fn().mockResolvedValue(0);

      await physicalCountService.getCountSessions({ warehouseId: 'wh1' });

      const findQuery = PhysicalCount.find.mock.calls[0][0];
      expect(findQuery.warehouseId).toBe('wh1');
    });
  });

  describe('getCountById', () => {
    it('should throw error when count not found', async () => {
      PhysicalCount.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(null)
            })
          })
        })
      });

      await expect(
        physicalCountService.getCountById('invalid')
      ).rejects.toThrow('Physical count not found');
    });
  });

  describe('updateCount', () => {
    it('should throw error when count not found', async () => {
      PhysicalCount.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        physicalCountService.updateCount('invalid', { notes: 'updated' })
      ).rejects.toThrow('Physical count not found');
    });

    it('should throw error when count is not pending', async () => {
      PhysicalCount.findOne = jest.fn().mockResolvedValue({
        _id: 'count1',
        status: 'approved'
      });

      await expect(
        physicalCountService.updateCount('count1', { notes: 'updated' })
      ).rejects.toThrow('Can only update pending counts');
    });
  });

  describe('approveCount', () => {
    it('should throw error when count not pending', async () => {
      PhysicalCount.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue({
                _id: 'count1',
                status: 'approved',
                items: []
              })
            })
          })
        })
      });

      await expect(
        physicalCountService.approveCount('count1', 'user1')
      ).rejects.toThrow('Can only approve pending counts');
    });
  });

  describe('cancelCount', () => {
    it('should throw error when count not found', async () => {
      PhysicalCount.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        physicalCountService.cancelCount('invalid', 'not needed')
      ).rejects.toThrow('Physical count not found');
    });

    it('should throw error when cancelling completed count', async () => {
      PhysicalCount.findOne = jest.fn().mockResolvedValue({
        _id: 'count1',
        status: 'completed'
      });

      await expect(
        physicalCountService.cancelCount('count1', 'not needed')
      ).rejects.toThrow('Cannot cancel completed count');
    });

    it('should cancel pending count successfully', async () => {
      const mockCount = {
        _id: 'count1',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      PhysicalCount.findOne = jest.fn()
        .mockResolvedValueOnce(mockCount)
        .mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({ ...mockCount, status: 'cancelled' })
              })
            })
          })
        });

      const result = await physicalCountService.cancelCount('count1', 'No longer needed');

      expect(mockCount.save).toHaveBeenCalled();
      expect(mockCount.status).toBe('cancelled');
      expect(mockCount.cancellationReason).toBe('No longer needed');
    });
  });

  describe('processCountAdjustments', () => {
    it('should create adjustments for items with variance', async () => {
      const mockCount = {
        _id: 'count1',
        warehouseId: { _id: 'wh1' },
        items: [
          {
            itemId: { _id: 'item1' },
            variance: -5,
            varianceType: 'shortage',
            batchNumber: 'B001'
          },
          {
            itemId: { _id: 'item2' },
            variance: 3,
            varianceType: 'excess',
            batchNumber: null
          },
          {
            itemId: { _id: 'item3' },
            variance: 0,
            varianceType: 'match',
            batchNumber: null
          }
        ],
        countNumber: 'PC-001',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockInventory = {
        quantity: 100,
        save: jest.fn().mockResolvedValue(true)
      };

      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const adjustments = await physicalCountService.processCountAdjustments(mockCount);

      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].adjustmentType).toBe('decrease');
      expect(adjustments[0].quantity).toBe(5);
      expect(adjustments[1].adjustmentType).toBe('increase');
      expect(adjustments[1].quantity).toBe(3);
      expect(mockCount.status).toBe('completed');
      expect(mockCount.save).toHaveBeenCalled();
    });

    it('should create inventory record for increase when none exists', async () => {
      const mockCount = {
        _id: 'count1',
        warehouseId: { _id: 'wh1' },
        items: [
          {
            itemId: { _id: 'item1' },
            variance: 10,
            varianceType: 'excess',
            batchNumber: null
          }
        ],
        countNumber: 'PC-001',
        save: jest.fn().mockResolvedValue(true)
      };

      Inventory.findOne = jest.fn().mockResolvedValue(null);
      Inventory.create = jest.fn().mockResolvedValue({ _id: 'inv1' });

      const adjustments = await physicalCountService.processCountAdjustments(mockCount);

      expect(Inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          warehouseId: 'wh1',
          quantity: 10,
          reservedQuantity: 0
        })
      );
    });
  });

  describe('getCountVarianceReport', () => {
    it('should return variance report for approved/completed counts', async () => {
      PhysicalCount.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              countNumber: 'PC-001',
              createdAt: new Date(),
              warehouseId: { name: 'Main' },
              totals: { systemStock: 100, physicalStock: 95, variance: -5, variancePercentage: -5 },
              items: [{ variance: -5 }],
              status: 'completed'
            }
          ])
        })
      });

      const result = await physicalCountService.getCountVarianceReport('wh1');

      expect(result).toHaveLength(1);
      expect(result[0].countNumber).toBe('PC-001');
      expect(result[0].variance).toBe(-5);
    });
  });
});
