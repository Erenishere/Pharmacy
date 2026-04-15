const stockValuationService = require('../../src/services/stockValuationService');
const Batch = require('../../src/models/Batch');
const Inventory = require('../../src/models/Inventory');
const Item = require('../../src/models/Item');

jest.mock('../../src/models/Batch');
jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/Item');
jest.mock('../../src/models/Warehouse', () => ({
  find: jest.fn()
}));

describe('StockValuationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBatches = [
    {
      batchNumber: 'B001',
      remainingQuantity: 50,
      unitCost: 10,
      createdAt: new Date('2025-01-01'),
      expiryDate: new Date('2026-06-01')
    },
    {
      batchNumber: 'B002',
      remainingQuantity: 30,
      unitCost: 12,
      createdAt: new Date('2025-03-01'),
      expiryDate: new Date('2026-09-01')
    },
    {
      batchNumber: 'B003',
      remainingQuantity: 20,
      unitCost: 15,
      createdAt: new Date('2025-06-01'),
      expiryDate: new Date('2026-12-01')
    }
  ];

  describe('calculateFIFO', () => {
    it('should calculate FIFO valuation correctly', async () => {
      Batch.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBatches)
        })
      });
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 70 });

      const result = await stockValuationService.calculateFIFO('item1', 'wh1');

      expect(result.method).toBe('FIFO');
      expect(result.totalQuantity).toBe(70);
      expect(result.batches[0].batchNumber).toBe('B001');
      expect(result.batches[0].quantity).toBe(50);
      expect(result.batches[0].value).toBe(500);
      expect(result.batches[1].batchNumber).toBe('B002');
      expect(result.batches[1].quantity).toBe(20);
      expect(result.batches[1].value).toBe(240);
      expect(result.totalValue).toBe(740);
    });

    it('should handle zero stock', async () => {
      Batch.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });
      Inventory.findOne = jest.fn().mockResolvedValue(null);

      const result = await stockValuationService.calculateFIFO('item1', 'wh1');

      expect(result.totalQuantity).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.averageCost).toBe(0);
    });
  });

  describe('calculateLIFO', () => {
    it('should calculate LIFO valuation correctly (newest batches first)', async () => {
      const reversedBatches = [...mockBatches].reverse();
      Batch.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(reversedBatches)
        })
      });
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 70 });

      const result = await stockValuationService.calculateLIFO('item1', 'wh1');

      expect(result.method).toBe('LIFO');
      expect(result.totalQuantity).toBe(70);
      expect(result.batches[0].batchNumber).toBe('B003');
      expect(result.batches[0].quantity).toBe(20);
      expect(result.batches[0].value).toBe(300);
      expect(result.batches[1].batchNumber).toBe('B002');
      expect(result.batches[1].quantity).toBe(30);
      expect(result.batches[1].value).toBe(360);
      expect(result.batches[2].batchNumber).toBe('B001');
      expect(result.batches[2].quantity).toBe(20);
      expect(result.batches[2].value).toBe(200);
      expect(result.totalValue).toBe(860);
    });
  });

  describe('calculateWeightedAverage', () => {
    it('should calculate weighted average correctly', async () => {
      Batch.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockBatches)
      });

      const result = await stockValuationService.calculateWeightedAverage('item1', 'wh1');

      expect(result.method).toBe('Weighted Average');
      expect(result.totalQuantity).toBe(100);
      expect(result.totalValue).toBe(50 * 10 + 30 * 12 + 20 * 15);
      expect(result.averageCost).toBeCloseTo(result.totalValue / 100);
    });

    it('should handle empty batches', async () => {
      Batch.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      const result = await stockValuationService.calculateWeightedAverage('item1', 'wh1');

      expect(result.totalQuantity).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.averageCost).toBe(0);
    });
  });

  describe('compareMethods', () => {
    it('should compare all three valuation methods', async () => {
      Batch.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBatches)
        }),
        lean: jest.fn().mockResolvedValue(mockBatches)
      });
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });

      const result = await stockValuationService.compareMethods('item1', 'wh1');

      expect(result.itemId).toBe('item1');
      expect(result.warehouseId).toBe('wh1');
      expect(result.methods.fifo).toBeDefined();
      expect(result.methods.lifo).toBeDefined();
      expect(result.methods.weightedAverage).toBeDefined();
      expect(result.analysis.highestValue).toBeGreaterThanOrEqual(result.analysis.lowestValue);
      expect(result.analysis.variance).toBe(result.analysis.highestValue - result.analysis.lowestValue);
    });
  });

  describe('getItemStock', () => {
    it('should return quantity when inventory exists', async () => {
      Inventory.findOne = jest.fn().mockResolvedValue({ quantity: 100 });

      const result = await stockValuationService.getItemStock('item1', 'wh1');
      expect(result).toBe(100);
    });

    it('should return 0 when no inventory', async () => {
      Inventory.findOne = jest.fn().mockResolvedValue(null);

      const result = await stockValuationService.getItemStock('item1', 'wh1');
      expect(result).toBe(0);
    });
  });

  describe('getWarehouseValuation', () => {
    it('should aggregate valuation for all items in warehouse', async () => {
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001', category: 'cat1' }
            }
          ])
        })
      });

      Batch.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockBatches),
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBatches)
        })
      });

      const result = await stockValuationService.getWarehouseValuation('wh1', 'weighted_average');

      expect(result.method).toBe('weighted_average');
      expect(result.warehouseId).toBe('wh1');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
