const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');
const Batch = require('../../src/models/Batch');
const Invoice = require('../../src/models/Invoice');
const Warehouse = require('../../src/models/Warehouse');

describe('POS Integration Tests - Real Scenario Based Testing', () => {
  let authToken;
  let salesmanUser;
  let warehouse;
  let testCustomer;
  let walkInCustomer;
  let testItem1;
  let testItem2;
  let testItem3;
  let batch1;
  let batch2;
  let batch3;

  beforeAll(async () => {
    const bcrypt = require('bcryptjs');
    
    // Create warehouse
    warehouse = await Warehouse.create({
      code: 'WH001',
      name: 'Main Warehouse',
      location: {
        address: '123 Main Street',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        postalCode: '75500'
      },
      isActive: true
    });

    // Create salesman user with warehouse assignment
    const hashedPassword = await bcrypt.hash('salesman123', 10);
    salesmanUser = await User.create({
      username: 'salesman1',
      email: 'salesman@test.com',
      password: hashedPassword,
      role: 'sales',
      warehouseId: warehouse._id,
      isActive: true
    });

    // Login to get auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { 
        userId: salesmanUser._id, 
        email: salesmanUser.email, 
        role: salesmanUser.role,
        warehouseId: warehouse._id 
      },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // Create test customers
    testCustomer = await Customer.create({
      code: 'CUST001',
      name: 'Test Pharmacy',
      contactInfo: {
        phone: '03001234567'
      },
      type: 'customer',
      accountType: 'customer',
      financialInfo: {
        creditLimit: 100000
      },
      currentBalance: 25000,
      isActive: true
    });

    walkInCustomer = await Customer.create({
      code: 'WALK-IN',
      name: 'Walk-In Customer',
      type: 'customer',
      accountType: 'customer',
      financialInfo: {
        creditLimit: 0
      },
      currentBalance: 0,
      isActive: true
    });

    // Create test items with stock
    testItem1 = await Item.create({
      code: 'PARA500',
      name: 'Paracetamol 500mg',
      barcode: '1234567890123',
      sku: 'MED-PARA-500',
      category: 'Medicine',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'strip',
      inventory: {
        unit: 'strip',
        currentStock: 100
      },
      pricing: {
        costPrice: 40.00,
        salePrice: 50.00
      },
      tax: {
        gstRate: 18
      },
      isActive: true
    });

    testItem2 = await Item.create({
      code: 'IBUP400',
      name: 'Ibuprofen 400mg',
      barcode: '1234567890124',
      sku: 'MED-IBUP-400',
      category: 'Medicine',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'strip',
      inventory: {
        unit: 'strip',
        currentStock: 50
      },
      pricing: {
        costPrice: 60.00,
        salePrice: 80.00
      },
      tax: {
        gstRate: 18
      },
      isActive: true
    });

    testItem3 = await Item.create({
      code: 'VITA100',
      name: 'Vitamin C 100mg',
      barcode: '1234567890125',
      sku: 'MED-VITA-100',
      category: 'Supplement',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'bottle',
      inventory: {
        unit: 'bottle',
        currentStock: 30
      },
      pricing: {
        costPrice: 100.00,
        salePrice: 150.00
      },
      tax: {
        gstRate: 4
      },
      isActive: true
    });

    // Create batches with FEFO scenario
    const today = new Date();
    const futureDate1 = new Date(today);
    futureDate1.setMonth(futureDate1.getMonth() + 3); // Expires in 3 months
    
    const futureDate2 = new Date(today);
    futureDate2.setMonth(futureDate2.getMonth() + 6); // Expires in 6 months
    
    const futureDate3 = new Date(today);
    futureDate3.setMonth(futureDate3.getMonth() + 9); // Expires in 9 months

    batch1 = await Batch.create({
      batchNumber: 'BATCH001',
      item: testItem1._id,
      warehouse: warehouse._id,
      manufacturingDate: new Date(today.getFullYear(), today.getMonth() - 6, 1),
      expiryDate: futureDate1,
      quantity: 30,
      remainingQuantity: 30,
      unitCost: 40.00,
      totalCost: 1200.00,
      status: 'active'
    });

    batch2 = await Batch.create({
      batchNumber: 'BATCH002',
      item: testItem1._id,
      warehouse: warehouse._id,
      manufacturingDate: new Date(today.getFullYear(), today.getMonth() - 3, 1),
      expiryDate: futureDate2,
      quantity: 70,
      remainingQuantity: 70,
      unitCost: 40.00,
      totalCost: 2800.00,
      status: 'active'
    });

    batch3 = await Batch.create({
      batchNumber: 'BATCH003',
      item: testItem2._id,
      warehouse: warehouse._id,
      manufacturingDate: new Date(today.getFullYear(), today.getMonth() - 2, 1),
      expiryDate: futureDate3,
      quantity: 50,
      remainingQuantity: 50,
      unitCost: 60.00,
      totalCost: 3000.00,
      status: 'active'
    });
  });

  beforeEach(async () => {
    // Only clear invoices before each test to avoid recreating batches
    await Invoice.deleteMany({});
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Item.deleteMany({});
    await Customer.deleteMany({});
    await Batch.deleteMany({});
    await Invoice.deleteMany({});
  });

  // ==================== TASK 10: INTEGRATION TESTS ====================

  describe('Setup Verification', () => {
    it('should have created batches correctly', async () => {
      const batches = await Batch.find({ warehouse: warehouse._id });
      expect(batches.length).toBeGreaterThan(0);
      
      const batch1Found = await Batch.findById(batch1._id);
      expect(batch1Found).toBeDefined();
      expect(batch1Found.remainingQuantity).toBe(30);
      expect(batch1Found.status).toBe('active');
      
      // Test batch selector service directly
      const batchSelectorService = require('../../src/services/batchSelectorService');
      const allocations = await batchSelectorService.selectBatches(
        testItem1._id,
        10,
        warehouse._id
      );
      
      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].quantity).toBe(10);
    });
  });

  describe('Complete POS Flow: Search → Scan → Select Customer → Create Invoice', () => {
    it('should complete a full POS transaction flow successfully', async () => {
      // Step 1: Search for items
      const searchResponse = await request(app)
        .get('/api/v1/salesman/pos/items/search')
        .query({ q: 'paracetamol', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toBeInstanceOf(Array);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      expect(searchResponse.body.data[0].name).toContain('Paracetamol');

      // Step 2: Scan barcode for detailed item info
      const scanResponse = await request(app)
        .post('/api/v1/salesman/pos/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(scanResponse.body.success).toBe(true);
      expect(scanResponse.body.data.barcode).toBe('1234567890123');
      expect(scanResponse.body.data.batches).toBeInstanceOf(Array);
      expect(scanResponse.body.data.batches.length).toBe(2); // batch1 and batch2

      // Step 3: Search for customer
      const customerResponse = await request(app)
        .get('/api/v1/salesman/pos/customers/search')
        .query({ q: 'test', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customerResponse.body.success).toBe(true);
      expect(customerResponse.body.data).toBeInstanceOf(Array);
      expect(customerResponse.body.data[0].name).toContain('Test Pharmacy');

      // Step 4: Create invoice
      const invoiceResponse = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 10,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash',
          notes: 'POS sale - full flow test'
        })
        .expect(201);

      expect(invoiceResponse.body.success).toBe(true);
      expect(invoiceResponse.body.data.invoiceNumber).toBeDefined();
      expect(invoiceResponse.body.data.status).toBe('confirmed');
      expect(invoiceResponse.body.data.salesmanId).toBe(salesmanUser._id.toString());
    });
  });

  describe('Invoice Creation Updates Stock Correctly', () => {
    it('should decrease stock when confirmed invoice is created', async () => {
      const initialStock = testItem1.inventory.currentStock;
      const quantityToSell = 10;

      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: quantityToSell,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify stock was updated
      const updatedItem = await Item.findById(testItem1._id);
      expect(updatedItem.inventory.currentStock).toBe(initialStock - quantityToSell);

      // Verify batch stock was updated (FEFO - should use batch1 first)
      const updatedBatch1 = await Batch.findById(batch1._id);
      expect(updatedBatch1.remainingQuantity).toBe(batch1.remainingQuantity - quantityToSell);
    });

    it('should use FEFO logic when selecting batches', async () => {
      // Sell 40 units - should use all of batch1 (30) and 10 from batch2
      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 40,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify batch1 (earliest expiry) is depleted
      const updatedBatch1 = await Batch.findById(batch1._id);
      expect(updatedBatch1.remainingQuantity).toBe(0);
      expect(updatedBatch1.status).toBe('depleted');

      // Verify batch2 has 10 units deducted
      const updatedBatch2 = await Batch.findById(batch2._id);
      expect(updatedBatch2.remainingQuantity).toBe(60);
    });
  });

  describe('Draft Invoice Does Not Affect Stock', () => {
    it('should not update stock when draft invoice is created', async () => {
      const initialStock = testItem1.inventory.currentStock;
      const initialBatchStock = batch1.remainingQuantity;

      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices/draft')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 10,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');

      // Verify stock was NOT updated
      const updatedItem = await Item.findById(testItem1._id);
      expect(updatedItem.inventory.currentStock).toBe(initialStock);

      // Verify batch stock was NOT updated
      const updatedBatch = await Batch.findById(batch1._id);
      expect(updatedBatch.remainingQuantity).toBe(initialBatchStock);
    });
  });

  describe('Credit Limit Validation', () => {
    it('should prevent invoice creation when credit limit is exceeded', async () => {
      // Customer has credit limit of 100,000 and current balance of 25,000
      // Try to create invoice for 80,000 (total would be 105,000)
      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 1600, // 1600 * 50 = 80,000
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'credit'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('credit limit');
      expect(response.body.error.message).toContain('100000'); // Credit limit
      expect(response.body.error.message).toContain('25000'); // Current balance
    });

    it('should allow invoice creation for walk-in customer without credit check', async () => {
      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: walkInCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 10,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Insufficient Stock Validation', () => {
    it('should prevent invoice creation when insufficient stock is available', async () => {
      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 150, // Only 100 available
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient stock');
      expect(response.body.error.message).toContain(testItem1._id.toString());
    });

    it('should provide detailed error message with item details', async () => {
      const response = await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem2._id.toString(),
              itemName: 'Ibuprofen 400mg',
              quantity: 60, // Only 50 available
              unitPrice: 80.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Required: 60');
      expect(response.body.error.message).toContain('Available: 50');
    });
  });

  // ==================== TASK 10.1: CONCURRENT OPERATIONS TESTING ====================

  describe('Concurrent Invoice Creation - Race Condition Prevention', () => {
    it('should prevent overselling when two salesmen create invoices concurrently for the same item', async () => {
      // Create second salesman
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('salesman456', 10);
      const salesman2 = await User.create({
        username: 'salesman2',
        email: 'salesman2@test.com',
        password: hashedPassword,
        role: 'sales',
        warehouseId: warehouse._id,
        isActive: true
      });

      const jwt = require('jsonwebtoken');
      const authToken2 = jwt.sign(
        { 
          userId: salesman2._id, 
          email: salesman2.email, 
          role: salesman2.role,
          warehouseId: warehouse._id 
        },
        process.env.JWT_SECRET || 'test_jwt_secret',
        { expiresIn: '1h' }
      );

      // Both salesmen try to sell 30 units from batch1 (which only has 30 units)
      const invoiceData = {
        customerId: testCustomer._id.toString(),
        items: [
          {
            itemId: testItem1._id.toString(),
            itemName: 'Paracetamol 500mg',
            quantity: 30,
            unitPrice: 50.00,
            discount: 0,
            gstRate: 18
          }
        ],
        discount: 0,
        paymentMethod: 'cash'
      };

      // Execute both requests concurrently
      const [response1, response2] = await Promise.allSettled([
        request(app)
          .post('/api/v1/salesman/pos/invoices')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invoiceData),
        request(app)
          .post('/api/v1/salesman/pos/invoices')
          .set('Authorization', `Bearer ${authToken2}`)
          .send(invoiceData)
      ]);

      // One should succeed, one should fail
      const successCount = [response1, response2].filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
      const failureCount = [response1, response2].filter(r => r.status === 'fulfilled' && r.value.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify batch stock is correct (should be 0, not negative)
      const updatedBatch = await Batch.findById(batch1._id);
      expect(updatedBatch.remainingQuantity).toBe(0);
      expect(updatedBatch.remainingQuantity).toBeGreaterThanOrEqual(0);

      // Verify total allocated quantity doesn't exceed available stock
      const invoices = await Invoice.find({ status: 'confirmed' });
      const totalAllocated = invoices.reduce((sum, inv) => {
        return sum + inv.items.reduce((itemSum, item) => {
          if (item.itemId.toString() === testItem1._id.toString()) {
            return itemSum + item.quantity;
          }
          return itemSum;
        }, 0);
      }, 0);

      expect(totalAllocated).toBeLessThanOrEqual(30); // Original batch1 quantity
    });

    it('should handle concurrent requests for different items without conflicts', async () => {
      // Create second salesman
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('salesman789', 10);
      const salesman3 = await User.create({
        username: 'salesman3',
        email: 'salesman3@test.com',
        password: hashedPassword,
        role: 'sales',
        warehouseId: warehouse._id,
        isActive: true
      });

      const jwt = require('jsonwebtoken');
      const authToken3 = jwt.sign(
        { 
          userId: salesman3._id, 
          email: salesman3.email, 
          role: salesman3.role,
          warehouseId: warehouse._id 
        },
        process.env.JWT_SECRET || 'test_jwt_secret',
        { expiresIn: '1h' }
      );

      // Salesman 1 sells item1, Salesman 3 sells item2
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/v1/salesman/pos/invoices')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: testCustomer._id.toString(),
            items: [
              {
                itemId: testItem1._id.toString(),
                itemName: 'Paracetamol 500mg',
                quantity: 10,
                unitPrice: 50.00,
                discount: 0,
                gstRate: 18
              }
            ],
            discount: 0,
            paymentMethod: 'cash'
          }),
        request(app)
          .post('/api/v1/salesman/pos/invoices')
          .set('Authorization', `Bearer ${authToken3}`)
          .send({
            customerId: testCustomer._id.toString(),
            items: [
              {
                itemId: testItem2._id.toString(),
                itemName: 'Ibuprofen 400mg',
                quantity: 10,
                unitPrice: 80.00,
                discount: 0,
                gstRate: 18
              }
            ],
            discount: 0,
            paymentMethod: 'cash'
          })
      ]);

      // Both should succeed
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });
  });

  describe('Stock Updates Reflect in Subsequent Searches', () => {
    it('should show updated stock in item search after invoice creation', async () => {
      // Initial search
      const initialSearch = await request(app)
        .get('/api/v1/salesman/pos/items/search')
        .query({ q: 'paracetamol', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialStock = initialSearch.body.data[0].availableStock;

      // Create invoice
      await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 15,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      // Search again
      const updatedSearch = await request(app)
        .get('/api/v1/salesman/pos/items/search')
        .query({ q: 'paracetamol', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedStock = updatedSearch.body.data[0].availableStock;

      expect(updatedStock).toBe(initialStock - 15);
    });

    it('should show updated stock in barcode scan after invoice creation', async () => {
      // Initial scan
      const initialScan = await request(app)
        .post('/api/v1/salesman/pos/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      const initialStock = initialScan.body.data.availableStock;

      // Create invoice
      await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 20,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      // Scan again
      const updatedScan = await request(app)
        .post('/api/v1/salesman/pos/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      const updatedStock = updatedScan.body.data.availableStock;

      expect(updatedStock).toBe(initialStock - 20);
    });
  });

  describe('Performance Testing', () => {
    it('should complete item search within 300ms', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/salesman/pos/items/search')
        .query({ q: 'para', limit: 20 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300);
    });

    it('should complete invoice creation within 500ms', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/v1/salesman/pos/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer._id.toString(),
          items: [
            {
              itemId: testItem1._id.toString(),
              itemName: 'Paracetamol 500mg',
              quantity: 5,
              unitPrice: 50.00,
              discount: 0,
              gstRate: 18
            }
          ],
          discount: 0,
          paymentMethod: 'cash'
        })
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
    });
  });
});
