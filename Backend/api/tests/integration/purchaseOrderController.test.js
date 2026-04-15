const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Invoice = require('../../src/models/Invoice');

/**
 * Integration Tests for Purchase Order Controller API Endpoints
 * Task 8.1: Create purchaseOrderController.js
 * Requirements 4.1-4.18: Complete Purchase Order Management
 */
describe('Purchase Order Controller API Endpoints - Task 8.1', () => {
  let authToken;
  let adminToken;
  let testUser;
  let adminUser;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testWarehouse;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      username: 'purchaseuser_controller',
      email: 'purchase_controller@example.com',
      password: 'password123',
      role: 'store_keeper', // Using store_keeper role for purchase operations
    });

    adminUser = await User.create({
      username: 'adminuser_controller',
      email: 'admin_controller@example.com',
      password: 'password123',
      role: 'admin',
    });

    // Login to get auth tokens
    const purchaseLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'purchaseuser_controller',
        password: 'password123',
      });

    authToken = purchaseLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'adminuser_controller',
        password: 'password123',
      });

    adminToken = adminLogin.body.token;
  });

  beforeEach(async () => {
    // Clear collections
    await PurchaseOrder.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await Warehouse.deleteMany({});
    await Invoice.deleteMany({});

    // Create test data
    testSupplier = await Supplier.create({
      name: 'Test Supplier Controller',
      code: 'SUPC001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'supplier_controller@test.com',
      address: '123 Test St',
      town: 'Test Town',
      city: 'Test City',
      isActive: true,
      accountType: 'supplier',
    });

    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: {
        address: '123 Test Street',
        city: 'Test City',
        country: 'Test Country',
      },
      isActive: true,
    });

    testItem1 = await Item.create({
      name: 'Test Item 1 Controller',
      code: 'ITEMC001',
      category: 'Electronics',
      unit: 'pcs',
      boxPacking: 10,
      purchasePrice: 100,
      salePrice: 150,
      currentStock: 50,
      reorderLevel: 10,
      gstRate: 18,
    });

    testItem2 = await Item.create({
      name: 'Test Item 2 Controller',
      code: 'ITEMC002',
      category: 'Electronics',
      unit: 'pcs',
      boxPacking: 5,
      purchasePrice: 200,
      salePrice: 300,
      currentStock: 30,
      reorderLevel: 5,
      gstRate: 18,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ username: { $in: ['purchaseuser_controller', 'adminuser_controller'] } });
    await PurchaseOrder.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await Warehouse.deleteMany({});
    await Invoice.deleteMany({});
  });

  describe('POST /api/v1/purchase-orders - Create Purchase Order', () => {
    it('should create a purchase order successfully', async () => {
      const poData = {
        supplierId: testSupplier._id,
        poDate: '2024-01-15',
        billNo: 'BILL-001',
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 20,
            boxTP: 1000,
            unitTP: 100,
            discount: 5,
          },
          {
            itemId: testItem2._id,
            itemName: testItem2.name,
            boxPacking: 5,
            boxQty: 10,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 200,
            discount: 10,
          },
        ],
        notes: 'Test purchase order for controller',
      };

      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(poData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.poNumber).toBeDefined();
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.supplierName).toBe(testSupplier.name);
      expect(response.body.data.supplierTown).toBe(testSupplier.town);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/purchase-orders')
        .send({
          supplierId: testSupplier._id,
          items: [],
        })
        .expect(401);
    });

    it('should require purchase or admin role', async () => {
      const regularUser = await User.create({
        username: 'regularuser',
        email: 'regular@example.com',
        password: 'password123',
        role: 'sales',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'regularuser',
          password: 'password123',
        });

      const regularToken = loginResponse.body.token;

      await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          supplierId: testSupplier._id,
          items: [],
        })
        .expect(403);

      await User.deleteOne({ _id: regularUser._id });
    });
  });

  describe('GET /api/v1/purchase-orders - List Purchase Orders', () => {
    beforeEach(async () => {
      // Create test purchase orders
      await PurchaseOrder.create([
        {
          poNumber: 'PO-TEST-001',
          supplierId: testSupplier._id,
          supplierName: testSupplier.name,
          supplierTown: testSupplier.town,
          poDate: new Date('2024-01-15'),
          items: [
            {
              itemId: testItem1._id,
              itemName: testItem1.name,
              boxPacking: 10,
              boxQty: 5,
              unitQty: 0,
              boxTP: 1000,
              unitTP: 100,
              discount: 0,
              netAmount: 5000,
            },
          ],
          totalAmount: 5000,
          status: 'draft',
          createdBy: testUser._id,
        },
        {
          poNumber: 'PO-TEST-002',
          supplierId: testSupplier._id,
          supplierName: testSupplier.name,
          supplierTown: testSupplier.town,
          poDate: new Date('2024-01-20'),
          items: [
            {
              itemId: testItem2._id,
              itemName: testItem2.name,
              boxPacking: 5,
              boxQty: 10,
              unitQty: 0,
              boxTP: 1000,
              unitTP: 200,
              discount: 0,
              netAmount: 10000,
            },
          ],
          totalAmount: 10000,
          status: 'sent',
          createdBy: testUser._id,
        },
      ]);
    });

    it('should get all purchase orders', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders?status=sent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].poNumber).toBe('PO-TEST-002');
    });

    it('should filter by supplier', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase-orders?supplierId=${testSupplier._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/v1/purchase-orders/:id - Get Purchase Order by ID', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'draft',
        createdBy: testUser._id,
      });
    });

    it('should get purchase order by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.poNumber).toBe('PO-TEST-001');
    });

    it('should return 404 if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/purchase-orders/:id - Update Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'draft',
        createdBy: testUser._id,
      });
    });

    it('should update purchase order successfully', async () => {
      const updateData = {
        notes: 'Updated notes',
        billNo: 'BILL-UPDATED',
      };

      const response = await request(app)
        .put(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
      expect(response.body.data.billNo).toBe('BILL-UPDATED');
    });

    it('should not allow update of confirmed purchase order', async () => {
      testPO.status = 'confirmed';
      await testPO.save();

      const response = await request(app)
        .put(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update');
    });
  });

  describe('DELETE /api/v1/purchase-orders/:id - Delete Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'draft',
        createdBy: testUser._id,
      });
    });

    it('should delete purchase order as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const deletedPO = await PurchaseOrder.findById(testPO._id);
      expect(deletedPO.isDeleted).toBe(true);
    });

    it('should require admin role', async () => {
      await request(app)
        .delete(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/purchase-orders/:id/send - Send Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'draft',
        createdBy: testUser._id,
      });
    });

    it('should send purchase order successfully - Requirement 4.9', async () => {
      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent');
      expect(response.body.data.sentAt).toBeDefined();
      expect(response.body.message).toContain('sent to supplier successfully');
    });

    it('should not allow sending non-draft purchase order', async () => {
      testPO.status = 'confirmed';
      await testPO.save();

      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot send');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/send`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/purchase-orders/:id/confirm - Confirm Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'sent',
        createdBy: testUser._id,
      });
    });

    it('should confirm purchase order successfully - Requirement 4.10', async () => {
      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data.confirmedAt).toBeDefined();
      expect(response.body.message).toContain('confirmed successfully');
    });

    it('should not allow confirming already confirmed purchase order', async () => {
      testPO.status = 'confirmed';
      await testPO.save();

      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already confirmed');
    });

    it('should not allow confirming cancelled purchase order', async () => {
      testPO.status = 'cancelled';
      await testPO.save();

      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot confirm');
    });
  });

  describe('PATCH /api/v1/purchase-orders/:id/convert - Convert to Invoice', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierTown: testSupplier.town,
        items: [
          {
            itemId: testItem1._id,
            itemName: testItem1.name,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 1000,
            unitTP: 100,
            discount: 0,
            netAmount: 5000,
          },
        ],
        totalAmount: 5000,
        status: 'confirmed',
        createdBy: testUser._id,
      });
    });

    it('should convert purchase order to invoice successfully - Requirements 4.11-4.14', async () => {
      const conversionData = {
        warehouseId: testWarehouse._id,
        supplierBillNo: 'SUPPLIER-BILL-001',
        invoiceDate: '2024-01-20',
        gstRate: 18,
        notes: 'Converted from PO',
      };

      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceType).toBe('purchase');
      expect(response.body.data.poNumber).toBe(testPO.poNumber);
      expect(response.body.message).toContain('converted to invoice successfully');

      // Verify PO status updated
      const updatedPO = await PurchaseOrder.findById(testPO._id);
      expect(updatedPO.status).toBe('received');
      expect(updatedPO.convertedInvoiceId).toBeDefined();
      expect(updatedPO.convertedAt).toBeDefined();
    });

    it('should not allow converting non-confirmed purchase order', async () => {
      testPO.status = 'draft';
      await testPO.save();

      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ warehouseId: testWarehouse._id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be confirmed');
    });

    it('should not allow converting already converted purchase order', async () => {
      // First conversion
      await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ warehouseId: testWarehouse._id })
        .expect(201);

      // Try to convert again
      const response = await request(app)
        .patch(`/api/v1/purchase-orders/${testPO._id}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ warehouseId: testWarehouse._id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already been converted');
    });
  });

  describe('GET /api/v1/purchase-orders/outstanding - Get Outstanding POs', () => {
    beforeEach(async () => {
      // Create test purchase orders with different statuses
      await PurchaseOrder.create([
        {
          poNumber: 'PO-OUT-001',
          supplierId: testSupplier._id,
          supplierName: testSupplier.name,
          supplierTown: testSupplier.town,
          poDate: new Date('2024-01-15'),
          items: [
            {
              itemId: testItem1._id,
              itemName: testItem1.name,
              boxPacking: 10,
              boxQty: 5,
              unitQty: 0,
              boxTP: 1000,
              unitTP: 100,
              discount: 0,
              netAmount: 5000,
              receivedQuantity: 0,
              pendingQuantity: 50,
            },
          ],
          totalAmount: 5000,
          status: 'sent',
          fulfillmentStatus: 'pending',
          createdBy: testUser._id,
        },
        {
          poNumber: 'PO-OUT-002',
          supplierId: testSupplier._id,
          supplierName: testSupplier.name,
          supplierTown: testSupplier.town,
          poDate: new Date('2024-01-20'),
          items: [
            {
              itemId: testItem2._id,
              itemName: testItem2.name,
              boxPacking: 5,
              boxQty: 10,
              unitQty: 0,
              boxTP: 1000,
              unitTP: 200,
              discount: 0,
              netAmount: 10000,
              receivedQuantity: 25,
              pendingQuantity: 25,
            },
          ],
          totalAmount: 10000,
          status: 'confirmed',
          fulfillmentStatus: 'partial',
          createdBy: testUser._id,
        },
        {
          poNumber: 'PO-OUT-003',
          supplierId: testSupplier._id,
          supplierName: testSupplier.name,
          supplierTown: testSupplier.town,
          poDate: new Date('2024-01-25'),
          items: [
            {
              itemId: testItem1._id,
              itemName: testItem1.name,
              boxPacking: 10,
              boxQty: 5,
              unitQty: 0,
              boxTP: 1000,
              unitTP: 100,
              discount: 0,
              netAmount: 5000,
              receivedQuantity: 50,
              pendingQuantity: 0,
            },
          ],
          totalAmount: 5000,
          status: 'received',
          fulfillmentStatus: 'fulfilled',
          createdBy: testUser._id,
        },
      ]);
    });

    it('should get outstanding purchase orders - Requirement 4.18', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders/outstanding')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Only sent and confirmed with pending/partial
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalPOs).toBe(2);
      expect(response.body.summary.fullyPending).toBe(1);
      expect(response.body.summary.partiallyFulfilled).toBe(1);
    });

    it('should filter outstanding POs by supplier', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase-orders/outstanding?supplierId=${testSupplier._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(po => {
        expect(po.supplier.id.toString()).toBe(testSupplier._id.toString());
      });
    });

    it('should filter outstanding POs by date range', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders/outstanding?startDate=2024-01-18&endDate=2024-01-22')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].poNumber).toBe('PO-OUT-002');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should return 404 for non-existent purchase order', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate required fields on create', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          notes: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid ObjectId gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
