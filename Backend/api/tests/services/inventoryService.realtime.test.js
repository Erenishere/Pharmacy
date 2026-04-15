const mongoose = require('mongoose');
const inventoryService = require('../../src/services/inventoryService');
const Inventory = require('../../src/models/Inventory');
const Item = require('../../src/models/Item');

describe('InventoryService - Real-time Stock Updates (Task 2.2)', () => {
  let testItemId;
  let testWarehouseId1;
  let testWarehouseId2;

  beforeAll(async () => {
    // Create test IDs
    testItemId = new mongoose.Types.ObjectId();
    testWarehouseId1 = new mongoose.Types.ObjectId();
    testWarehouseId2 = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Clear inventory collection before each test
    await Inventory.deleteMany({});
  });

  afterAll(async () => {
    await Inventory.deleteMany({});
  });

  describe('updateStockOnSale', () => {
    it('should atomically reduce stock on sale', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 100,
        reservedQuantity: 20
      });

      // Execute: Perform sale
      const result = await inventoryService.updateStockOnSale(
        testItemId.toString(),
        testWarehouseId1.toString(),
        20,
        {
          referenceId: 'INV-001',
          userId: 'user123'
        }
      );

      // Verify: Stock reduced correctly
      expect(result.quantity).toBe(80);
      expect(result.reservedQuantity).toBe(0);
    });

    it('should throw error when insufficient stock for sale', async () => {
      // Setup: Create inventory with low stock
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 10,
        reservedQuantity: 10
      });

      // Execute & Verify: Should throw error
      await expect(
        inventoryService.updateStockOnSale(
          testItemId.toString(),
          testWarehouseId1.toString(),
          15,
          { referenceId: 'INV-002' }
        )
      ).rejects.toThrow('Insufficient stock available for sale');

      // Verify: Stock unchanged after failed sale
      const inventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      expect(inventory.quantity).toBe(10);
    });

    it('should handle batch-specific sales', async () => {
      // Setup: Create inventory with batch
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        batchNumber: 'BATCH-001',
        quantity: 50,
        reservedQuantity: 10
      });

      // Execute: Sale from specific batch
      const result = await inventoryService.updateStockOnSale(
        testItemId.toString(),
        testWarehouseId1.toString(),
        10,
        {
          batchNumber: 'BATCH-001',
          referenceId: 'INV-003'
        }
      );

      // Verify: Correct batch updated
      expect(result.batchNumber).toBe('BATCH-001');
      expect(result.quantity).toBe(40);
      expect(result.reservedQuantity).toBe(0);
    });

    it('should validate required parameters', async () => {
      await expect(
        inventoryService.updateStockOnSale(null, testWarehouseId1.toString(), 10)
      ).rejects.toThrow('Item ID is required');

      await expect(
        inventoryService.updateStockOnSale(testItemId.toString(), null, 10)
      ).rejects.toThrow('Warehouse ID is required');

      await expect(
        inventoryService.updateStockOnSale(testItemId.toString(), testWarehouseId1.toString(), 0)
      ).rejects.toThrow('Quantity must be greater than zero');
    });
  });

  describe('updateStockOnPurchase', () => {
    it('should atomically increase stock on purchase', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 50
      });

      // Execute: Perform purchase
      const result = await inventoryService.updateStockOnPurchase(
        testItemId.toString(),
        testWarehouseId1.toString(),
        30,
        {
          referenceId: 'PO-001',
          userId: 'user123'
        }
      );

      // Verify: Stock increased correctly
      expect(result.quantity).toBe(80);
    });

    it('should create new inventory record if not exists (upsert)', async () => {
      // Execute: Purchase for non-existent inventory
      const result = await inventoryService.updateStockOnPurchase(
        testItemId.toString(),
        testWarehouseId1.toString(),
        25,
        {
          referenceId: 'PO-002',
          batchNumber: 'BATCH-NEW'
        }
      );

      // Verify: New record created
      expect(result.quantity).toBe(25);
      expect(result.batchNumber).toBe('BATCH-NEW');
      expect(result.item.toString()).toBe(testItemId.toString());
      expect(result.warehouse.toString()).toBe(testWarehouseId1.toString());
    });

    it('should handle batch-specific purchases', async () => {
      // Execute: Purchase with batch number
      const result = await inventoryService.updateStockOnPurchase(
        testItemId.toString(),
        testWarehouseId1.toString(),
        100,
        {
          batchNumber: 'BATCH-2024-01',
          referenceId: 'PO-003'
        }
      );

      // Verify: Batch recorded correctly
      expect(result.batchNumber).toBe('BATCH-2024-01');
      expect(result.quantity).toBe(100);
    });
  });

  describe('updateStockOnTransfer', () => {
    it('should atomically transfer stock between warehouses', async () => {
      // Setup: Create inventory in source warehouse
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 100
      });

      // Execute: Transfer stock
      const result = await inventoryService.updateStockOnTransfer(
        testItemId.toString(),
        testWarehouseId1.toString(),
        testWarehouseId2.toString(),
        40,
        {
          referenceId: 'TRF-001',
          userId: 'user123'
        }
      );

      // Verify: Transfer successful
      expect(result.success).toBe(true);
      expect(result.fromWarehouseStock).toBe(60);
      expect(result.toWarehouseStock).toBe(40);

      // Verify: Source warehouse reduced
      const sourceInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      expect(sourceInventory.quantity).toBe(60);

      // Verify: Destination warehouse increased
      const destInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId2
      });
      expect(destInventory.quantity).toBe(40);
    });

    it('should rollback on insufficient stock in source warehouse', async () => {
      // Setup: Create inventory with low stock
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 20
      });

      // Execute & Verify: Should throw error
      await expect(
        inventoryService.updateStockOnTransfer(
          testItemId.toString(),
          testWarehouseId1.toString(),
          testWarehouseId2.toString(),
          30,
          { referenceId: 'TRF-002' }
        )
      ).rejects.toThrow('Insufficient stock in source warehouse');

      // Verify: Source warehouse unchanged
      const sourceInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      expect(sourceInventory.quantity).toBe(20);

      // Verify: Destination warehouse not created
      const destInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId2
      });
      expect(destInventory).toBeNull();
    });

    it('should prevent transfer to same warehouse', async () => {
      await expect(
        inventoryService.updateStockOnTransfer(
          testItemId.toString(),
          testWarehouseId1.toString(),
          testWarehouseId1.toString(),
          10
        )
      ).rejects.toThrow('Source and destination warehouses must be different');
    });

    it('should handle batch-specific transfers', async () => {
      // Setup: Create inventory with batch
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        batchNumber: 'BATCH-001',
        quantity: 80
      });

      // Execute: Transfer specific batch
      const result = await inventoryService.updateStockOnTransfer(
        testItemId.toString(),
        testWarehouseId1.toString(),
        testWarehouseId2.toString(),
        30,
        {
          batchNumber: 'BATCH-001',
          referenceId: 'TRF-003'
        }
      );

      // Verify: Batch transferred correctly
      expect(result.success).toBe(true);

      const destInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId2,
        batchNumber: 'BATCH-001'
      });
      expect(destInventory.quantity).toBe(30);
    });
  });

  describe('updateStockOnAdjustment', () => {
    it('should increase stock with positive adjustment', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 50
      });

      // Execute: Positive adjustment
      const result = await inventoryService.updateStockOnAdjustment(
        testItemId.toString(),
        testWarehouseId1.toString(),
        20,
        {
          reason: 'Physical count correction',
          notes: 'Found additional stock',
          userId: 'user123'
        }
      );

      // Verify: Stock increased
      expect(result.quantity).toBe(70);
    });

    it('should decrease stock with negative adjustment', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 100
      });

      // Execute: Negative adjustment
      const result = await inventoryService.updateStockOnAdjustment(
        testItemId.toString(),
        testWarehouseId1.toString(),
        -15,
        {
          reason: 'Damaged goods',
          notes: 'Items damaged during handling',
          userId: 'user123'
        }
      );

      // Verify: Stock decreased
      expect(result.quantity).toBe(85);
    });

    it('should prevent negative stock after adjustment', async () => {
      // Setup: Create inventory with low stock
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 10
      });

      // Execute & Verify: Should throw error
      await expect(
        inventoryService.updateStockOnAdjustment(
          testItemId.toString(),
          testWarehouseId1.toString(),
          -20,
          { reason: 'Test adjustment' }
        )
      ).rejects.toThrow('Adjustment would result in negative stock');

      // Verify: Stock unchanged
      const inventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      expect(inventory.quantity).toBe(10);
    });

    it('should require reason for adjustment', async () => {
      await expect(
        inventoryService.updateStockOnAdjustment(
          testItemId.toString(),
          testWarehouseId1.toString(),
          10,
          {}
        )
      ).rejects.toThrow('Reason for adjustment is required');
    });

    it('should create new inventory record if not exists', async () => {
      // Execute: Adjustment for non-existent inventory
      const result = await inventoryService.updateStockOnAdjustment(
        testItemId.toString(),
        testWarehouseId1.toString(),
        50,
        {
          reason: 'Initial stock entry',
          userId: 'user123'
        }
      );

      // Verify: New record created
      expect(result.quantity).toBe(50);
    });
  });

  describe('bulkUpdateStock', () => {
    it('should update multiple items atomically', async () => {
      const item1 = new mongoose.Types.ObjectId();
      const item2 = new mongoose.Types.ObjectId();

      // Setup: Create initial inventory for multiple items
      await Inventory.create([
        { item: item1, warehouse: testWarehouseId1, quantity: 100 },
        { item: item2, warehouse: testWarehouseId1, quantity: 50 }
      ]);

      // Execute: Bulk update
      const updates = [
        { itemId: item1.toString(), warehouseId: testWarehouseId1.toString(), quantity: -10 },
        { itemId: item2.toString(), warehouseId: testWarehouseId1.toString(), quantity: -5 }
      ];

      const results = await inventoryService.bulkUpdateStock(updates, {
        operationType: 'sale',
        referenceId: 'INV-BULK-001',
        userId: 'user123'
      });

      // Verify: All items updated
      expect(results).toHaveLength(2);
      expect(results[0].quantity).toBe(90);
      expect(results[1].quantity).toBe(45);
    });

    it('should rollback all updates if one fails', async () => {
      const item1 = new mongoose.Types.ObjectId();
      const item2 = new mongoose.Types.ObjectId();

      // Setup: Create inventory with one item having insufficient stock
      await Inventory.create([
        { item: item1, warehouse: testWarehouseId1, quantity: 100 },
        { item: item2, warehouse: testWarehouseId1, quantity: 5 }
      ]);

      // Execute: Bulk update with one item having insufficient stock
      const updates = [
        { itemId: item1.toString(), warehouseId: testWarehouseId1.toString(), quantity: -10 },
        { itemId: item2.toString(), warehouseId: testWarehouseId1.toString(), quantity: -10 }
      ];

      // Verify: Should throw error
      await expect(
        inventoryService.bulkUpdateStock(updates, {
          operationType: 'sale',
          referenceId: 'INV-BULK-002'
        })
      ).rejects.toThrow('Insufficient stock');

      // With pre-validation, no items should be updated when validation fails
      const inventory1 = await Inventory.findOne({ item: item1, warehouse: testWarehouseId1 });
      const inventory2 = await Inventory.findOne({ item: item2, warehouse: testWarehouseId1 });
      
      expect(inventory1.quantity).toBe(100);
      expect(inventory2.quantity).toBe(5);
    });

    it('should validate required parameters', async () => {
      await expect(
        inventoryService.bulkUpdateStock([], { operationType: 'sale' })
      ).rejects.toThrow('Updates array is required and must not be empty');

      await expect(
        inventoryService.bulkUpdateStock([{ itemId: testItemId.toString() }], {})
      ).rejects.toThrow('Operation type is required');
    });
  });

  describe('getRealTimeStockStatus', () => {
    it('should return real-time aggregated stock across warehouses', async () => {
      // Setup: Create inventory in multiple warehouses
      await Inventory.create([
        {
          item: testItemId,
          warehouse: testWarehouseId1,
          quantity: 100,
          reservedQuantity: 20
        },
        {
          item: testItemId,
          warehouse: testWarehouseId2,
          quantity: 50,
          reservedQuantity: 10
        }
      ]);

      // Execute: Get real-time status
      const status = await inventoryService.getRealTimeStockStatus(testItemId.toString());

      // Verify: Correct aggregation
      expect(status.totalQuantity).toBe(150);
      expect(status.totalReserved).toBe(30);
      expect(status.totalAvailable).toBe(120);
      expect(status.warehouseCount).toBe(2);
      expect(status.lastUpdated).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });

    it('should return zero values for non-existent item', async () => {
      const nonExistentItemId = new mongoose.Types.ObjectId();

      // Execute: Get status for non-existent item
      const status = await inventoryService.getRealTimeStockStatus(nonExistentItemId.toString());

      // Verify: Zero values returned
      expect(status.totalQuantity).toBe(0);
      expect(status.totalReserved).toBe(0);
      expect(status.totalAvailable).toBe(0);
      expect(status.warehouseCount).toBe(0);
      expect(status.lastUpdated).toBeNull();
    });

    it('should reflect immediate updates after stock changes', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 100,
        reservedQuantity: 0
      });

      // Get initial status
      const initialStatus = await inventoryService.getRealTimeStockStatus(testItemId.toString());
      expect(initialStatus.totalQuantity).toBe(100);

      // Perform a sale
      await inventoryService.updateStockOnSale(
        testItemId.toString(),
        testWarehouseId1.toString(),
        20,
        { referenceId: 'INV-001' }
      );

      // Get updated status
      const updatedStatus = await inventoryService.getRealTimeStockStatus(testItemId.toString());

      // Verify: Status reflects the sale
      expect(updatedStatus.totalQuantity).toBe(80);
      expect(updatedStatus.lastUpdated).not.toEqual(initialStatus.lastUpdated);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle concurrent updates correctly', async () => {
      // Setup: Create initial inventory
      await Inventory.create({
        item: testItemId,
        warehouse: testWarehouseId1,
        quantity: 100,
        reservedQuantity: 0
      });

      // Execute: Simulate concurrent sales
      const sale1 = inventoryService.updateStockOnSale(
        testItemId.toString(),
        testWarehouseId1.toString(),
        10,
        { referenceId: 'INV-001' }
      );

      const sale2 = inventoryService.updateStockOnSale(
        testItemId.toString(),
        testWarehouseId1.toString(),
        15,
        { referenceId: 'INV-002' }
      );

      // Wait for both to complete
      await Promise.all([sale1, sale2]);

      // Verify: Final stock is correct (100 - 10 - 15 = 75)
      const finalInventory = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      expect(finalInventory.quantity).toBe(75);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency across warehouse stock levels', async () => {
      // Setup: Create inventory in multiple warehouses
      await Inventory.create([
        { item: testItemId, warehouse: testWarehouseId1, quantity: 100 },
        { item: testItemId, warehouse: testWarehouseId2, quantity: 50 }
      ]);

      // Get initial total
      const initialStatus = await inventoryService.getRealTimeStockStatus(testItemId.toString());
      expect(initialStatus.totalQuantity).toBe(150);

      // Perform transfer
      await inventoryService.updateStockOnTransfer(
        testItemId.toString(),
        testWarehouseId1.toString(),
        testWarehouseId2.toString(),
        30,
        { referenceId: 'TRF-001' }
      );

      // Get updated total
      const updatedStatus = await inventoryService.getRealTimeStockStatus(testItemId.toString());

      // Verify: Total quantity unchanged (consistency maintained)
      expect(updatedStatus.totalQuantity).toBe(150);

      // Verify: Individual warehouse quantities correct
      const warehouse1 = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId1
      });
      const warehouse2 = await Inventory.findOne({
        item: testItemId,
        warehouse: testWarehouseId2
      });

      expect(warehouse1.quantity).toBe(70);
      expect(warehouse2.quantity).toBe(80);
    });
  });
});
