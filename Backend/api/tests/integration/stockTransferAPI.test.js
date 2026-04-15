const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const User = require('../../src/models/User');

describe('Stock Transfer API Integration Tests', () => {
  let authToken;
  let testUser;
  let testItem;
  let sourceWarehouse;
  let destWarehouse;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    // Generate auth token (simplified - adjust based on your auth implementation)
    authToken = 'Bearer test-token'; // Replace with actual token generation

    // Create test warehouses
    sourceWarehouse = await Warehouse.create({
      code: 'WH-SRC',
      name: 'Source Warehouse',
      location: { city: 'Karachi', country: 'Pakistan' },
      isActive: true
    });

    destWarehouse = await Warehouse.create({
      code: 'WH-DEST',
      name: 'Destination Warehouse',
      location: { city: 'Lahore', country: 'Pakistan' },
      isActive: true
    });

    // Create test item
    testItem = await Item.create({
      code: 'TEST-001',
      name: 'Test Item',
      unit: 'Pieces',
      packingConfig: {
        cartonToBoxes: 10,
        boxToUnits: 100,
        unitName: 'Pieces'
      },
      isActive: true
    });

    // Create initial inventory in source warehouse
    await Inventory.create({
      item: testItem._id,
      warehouse: sourceWarehouse._id,
      quantity: 5000,
      reservedQuantity: 0,
      available: 5000
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Item.deleteMany({});
    await Inventory.deleteMany({});
    await StockMovement.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/v1/inventory/transfer', () => {
    it('should create a stock transfer successfully', async () => {
      const transferData = {
        transferDate: new Date(),
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destWarehouse._id.toString(),
        quantities: {
          qtyCtn: 2,
          qtyBox: 5,
          qtyUnit: 50,
          totalUnitQty: 2550
        },
        status: 'completed'
      };

      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', authToken)
        .send(transferData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transfer).toBeDefined();
      expect(response.body.data.transfer.quantity).toBe(2550);
    });

    it('should reject transfer with same source and destination', async () => {
      const transferData = {
        transferDate: new Date(),
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: sourceWarehouse._id.toString(), // Same as source
        quantities: {
          qtyCtn: 1,
          qtyBox: 0,
          qtyUnit: 0,
          totalUnitQty: 1000
        },
        status: 'completed'
      };

      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', authToken)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('different');
    });

    it('should reject transfer with insufficient stock', async () => {
      const transferData = {
        transferDate: new Date(),
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destWarehouse._id.toString(),
        quantities: {
          qtyCtn: 100, // Way more than available
          qtyBox: 0,
          qtyUnit: 0,
          totalUnitQty: 100000
        },
        status: 'completed'
      };

      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', authToken)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should create in-transit transfer', async () => {
      const transferData = {
        transferDate: new Date(),
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destWarehouse._id.toString(),
        quantities: {
          qtyCtn: 1,
          qtyBox: 0,
          qtyUnit: 0,
          totalUnitQty: 1000
        },
        status: 'in_transit'
      };

      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', authToken)
        .send(transferData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transfer.status).toBe('in_transit');
    });
  });

  describe('GET /api/v1/inventory/transfers', () => {
    it('should list all transfers', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/transfers')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter transfers by status', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/transfers?status=in_transit')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned transfers should have in_transit status
      response.body.data.forEach(transfer => {
        expect(transfer.status).toBe('in_transit');
      });
    });

    it('should paginate transfers', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/transfers?page=1&limit=10')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(10);
    });
  });

  describe('PATCH /api/v1/inventory/transfer/:id/status', () => {
    let inTransitTransferId;

    beforeAll(async () => {
      // Create an in-transit transfer for testing
      const transferData = {
        transferDate: new Date(),
        itemId: testItem._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destWarehouse._id.toString(),
        quantities: {
          qtyCtn: 0,
          qtyBox: 5,
          qtyUnit: 0,
          totalUnitQty: 500
        },
        status: 'in_transit',
        createdBy: testUser._id.toString()
      };

      const stockTransferService = require('../../src/services/stockTransferService');
      const result = await stockTransferService.createTransfer(transferData);
      inTransitTransferId = result.transferId.toString();
    });

    it('should receive in-transit transfer', async () => {
      const response = await request(app)
        .patch(`/api/v1/inventory/transfer/${inTransitTransferId}/status`)
        .set('Authorization', authToken)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject invalid status transition', async () => {
      const response = await request(app)
        .patch(`/api/v1/inventory/transfer/${inTransitTransferId}/status`)
        .set('Authorization', authToken)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
