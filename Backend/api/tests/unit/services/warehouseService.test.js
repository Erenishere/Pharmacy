const warehouseService = require('../../../src/services/warehouseService');
const Warehouse = require('../../../src/models/Warehouse');
const Inventory = require('../../../src/models/Inventory');

// Mock the models
jest.mock('../../../src/models/Warehouse');
jest.mock('../../../src/models/Inventory');

describe('WarehouseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWarehouse', () => {
    it('should create a new warehouse successfully', async () => {
      const warehouseData = {
        name: 'Test Warehouse',
        location: {
          address: '123 Test St',
          city: 'Test City',
          country: 'Test Country'
        }
      };

      const mockWarehouse = {
        _id: 'warehouse123',
        ...warehouseData,
        code: 'WH0001',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      Warehouse.findOne = jest.fn().mockResolvedValue(null);
      Warehouse.mockImplementation(() => mockWarehouse);
      
      // Mock getWarehouseById
      Warehouse.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockWarehouse)
            })
          })
        })
      });

      const result = await warehouseService.createWarehouse(warehouseData, 'user123');

      expect(result).toBeDefined();
      expect(mockWarehouse.save).toHaveBeenCalled();
    });

    it('should throw error if warehouse name is missing', async () => {
      const warehouseData = {
        location: { address: '123 Test St' }
      };

      await expect(
        warehouseService.createWarehouse(warehouseData, 'user123')
      ).rejects.toThrow('Warehouse name is required');
    });

    it('should throw error if warehouse address is missing', async () => {
      const warehouseData = {
        name: 'Test Warehouse'
      };

      await expect(
        warehouseService.createWarehouse(warehouseData, 'user123')
      ).rejects.toThrow('Warehouse address is required');
    });

    it('should throw error if warehouse name already exists', async () => {
      const warehouseData = {
        name: 'Existing Warehouse',
        location: { address: '123 Test St' }
      };

      Warehouse.findOne = jest.fn().mockResolvedValue({ name: 'Existing Warehouse' });

      await expect(
        warehouseService.createWarehouse(warehouseData, 'user123')
      ).rejects.toThrow('Warehouse with this name already exists');
    });
  });

  describe('getWarehouses', () => {
    it('should return paginated warehouses', async () => {
      const mockWarehouses = [
        { _id: '1', name: 'Warehouse 1', isActive: true },
        { _id: '2', name: 'Warehouse 2', isActive: true }
      ];

      Warehouse.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockWarehouses)
                  })
                })
              })
            })
          })
        })
      });

      Warehouse.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await warehouseService.getWarehouses({}, { page: 1, limit: 10 });

      expect(result.warehouses).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe('getWarehouseById', () => {
    it('should return warehouse by ID', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        name: 'Test Warehouse',
        isActive: true
      };

      Warehouse.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockWarehouse)
            })
          })
        })
      });

      const result = await warehouseService.getWarehouseById('warehouse123');

      expect(result).toEqual(mockWarehouse);
    });

    it('should throw error if warehouse not found', async () => {
      Warehouse.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(null)
            })
          })
        })
      });

      await expect(
        warehouseService.getWarehouseById('nonexistent')
      ).rejects.toThrow('Warehouse not found');
    });
  });

  describe('deleteWarehouse', () => {
    it('should soft delete warehouse when no stock exists', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        name: 'Test Warehouse',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Inventory.countDocuments = jest.fn().mockResolvedValue(0);

      // Mock getWarehouseById for return value
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ ...mockWarehouse, isActive: false })
              })
            })
          })
        });

      const result = await warehouseService.deleteWarehouse('warehouse123');

      expect(mockWarehouse.save).toHaveBeenCalled();
      expect(mockWarehouse.isActive).toBe(false);
    });

    it('should throw error if warehouse has stock', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        name: 'Test Warehouse',
        isActive: true
      };

      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Inventory.countDocuments = jest.fn().mockResolvedValue(5);

      await expect(
        warehouseService.deleteWarehouse('warehouse123')
      ).rejects.toThrow('Cannot delete warehouse with existing stock');
    });
  });
});
