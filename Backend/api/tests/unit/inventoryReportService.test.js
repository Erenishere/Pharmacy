const inventoryReportService = require('../../src/services/inventoryReportService');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const Batch = require('../../src/models/Batch');

jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/Batch');

describe('InventoryReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockLevelReport', () => {
    it('should generate stock level report with filters', async () => {
      const mockInventory = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1', category: 'Cat1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1', code: 'WH1' },
          currentStock: 100,
          averageCost: 50,
          reorderLevel: 20,
        },
        {
          itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2', category: 'Cat2' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1', code: 'WH1' },
          currentStock: 10,
          averageCost: 30,
          reorderLevel: 15,
        },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryReportService.getStockLevelReport({ warehouseId: 'wh1' });

      expect(result.reportType).toBe('stock_level');
      expect(result.stockLevels).toHaveLength(2);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.totalValue).toBe(5300); // (100*50) + (10*30)
      expect(result.summary.lowStockItems).toBe(1);
      expect(result.summary.outOfStockItems).toBe(0);
    });

    it('should filter low stock items only', async () => {
      const mockInventory = [
        {
          itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2', category: 'Cat2' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1', code: 'WH1' },
          currentStock: 10,
          averageCost: 30,
          reorderLevel: 15,
        },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryReportService.getStockLevelReport({ lowStockOnly: true });

      expect(Inventory.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $expr: { $lte: ['$currentStock', '$reorderLevel'] },
        })
      );
    });
  });

  describe('getStockMovementReport', () => {
    it('should generate stock movement report for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockMovements = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          movementType: 'purchase',
          quantity: 100,
          movementDate: new Date('2025-01-15'),
        },
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          movementType: 'sales',
          quantity: 50,
          movementDate: new Date('2025-01-20'),
        },
      ];

      StockMovement.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovements),
      });

      const result = await inventoryReportService.getStockMovementReport(startDate, endDate);

      expect(result.reportType).toBe('stock_movement');
      expect(result.movements).toHaveLength(2);
      expect(result.summary.totalMovements).toBe(2);
      expect(result.summary.inwardMovements).toBe(1);
      expect(result.summary.outwardMovements).toBe(1);
      expect(result.summary.totalInwardQty).toBe(100);
      expect(result.summary.totalOutwardQty).toBe(50);
    });
  });

  describe('getBatchExpiryReport', () => {
    it('should generate batch expiry report', async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);

      const mockBatches = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          batchNumber: 'BATCH001',
          expiryDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
          currentQuantity: 50,
          costPrice: 100,
          status: 'active',
        },
        {
          itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          batchNumber: 'BATCH002',
          expiryDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
          currentQuantity: 100,
          costPrice: 50,
          status: 'active',
        },
      ];

      Batch.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockBatches),
      });

      const result = await inventoryReportService.getBatchExpiryReport(90);

      expect(result.reportType).toBe('batch_expiry');
      expect(result.batches).toHaveLength(2);
      expect(result.summary.totalBatches).toBe(2);
      expect(result.summary.totalValue).toBe(10000); // (50*100) + (100*50)
      expect(result.summary.expiringIn30Days).toBe(1);
    });
  });

  describe('getStockValuationReport', () => {
    it('should generate stock valuation report', async () => {
      const mockInventory = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1', category: 'Cat1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          currentStock: 100,
          averageCost: 50,
        },
        {
          itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2', category: 'Cat2' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          currentStock: 200,
          averageCost: 30,
        },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryReportService.getStockValuationReport(new Date(), 'WAC');

      expect(result.reportType).toBe('stock_valuation');
      expect(result.method).toBe('WAC');
      expect(result.valuations).toHaveLength(2);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.totalQuantity).toBe(300);
      expect(result.summary.totalValue).toBe(11000); // (100*50) + (200*30)
    });
  });

  describe('getABCAnalysisReport', () => {
    it('should classify items into ABC categories', async () => {
      const mockInventory = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
          currentStock: 100,
          averageCost: 100,
        },
        {
          itemId: { _id: 'item2', code: 'ITM002', name: 'Item 2' },
          currentStock: 50,
          averageCost: 50,
        },
        {
          itemId: { _id: 'item3', code: 'ITM003', name: 'Item 3' },
          currentStock: 10,
          averageCost: 10,
        },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInventory),
      });

      const result = await inventoryReportService.getABCAnalysisReport();

      expect(result.reportType).toBe('abc_analysis');
      expect(result.items).toHaveLength(3);
      expect(result.items[0].category).toBe('A'); // Highest value item
      expect(result.summary.totalValue).toBe(12600); // (100*100) + (50*50) + (10*10)
    });
  });

  describe('getSlowMovingItemsReport', () => {
    it('should identify slow-moving items', async () => {
      const mockInventory = [
        {
          itemId: { _id: 'item1', code: 'ITM001', name: 'Item 1' },
          warehouseId: { _id: 'wh1', name: 'Warehouse 1' },
          currentStock: 100,
          averageCost: 50,
        },
      ];

      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInventory),
      });

      StockMovement.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await inventoryReportService.getSlowMovingItemsReport(90);

      expect(result.reportType).toBe('slow_moving');
      expect(result.items).toHaveLength(1);
      expect(result.summary.totalSlowMovingItems).toBe(1);
      expect(result.summary.totalValue).toBe(5000);
    });
  });
});
