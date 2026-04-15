const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');

/**
 * Sales Invoice Return API Integration Tests
 * 
 * Tests the POST /api/v1/invoices/sales/:id/return endpoint
 * Validates sales return creation, stock reversal, and ledger entries
 * 
 * Requirements: 2.1-2.10 (Sales Return Processing)
 */
describe('Sales Invoice Return API Integration Tests', () => {
  let authToken;
  let testUser;
  let testCustomer;
  let testItem1;
  let testItem2;
  let testWarehouse;
  let confirmedInvoice;

  beforeAll(async () => {
    // Create test user with appropriate role
    testUser = await User.create({
      username: 'testreturnuser',
      email: 'testreturn@example.com',
      password: 'Test@1234',
      role: 'salesman', // Fixed: use valid role from User model
      isActive: true,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testreturn@example.com',
        password: 'Test@1234',
      });

    authToken = loginResponse.body.data.token;

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Test Return Warehouse',
      code: 'WH-RET-001',
      location: {
        address: '123 Return St',
        city: 'Test City',
        state: 'Test State',
        country: 'Pakistan',
        postalCode: '12345',
      },
      isActive: true,
      createdBy: testUser._id,
    });

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST-RET-001',
      name: 'Test Return Customer',
      type: 'customer',
      contactInfo: {
        phone: '1234567890',
        email: 'returnCustomer@test.com',
        address: '123 Test St',
        city: 'Test City',
        country: 'Pakistan',
      },
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30,
        currency: 'PKR',
      },
      currentBalance: 0,
      isActive: true,
      createdBy: testUser._id,
    });

    // Create test items
    testItem1 = await Item.create({
      code: 'ITEM-RET-001',
      name: 'Test Return Item 1',
      description: 'Test item for return',
      category: 'Test Category',
      unit: 'piece',
      packing: 10,
      pricing: {
        costPrice: 100,
        salePrice: 150,
        currency: 'PKR',
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard',
      },
      inventory: {
        currentStock: 1000,
        minimumStock: 10,
        maximumStock: 5000,
      },
      isActive: true,
      createdBy: testUser._id,
    });

    testItem2 = await Item.create({
      code: 'ITEM-RET-002',
      name: 'Test Return Item 2',
      description: 'Test item 2 for return',
      category: 'Test Category',
      unit: 'piece',
      packing: 20,
      pricing: {
        costPrice: 200,
        salePrice: 250,
        currency: 'PKR',
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard',
      },
      inventory: {
        currentStock: 500,
        minimumStock: 10,
        maximumStock: 2000,
      },
      isActive: true,
      createdBy: testUser._id,
    });

    // Create inventory records
    await Inventory.create([
      {
        item: testItem1._id,
        warehouse: testWarehouse._id,
        quantity: 1000,
      },
      {
        item: testItem2._id,
        warehouse: testWarehouse._id,
        quantity: 500,
      },
    ]);

    // Create and confirm a test invoice
    const invoiceData = {
      customerId: testCustomer._id.toString(),
      invoiceDate: new Date().toISOString(),
      items: [
        {
          itemId: testItem1._id.toString(),
          warehouseId: testWarehouse._id.toString(),
          quantity: 50,
          unitPrice: 150,
          discount: 5,
        },
        {
          itemId: testItem2._id.toString(),
          warehouseId: testWarehouse._id.toString(),
          quantity: 30,
          unitPrice: 250,
          discount: 0,
        },
      ],
      notes: 'Test invoice for return',
    };

    const createResponse = await request(app)
      .post('/api/v1/invoices/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invoiceData);

    const invoiceId = createResponse.body.data._id;

    // Confirm the invoice
    const confirmResponse = await request(app)
      .patch(`/api/v1/invoices/sales/${invoiceId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`);

    confirmedInvoice = confirmResponse.body.data;
  });

  afterAll(async () => {
    // Clean up test data
    await Invoice.deleteMany({ createdBy: testUser._id });
    await Customer.deleteOne({ _id: testCustomer._id });
    await Item.deleteMany({ _id: { $in: [testItem1._id, testItem2._id] } });
    await Warehouse.deleteOne({ _id: testWarehouse._id });
    await Inventory.deleteMany({ warehouse: testWarehouse._id });
    await StockMovement.deleteMany({ createdBy: testUser._id });
    await LedgerEntry.deleteMany({ createdBy: testUser._id });
    await User.deleteOne({ _id: testUser._id });
  });

  describe('POST /api/v1/invoices/sales/:id/return', () => {
    it('should create a sales return for partial quantity', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 20,
          },
        ],
        returnReason: 'damaged',
        returnNotes: 'Items damaged during transport',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data.salesType).toBe('return');
      expect(response.body.data.type).toBe('sales');
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(-20); // Negative for return
      expect(response.body.data.returnReason).toBe('damaged');
      expect(response.body.data.returnNotes).toBe('Items damaged during transport');
      expect(response.body.data.originalInvoiceId).toBe(confirmedInvoice._id);
    });

    it('should create a sales return for multiple items', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 10,
          },
          {
            itemId: testItem2._id.toString(),
            returnQuantity: 15,
          },
        ],
        returnReason: 'customer_request',
        returnNotes: 'Customer requested return',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.salesType).toBe('return');
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].quantity).toBe(-10);
      expect(response.body.data.items[1].quantity).toBe(-15);
    });

    it('should restore stock to warehouse after return', async () => {
      // Get initial inventory
      const inventoryBefore = await Inventory.findOne({
        item: testItem1._id,
        warehouse: testWarehouse._id,
      });

      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
        returnReason: 'quality_issue',
      };

      await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      // Get inventory after return
      const inventoryAfter = await Inventory.findOne({
        item: testItem1._id,
        warehouse: testWarehouse._id,
      });

      // Stock should be restored
      expect(inventoryAfter.quantity).toBe(inventoryBefore.quantity + 5);
    });

    it('should create reverse stock movements', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 8,
          },
        ],
        returnReason: 'expired',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      const returnInvoiceId = response.body.data._id;

      // Check stock movements
      const stockMovements = await StockMovement.find({
        referenceId: returnInvoiceId,
        referenceType: 'sales_invoice',
      });

      expect(stockMovements.length).toBeGreaterThan(0);
      expect(stockMovements[0].movementType).toBe('in'); // Return is 'in' movement
      expect(stockMovements[0].itemId.toString()).toBe(testItem1._id.toString());
    });

    it('should reduce customer balance after return', async () => {
      // Get customer balance before return
      const customerBefore = await Customer.findById(testCustomer._id);
      const balanceBefore = customerBefore.currentBalance;

      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 10,
          },
        ],
        returnReason: 'wrong_item',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      // Get customer balance after return
      const customerAfter = await Customer.findById(testCustomer._id);

      // Balance should be reduced by return amount
      expect(customerAfter.currentBalance).toBeLessThan(balanceBefore);
    });

    it('should create reverse ledger entries', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
        returnReason: 'other',
        returnNotes: 'Test reverse ledger entries',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      const returnInvoiceId = response.body.data._id;

      // Check ledger entries
      const ledgerEntries = await LedgerEntry.find({
        referenceId: returnInvoiceId,
        referenceType: 'sales_invoice',
      });

      expect(ledgerEntries.length).toBeGreaterThan(0);
      
      // Should have credit entry for customer (reducing their debt)
      const customerEntry = ledgerEntries.find(
        (entry) => entry.accountId.toString() === testCustomer._id.toString()
      );
      expect(customerEntry).toBeDefined();
      expect(customerEntry.entryType).toBe('credit');
    });

    it('should fail to create return without authentication', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
      };

      await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .send(returnData)
        .expect(401);
    });

    it('should fail to create return without return items', async () => {
      const returnData = {
        returnItems: [],
        returnReason: 'damaged',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create return with invalid item ID', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: 'invalid-id',
            returnQuantity: 5,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create return with zero quantity', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 0,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create return with negative quantity', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: -5,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create return for quantity exceeding original invoice', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 1000, // More than original quantity
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('exceeds');
    });

    it('should fail to create return for non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
      };

      await request(app)
        .post(`/api/v1/invoices/sales/${fakeId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(404);
    });

    it('should fail to create return for draft invoice', async () => {
      // Create a draft invoice
      const draftInvoiceData = {
        customerId: testCustomer._id.toString(),
        items: [
          {
            itemId: testItem1._id.toString(),
            warehouseId: testWarehouse._id.toString(),
            quantity: 10,
            unitPrice: 150,
          },
        ],
      };

      const draftResponse = await request(app)
        .post('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draftInvoiceData);

      const draftInvoiceId = draftResponse.body.data._id;

      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${draftInvoiceId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('confirmed');
    });

    it('should handle return with batch number', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
            batchNumber: 'BATCH001',
          },
        ],
        returnReason: 'expired',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].batchNumber).toBe('BATCH001');
    });

    it('should validate return reason enum values', async () => {
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
        returnReason: 'invalid_reason',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle return notes exceeding max length', async () => {
      const longNotes = 'a'.repeat(501); // Exceeds 500 character limit
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 5,
          },
        ],
        returnNotes: longNotes,
      };

      const response = await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Return Invoice Visibility in List', () => {
    it('should visually distinguish returns in invoice list', async () => {
      // Create a return
      const returnData = {
        returnItems: [
          {
            itemId: testItem1._id.toString(),
            returnQuantity: 3,
          },
        ],
        returnReason: 'damaged',
      };

      await request(app)
        .post(`/api/v1/invoices/sales/${confirmedInvoice._id}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData);

      // Get invoice list
      const listResponse = await request(app)
        .get('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Find return invoice in list
      const returnInvoice = listResponse.body.data.find(
        (inv) => inv.salesType === 'return'
      );

      expect(returnInvoice).toBeDefined();
      expect(returnInvoice.salesType).toBe('return');
      // In UI, this should be displayed with red/highlighted tag
    });
  });
});
