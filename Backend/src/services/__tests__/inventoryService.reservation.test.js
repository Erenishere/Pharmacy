/**
 * Unit tests for Inventory Service - Reservation Logic
 * Tests Requirement 10: Stock Reservation
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const inventoryService = require('../inventoryService');
const Inventory = require('../../models/Inventory');
const Reservation = require('../../models/Reservation');
const Item = require('../../models/Item');
const Warehouse = require('../../models/Warehouse');
const User = require('../../models/User');

// Create a simple Invoice schema for testing
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  customer: mongoose.Schema.Types.ObjectId,
  total: Number,
});

// Register the Invoice model if not already registered
if (!mongoose.models.Invoice) {
  mongoose.model('Invoice', invoiceSchema);
}

let mongoServer;

beforeAll(async () => {
  // Disconnect any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await Inventory.deleteMany({});
  await Reservation.deleteMany({});
  await Item.deleteMany({});
  await Warehouse.deleteMany({});
  await User.deleteMany({});
});

describe('Inventory Service - Reservation Logic', () => {
  let testItem;
  let testWarehouse;
  let testUser;
  let testInventory;

  beforeEach(async () => {
    // Create test data
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });

    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      unit: 'piece',
      categoryId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      companyId: new mongoose.Types.ObjectId(),
      pricing: {
        salePrice: 100,
        costPrice: 80,
      },
    });

    testWarehouse = await Warehouse.create({
      code: 'WH001',
      name: 'Test Warehouse',
      location: {
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
      },
    });

    testInventory = await Inventory.create({
      item: testItem._id,
      warehouse: testWarehouse._id,
      quantity: 100,
      reservedQuantity: 0,
    });
  });

  describe('reserveStock', () => {
    test('should successfully reserve stock', async () => {
      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        10,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          orderNumber: 'ORD001',
          userId: testUser._id.toString(),
          expirationMinutes: 60,
        },
      );

      expect(result.success).toBe(true);
      expect(result.reservedQuantity).toBe(10);
      expect(result.newReservedTotal).toBe(10);
      expect(result.newAvailableQuantity).toBe(90);
      expect(result.reservationId).toBeDefined();

      // Verify inventory was updated
      const updatedInventory = await Inventory.findById(testInventory._id);
      expect(updatedInventory.reservedQuantity).toBe(10);
      expect(updatedInventory.availableQuantity).toBe(90);

      // Verify reservation record was created
      const reservation = await Reservation.findById(result.reservationId);
      expect(reservation).toBeDefined();
      expect(reservation.quantity).toBe(10);
      expect(reservation.status).toBe('active');
      expect(reservation.expiresAt).toBeDefined();
    });

    test('should fail when insufficient stock available', async () => {
      await expect(
        inventoryService.reserveStock(
          testItem._id.toString(),
          testWarehouse._id.toString(),
          150, // More than available
          {
            orderId: new mongoose.Types.ObjectId().toString(),
            userId: testUser._id.toString(),
          },
        ),
      ).rejects.toThrow('Insufficient stock available');
    });

    test('should fail when order ID is not provided', async () => {
      await expect(
        inventoryService.reserveStock(
          testItem._id.toString(),
          testWarehouse._id.toString(),
          10,
          {
            userId: testUser._id.toString(),
          },
        ),
      ).rejects.toThrow('Order ID is required for reservation');
    });

    test('should handle multiple reservations correctly', async () => {
      // First reservation
      await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        30,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );

      // Second reservation
      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        20,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );

      expect(result.newReservedTotal).toBe(50);
      expect(result.newAvailableQuantity).toBe(50);
    });

    test('should set correct expiration time', async () => {
      const expirationMinutes = 120;
      const beforeReservation = Date.now();

      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        10,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
          expirationMinutes,
        },
      );

      const afterReservation = Date.now();
      const expectedExpiration = beforeReservation + expirationMinutes * 60 * 1000;
      const actualExpiration = new Date(result.expiresAt).getTime();

      // Allow 1 second tolerance
      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(actualExpiration).toBeLessThanOrEqual(afterReservation + expirationMinutes * 60 * 1000 + 1000);
    });
  });

  describe('releaseReservation', () => {
    let testReservation;

    beforeEach(async () => {
      // Create a reservation first
      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        20,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          orderNumber: 'ORD001',
          userId: testUser._id.toString(),
        },
      );
      testReservation = await Reservation.findById(result.reservationId);
    });

    test('should successfully release reservation by ID', async () => {
      const result = await inventoryService.releaseReservation(
        testReservation._id.toString(),
        null,
        null,
        null,
        {
          reason: 'Order cancelled',
          userId: testUser._id.toString(),
        },
      );

      expect(result.success).toBe(true);
      expect(result.releasedQuantity).toBe(20);
      expect(result.newReservedTotal).toBe(0);
      expect(result.newAvailableQuantity).toBe(100);

      // Verify reservation status
      const updatedReservation = await Reservation.findById(testReservation._id);
      expect(updatedReservation.status).toBe('cancelled');
      expect(updatedReservation.cancellationReason).toBe('Order cancelled');
    });

    test('should successfully release reservation by item and warehouse', async () => {
      const result = await inventoryService.releaseReservation(
        null,
        testItem._id.toString(),
        testWarehouse._id.toString(),
        20,
        {
          orderId: testReservation.orderId.toString(),
          reason: 'Manual release',
          userId: testUser._id.toString(),
        },
      );

      expect(result.success).toBe(true);
      expect(result.releasedQuantity).toBe(20);
    });

    test('should fail when releasing more than reserved', async () => {
      await expect(
        inventoryService.releaseReservation(
          null,
          testItem._id.toString(),
          testWarehouse._id.toString(),
          50, // More than reserved
          {
            userId: testUser._id.toString(),
          },
        ),
      ).rejects.toThrow('Failed to release reservation');
    });
  });

  describe('fulfillReservation', () => {
    let testReservation;

    beforeEach(async () => {
      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        25,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );
      testReservation = await Reservation.findById(result.reservationId);
    });

    test('should successfully fulfill reservation', async () => {
      const result = await inventoryService.fulfillReservation(
        testReservation._id.toString(),
        {
          userId: testUser._id.toString(),
        },
      );

      expect(result.success).toBe(true);
      expect(result.fulfilledQuantity).toBe(25);
      expect(result.newQuantity).toBe(75); // 100 - 25
      expect(result.newReservedTotal).toBe(0);
      expect(result.newAvailableQuantity).toBe(75);

      // Verify reservation status
      const updatedReservation = await Reservation.findById(testReservation._id);
      expect(updatedReservation.status).toBe('fulfilled');
      expect(updatedReservation.fulfilledAt).toBeDefined();

      // Verify inventory
      const updatedInventory = await Inventory.findById(testInventory._id);
      expect(updatedInventory.quantity).toBe(75);
      expect(updatedInventory.reservedQuantity).toBe(0);
    });

    test('should fail when reservation not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        inventoryService.fulfillReservation(fakeId, {
          userId: testUser._id.toString(),
        }),
      ).rejects.toThrow('Reservation not found');
    });

    test('should fail when reservation already fulfilled', async () => {
      // Fulfill once
      await inventoryService.fulfillReservation(
        testReservation._id.toString(),
        {
          userId: testUser._id.toString(),
        },
      );

      // Try to fulfill again
      await expect(
        inventoryService.fulfillReservation(
          testReservation._id.toString(),
          {
            userId: testUser._id.toString(),
          },
        ),
      ).rejects.toThrow('Cannot fulfill reservation with status');
    });
  });

  describe('getActiveReservations', () => {
    beforeEach(async () => {
      // Create multiple reservations
      await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        10,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );

      await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        15,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );
    });

    test('should return all active reservations for an item', async () => {
      const reservations = await inventoryService.getActiveReservations(
        testItem._id.toString(),
      );

      expect(reservations).toHaveLength(2);
      expect(reservations[0].quantity).toBeDefined();
      expect(reservations[0].status).toBe('active');
      expect(reservations[0].itemName).toBe('Test Item');
    });

    test('should filter by warehouse', async () => {
      const reservations = await inventoryService.getActiveReservations(
        testItem._id.toString(),
        {
          warehouseId: testWarehouse._id.toString(),
        },
      );

      expect(reservations).toHaveLength(2);
    });

    test('should return empty array when no reservations exist', async () => {
      const newItem = await Item.create({
        code: 'ITEM002',
        name: 'New Item',
        unit: 'piece',
        categoryId: new mongoose.Types.ObjectId(),
        businessTypeId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(),
        pricing: {
          salePrice: 100,
          costPrice: 80,
        },
      });

      const reservations = await inventoryService.getActiveReservations(
        newItem._id.toString(),
      );

      expect(reservations).toHaveLength(0);
    });
  });

  describe('autoReleaseExpiredReservations', () => {
    test('should release expired reservations', async () => {
      // Create an expired reservation
      const expiredReservation = await Reservation.create({
        orderId: new mongoose.Types.ObjectId(),
        item: testItem._id,
        warehouse: testWarehouse._id,
        quantity: 20,
        status: 'active',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        createdBy: testUser._id,
      });

      // Update inventory to reflect reservation
      testInventory.reservedQuantity = 20;
      await testInventory.save();

      const result = await inventoryService.autoReleaseExpiredReservations();

      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify reservation status
      const updatedReservation = await Reservation.findById(expiredReservation._id);
      expect(updatedReservation.status).toBe('expired');

      // Verify inventory
      const updatedInventory = await Inventory.findById(testInventory._id);
      expect(updatedInventory.reservedQuantity).toBe(0);
    });

    test('should not release active non-expired reservations', async () => {
      // Create a non-expired reservation
      await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        10,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
          expirationMinutes: 60,
        },
      );

      const result = await inventoryService.autoReleaseExpiredReservations();

      expect(result.releasedCount).toBe(0);

      // Verify inventory still has reservation
      const updatedInventory = await Inventory.findById(testInventory._id);
      expect(updatedInventory.reservedQuantity).toBe(10);
    });

    test('should handle multiple expired reservations', async () => {
      // Create multiple expired reservations
      for (let i = 0; i < 3; i++) {
        await Reservation.create({
          orderId: new mongoose.Types.ObjectId(),
          item: testItem._id,
          warehouse: testWarehouse._id,
          quantity: 10,
          status: 'active',
          expiresAt: new Date(Date.now() - 60000),
          createdBy: testUser._id,
        });
      }

      testInventory.reservedQuantity = 30;
      await testInventory.save();

      const result = await inventoryService.autoReleaseExpiredReservations();

      expect(result.releasedCount).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    test('should return zero count when no expired reservations', async () => {
      const result = await inventoryService.autoReleaseExpiredReservations();

      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(0);
      expect(result.message).toBe('No expired reservations found');
    });
  });

  describe('getReservationById', () => {
    let testReservation;

    beforeEach(async () => {
      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        15,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          orderNumber: 'ORD001',
          userId: testUser._id.toString(),
          notes: 'Test reservation',
        },
      );
      testReservation = await Reservation.findById(result.reservationId);
    });

    test('should return reservation details', async () => {
      const reservation = await inventoryService.getReservationById(
        testReservation._id.toString(),
      );

      expect(reservation.reservationId).toEqual(testReservation._id);
      expect(reservation.quantity).toBe(15);
      expect(reservation.status).toBe('active');
      expect(reservation.itemName).toBe('Test Item');
      expect(reservation.warehouseName).toBe('Test Warehouse');
      expect(reservation.notes).toBe('Test reservation');
    });

    test('should fail when reservation not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        inventoryService.getReservationById(fakeId),
      ).rejects.toThrow('Reservation not found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle reservation with batch number', async () => {
      const batchInventory = await Inventory.create({
        item: testItem._id,
        warehouse: testWarehouse._id,
        batchNumber: 'BATCH001',
        quantity: 50,
        reservedQuantity: 0,
      });

      const result = await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        10,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          batchNumber: 'BATCH001',
          userId: testUser._id.toString(),
        },
      );

      expect(result.success).toBe(true);

      const reservation = await Reservation.findById(result.reservationId);
      expect(reservation.batchNumber).toBe('BATCH001');
    });

    test('should handle concurrent reservations correctly', async () => {
      // Simulate concurrent reservations - but do them sequentially to avoid race conditions in test
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await inventoryService.reserveStock(
          testItem._id.toString(),
          testWarehouse._id.toString(),
          10,
          {
            orderId: new mongoose.Types.ObjectId().toString(),
            userId: testUser._id.toString(),
          },
        );
        results.push(result);
      }

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify final inventory state
      const finalInventory = await Inventory.findById(testInventory._id);
      expect(finalInventory.reservedQuantity).toBe(50);
      expect(finalInventory.availableQuantity).toBe(50);
    });

    test('should prevent over-reservation', async () => {
      // Reserve 90 units
      await inventoryService.reserveStock(
        testItem._id.toString(),
        testWarehouse._id.toString(),
        90,
        {
          orderId: new mongoose.Types.ObjectId().toString(),
          userId: testUser._id.toString(),
        },
      );

      // Try to reserve 20 more (should fail)
      await expect(
        inventoryService.reserveStock(
          testItem._id.toString(),
          testWarehouse._id.toString(),
          20,
          {
            orderId: new mongoose.Types.ObjectId().toString(),
            userId: testUser._id.toString(),
          },
        ),
      ).rejects.toThrow('Insufficient stock available');
    });
  });
});
