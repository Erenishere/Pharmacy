const mongoose = require('mongoose');
const stockTransferService = require('../../src/services/stockTransferService');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');

/**
 * Integration Tests for In-Transit Status Handling
 * Tests the complete workflow of creating, receiving, and cancelling in-transit transfers
 * 
 * Requirements tested:
 * - Requirement 3.12: Support "In Transit" status
 * - Requirement 3.13: When transfer is in transit, stock not shown in either warehouse
 * - Requirement 3.14: When transfer is received, add to destination warehouse
 */
describe('Stock Transfer In-Transit Integration Tests', () => {
  let sourceWarehouse;
  let destinationWarehouse;
  let testItem;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/erp_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  beforeEach(async () => {
    // Clear collections
    await Inventory.deleteMany({});
    await StockMovement.deleteMany({});
    await Warehouse.deleteMany({});
    await Item.deleteMany({});

    // Create test data
    sourceWarehouse = await Warehouse.create({
      code: 'WH001',
      name: 'Main Warehouse',
      status: 'active'
    });

    destinationWarehouse = await Warehouse.create({
      code: 'WH002',
      name: 'Branch Warehouse',
      status: 'active'
    });

    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Product',
      unit: 'PCS',
      packingConfig: {
        cartonToBoxes: 10,
        boxToUnits: 100
      },
      status: 'active'
    });

    // Create initial inventory in source warehouse
    await Inventory.create({
      item: testItem._id,
      warehouse: sourceWarehouse._id,
      quantity: 1000,
      reservedQuantity: 0,
      available: 1000
    });

    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Complete In-Transit Workflow', () => {
    test('should create in-transit transfer, receive it, and update inventory correctly', async () => {
      // Step 1: Create in-transit transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        notes: 'Transfer to branch',
        createdBy: userId.toString()
      });

      expect(transferResult.success).toBe(true);
      expect(transferResult.transfer.status).toBe('in_transit');

      // Verify source inventory was deducted
      const sourceInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventory.quantity).toBe(900); // 1000 - 100

      // Verify destination inventory was NOT created yet (in-transit)
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory).toBeNull();

      // Verify stock movements were created with in_transit status
      const movements = await StockMovement.find({
        'transferInfo.transferId': transferResult.transferId
      });
      expect(movements).toHaveLength(2);
      expect(movements.every(m => m.status === 'in_transit')).toBe(true);

      // Step 2: Receive the transfer
      const receiveResult = await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      expect(receiveResult.success).toBe(true);
      expect(receiveResult.receivedQuantity).toBe(100);

      // Verify destination inventory was created
      const destInventoryAfterReceive = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventoryAfterReceive).not.toBeNull();
      expect(destInventoryAfterReceive.quantity).toBe(100);

      // Verify source inventory remains unchanged
      const sourceInventoryAfterReceive = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventoryAfterReceive.quantity).toBe(900);

      // Verify movements were updated to completed
      const movementsAfterReceive = await StockMovement.find({
        'transferInfo.transferId': transferResult.transferId
      });
      expect(movementsAfterReceive.every(m => m.status === 'completed')).toBe(true);
    });

    test('should create in-transit transfer, cancel it, and restore inventory correctly', async () => {
      // Step 1: Create in-transit transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        notes: 'Transfer to branch',
        createdBy: userId.toString()
      });

      expect(transferResult.success).toBe(true);

      // Verify source inventory was deducted
      const sourceInventoryBefore = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventoryBefore.quantity).toBe(900);

      // Step 2: Cancel the transfer
      const cancelResult = await stockTransferService.cancelTransfer(
        transferResult.transferId.toString(),
        userId.toString(),
        'Wrong destination warehouse'
      );

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.cancelledQuantity).toBe(100);

      // Verify source inventory was restored
      const sourceInventoryAfter = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventoryAfter.quantity).toBe(1000); // Restored to original

      // Verify destination inventory was NOT created
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory).toBeNull();

      // Verify movements were updated to cancelled
      const movements = await StockMovement.find({
        'transferInfo.transferId': transferResult.transferId
      });
      expect(movements.every(m => m.status === 'cancelled')).toBe(true);
      expect(movements.some(m => m.notes.includes('Cancelled'))).toBe(true);
    });

    test('should handle in-transit transfer with batch number', async () => {
      const batchNumber = 'BATCH001';
      const expiryDate = new Date('2025-12-31');

      // Create inventory with batch
      await Inventory.deleteMany({});
      await Inventory.create({
        item: testItem._id,
        warehouse: sourceWarehouse._id,
        batchNumber: batchNumber,
        quantity: 500,
        reservedQuantity: 0,
        available: 500
      });

      // Create in-transit transfer with batch
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 50,
        batchNumber: batchNumber,
        expiryDate: expiryDate,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      expect(transferResult.success).toBe(true);
      expect(transferResult.transfer.batchNumber).toBe(batchNumber);

      // Receive the transfer
      const receiveResult = await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      expect(receiveResult.success).toBe(true);

      // Verify destination inventory has correct batch
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id,
        batchNumber: batchNumber
      });
      expect(destInventory).not.toBeNull();
      expect(destInventory.quantity).toBe(50);
      expect(destInventory.batchNumber).toBe(batchNumber);
    });

    test('should handle multiple in-transit transfers for same item', async () => {
      // Create first in-transit transfer
      const transfer1 = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      // Create second in-transit transfer
      const transfer2 = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 150,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      // Verify source inventory was deducted for both
      const sourceInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventory.quantity).toBe(750); // 1000 - 100 - 150

      // Receive first transfer
      await stockTransferService.receiveTransfer(
        transfer1.transferId.toString(),
        userId.toString()
      );

      // Verify destination has first transfer quantity
      let destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(100);

      // Receive second transfer
      await stockTransferService.receiveTransfer(
        transfer2.transferId.toString(),
        userId.toString()
      );

      // Verify destination has both transfer quantities
      destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(250); // 100 + 150
    });

    test('should handle receiving transfer to warehouse with existing inventory', async () => {
      // Create initial inventory in destination warehouse
      await Inventory.create({
        item: testItem._id,
        warehouse: destinationWarehouse._id,
        quantity: 200,
        reservedQuantity: 0,
        available: 200
      });

      // Create and receive in-transit transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      // Verify destination inventory was updated correctly
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(300); // 200 + 100
    });

    test('should handle cancelling one of multiple in-transit transfers', async () => {
      // Create two in-transit transfers
      const transfer1 = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      const transfer2 = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 150,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      // Cancel first transfer
      await stockTransferService.cancelTransfer(
        transfer1.transferId.toString(),
        userId.toString(),
        'Cancelled by user'
      );

      // Verify source inventory restored only first transfer
      let sourceInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventory.quantity).toBe(850); // 1000 - 150 (only second transfer)

      // Receive second transfer
      await stockTransferService.receiveTransfer(
        transfer2.transferId.toString(),
        userId.toString()
      );

      // Verify destination has only second transfer
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(150);

      // Verify final source inventory
      sourceInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventory.quantity).toBe(850);
    });

    test('should not allow receiving already completed transfer', async () => {
      // Create and receive transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      // Try to receive again
      await expect(
        stockTransferService.receiveTransfer(
          transferResult.transferId.toString(),
          userId.toString()
        )
      ).rejects.toThrow('In-transit transfer not found');
    });

    test('should not allow cancelling already completed transfer', async () => {
      // Create and receive transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      // Try to cancel completed transfer
      await expect(
        stockTransferService.cancelTransfer(
          transferResult.transferId.toString(),
          userId.toString(),
          'Should not work'
        )
      ).rejects.toThrow('In-transit transfer not found');
    });

    test('should handle in-transit transfer with carton/box/unit quantities', async () => {
      // Transfer: 2 cartons + 5 boxes + 50 units = 2550 units
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantities: {
          qtyCtn: 2,
          qtyBox: 5,
          qtyUnit: 50
        },
        status: 'in_transit',
        createdBy: userId.toString()
      });

      expect(transferResult.success).toBe(true);
      expect(transferResult.transfer.quantity).toBe(2550);

      // Receive transfer
      await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      // Verify correct quantity in destination
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(2550);
    });
  });

  describe('In-Transit Status Validation', () => {
    test('should prevent creating in-transit transfer with insufficient stock', async () => {
      await expect(
        stockTransferService.createTransfer({
          itemId: testItem._id.toString(),
          fromWarehouseId: sourceWarehouse._id.toString(),
          toWarehouseId: destinationWarehouse._id.toString(),
          quantity: 2000, // More than available (1000)
          status: 'in_transit',
          createdBy: userId.toString()
        })
      ).rejects.toThrow('Insufficient stock');
    });

    test('should list in-transit transfers correctly', async () => {
      // Create multiple transfers with different statuses
      const inTransitTransfer = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      const completedTransfer = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 50,
        status: 'completed',
        createdBy: userId.toString()
      });

      // List only in-transit transfers
      const inTransitList = await stockTransferService.listTransfers({
        status: 'in_transit'
      });

      expect(inTransitList.success).toBe(true);
      expect(inTransitList.data).toHaveLength(1);
      expect(inTransitList.data[0].status).toBe('in_transit');

      // List all transfers
      const allTransfers = await stockTransferService.listTransfers({});
      expect(allTransfers.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should track transfer history correctly', async () => {
      // Create and complete a transfer
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      // Get transfer history
      const history = await stockTransferService.getTransferHistory(
        testItem._id.toString()
      );

      expect(history).toHaveLength(2); // One out, one in
      expect(history.some(h => h.movementType === 'out')).toBe(true);
      expect(history.some(h => h.movementType === 'in')).toBe(true);
      expect(history.every(h => h.status === 'completed')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle receiving transfer when source inventory was deleted', async () => {
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      // Delete source inventory (edge case)
      await Inventory.deleteOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });

      // Should still be able to receive
      const receiveResult = await stockTransferService.receiveTransfer(
        transferResult.transferId.toString(),
        userId.toString()
      );

      expect(receiveResult.success).toBe(true);

      // Verify destination inventory was created
      const destInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: destinationWarehouse._id
      });
      expect(destInventory.quantity).toBe(100);
    });

    test('should handle cancelling transfer when source inventory was deleted', async () => {
      const transferResult = await stockTransferService.createTransfer({
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 100,
        status: 'in_transit',
        createdBy: userId.toString()
      });

      // Delete source inventory
      await Inventory.deleteOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });

      // Should still be able to cancel (gracefully)
      const cancelResult = await stockTransferService.cancelTransfer(
        transferResult.transferId.toString(),
        userId.toString(),
        'Test cancellation'
      );

      expect(cancelResult.success).toBe(true);
    });

    test('should handle concurrent in-transit transfers', async () => {
      // Create multiple transfers concurrently
      const transfers = await Promise.all([
        stockTransferService.createTransfer({
          itemId: testItem._id.toString(),
          fromWarehouseId: sourceWarehouse._id.toString(),
          toWarehouseId: destinationWarehouse._id.toString(),
          quantity: 100,
          status: 'in_transit',
          createdBy: userId.toString()
        }),
        stockTransferService.createTransfer({
          itemId: testItem._id.toString(),
          fromWarehouseId: sourceWarehouse._id.toString(),
          toWarehouseId: destinationWarehouse._id.toString(),
          quantity: 150,
          status: 'in_transit',
          createdBy: userId.toString()
        }),
        stockTransferService.createTransfer({
          itemId: testItem._id.toString(),
          fromWarehouseId: sourceWarehouse._id.toString(),
          toWarehouseId: destinationWarehouse._id.toString(),
          quantity: 200,
          status: 'in_transit',
          createdBy: userId.toString()
        })
      ]);

      expect(transfers).toHaveLength(3);
      expect(transfers.every(t => t.success)).toBe(true);

      // Verify source inventory
      const sourceInventory = await Inventory.findOne({
        item: testItem._id,
        warehouse: sourceWarehouse._id
      });
      expect(sourceInventory.quantity).toBe(550); // 1000 - 100 - 150 - 200
    });
  });
});
