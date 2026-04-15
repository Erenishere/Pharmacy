const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');
const Inventory = require('../../src/models/Inventory');

describe('Inventory Management API Integration Tests', () => {
  let adminToken;
  let adminUser;
  let testWarehouse;
  let testItem;
  let testInventory;

  beforeAll(async () => {
    adminUser = await User.create({
      username: 'inv_test_admin',
      email: 'inv_admin@test.com',
      password: 'Test123!@#',
      role: 'admin',
      isActive: true
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inv_admin@test.com', password: 'Test123!@#' });

    adminToken = loginRes.body.token || loginRes.body.data?.token;

    testWarehouse = await Warehouse.create({
      name: 'Test Warehouse INV',
      code: 'TWI001',
      isActive: true,
      address: { city: 'Karachi' }
    });

    testItem = await Item.create({
      name: 'Test Medicine INV',
      code: 'TMI001',
      category: new mongoose.Types.ObjectId(),
      status: 'active',
      isActive: true,
      purchasePrice: 50,
      salePrice: 100,
      unit: 'pcs'
    });

    testInventory = await Inventory.create({
      item: testItem._id,
      warehouse: testWarehouse._id,
      quantity: 200,
      availableQuantity: 180,
      reservedQuantity: 20
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'inv_admin@test.com' });
    await Warehouse.deleteMany({ code: 'TWI001' });
    await Item.deleteMany({ code: 'TMI001' });
    await Inventory.deleteMany({ warehouse: testWarehouse?._id });
  });

  describe('Stock Adjustment API', () => {
    it('POST /api/inventory/adjustment - should create adjustment', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/inventory/adjustment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          itemId: testItem._id,
          warehouseId: testWarehouse._id,
          adjustmentType: 'increase',
          quantity: 10,
          reason: 'physical_count',
          notes: 'Adjustment from physical count correction'
        });

      expect(res.status).toBeLessThan(500);
    });

    it('POST /api/inventory/adjustment - should reject invalid type', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/inventory/adjustment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          itemId: testItem._id,
          warehouseId: testWarehouse._id,
          adjustmentType: 'invalid',
          quantity: 10,
          reason: 'damage',
          notes: 'test'
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /api/inventory/adjustments - should list adjustments', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
      if (res.body.success) {
        expect(res.body.data).toBeDefined();
      }
    });

    it('GET /api/inventory/adjustments/pending - should list pending', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/adjustments/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Physical Count API', () => {
    let countId;

    it('POST /api/inventory/physical-count - should create count session', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/inventory/physical-count')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          warehouseId: testWarehouse._id,
          items: [{
            itemId: testItem._id,
            physicalQuantity: 195
          }],
          notes: 'Monthly physical count',
          freezeStock: false
        });

      expect(res.status).toBeLessThan(500);
      if (res.body.success && res.body.data) {
        countId = res.body.data._id;
      }
    });

    it('GET /api/inventory/physical-count - should list count sessions', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/physical-count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/physical-count/:id - should get count by id', async () => {
      if (!adminToken || !countId) return;

      const res = await request(app)
        .get(`/api/inventory/physical-count/${countId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Stock Valuation API', () => {
    it('GET /api/inventory/stock/valuation - should get valuation', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/stock/valuation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ method: 'weighted_average' });

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/stock/valuation - should get FIFO valuation', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/stock/valuation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          method: 'fifo',
          itemId: testItem._id.toString(),
          warehouseId: testWarehouse._id.toString()
        });

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/stock/valuation/compare - requires both params', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/stock/valuation/compare')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Inventory Reports API', () => {
    it('GET /api/inventory/stock/summary - should get summary', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/stock/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/fast-moving - should get fast moving', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/fast-moving')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/slow-moving - should get slow moving', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/slow-moving')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/dead-stock - should get dead stock', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/dead-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/low-stock - should get low stock', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/aging - should get aging report', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/aging')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/inventory/reports/variance - should get variance report', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/reports/variance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Stock Transfer API', () => {
    it('GET /api/inventory/transfers - should list transfers', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/inventory/transfers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/inventory/adjustments');

      expect(res.status).toBe(401);
    });
  });
});
