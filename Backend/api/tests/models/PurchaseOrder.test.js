const mongoose = require('mongoose');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Unit Tests for PurchaseOrder Model
 * Tests for Requirements 4.1-4.18: Purchase Order Management
 */
describe('PurchaseOrder Model', () => {
  let testSupplier;
  let testItem1;
  let testItem2;
  let testUser;
  let testCompany;
  let testBusinessType;
  let testCategory;

  beforeAll(async () => {
    // Create required dependencies for Item model
    const Company = require('../../src/models/Company');
    const Business = require('../../src/models/Business');
    const Category = require('../../src/models/Category');

    testCompany = await Company.create({
      name: 'Test Company',
      code: 'COMP001',
      isActive: true,
    });

    testBusinessType = await Business.create({
      name: 'Medicine',
      code: 'BUS001',
      isActive: true,
    });

    testCategory = await Category.create({
      name: 'Test Category',
      code: 'CAT001',
      isActive: true,
    });

    // Create test data
    testSupplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'supplier@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
    });

    testItem1 = await Item.create({
      name: 'Test Item 1',
      code: 'ITEM001',
      companyId: testCompany._id,
      businessTypeId: testBusinessType._id,
      categoryId: testCategory._id,
      unit: 'tablet',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
    });

    testItem2 = await Item.create({
      name: 'Test Item 2',
      code: 'ITEM002',
      companyId: testCompany._id,
      businessTypeId: testBusinessType._id,
      categoryId: testCategory._id,
      unit: 'tablet',
      pricing: {
        costPrice: 200,
        salePrice: 300,
      },
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  afterAll(async () => {
    const Company = require('../../src/models/Company');
    const Business = require('../../src/models/Business');
    const Category = require('../../src/models/Category');
    
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await Business.deleteMany({});
    await Category.deleteMany({});
  });

  afterEach(async () => {
    await PurchaseOrder.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid purchase order with required fields', async () => {
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-15'),
        status: 'draft',
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.poNumber).toBe('PO-2024-001');
      expect(po.supplierId.toString()).toBe(testSupplier._id.toString());
      expect(po.status).toBe('draft');
      expect(po.items).toHaveLength(1);
      expect(po.items[0].boxQty).toBe(5);
      expect(po.items[0].boxTP).toBe(100);
      expect(po.items[0].netAmount).toBe(500); // 5 * 100 = 500
      expect(po.totalAmount).toBe(500);
    });

    it('should fail validation when poNumber is missing', async () => {
      const poData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when supplierId is missing', async () => {
      const poData = {
        poNumber: 'PO-2024-002',
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when items array is empty', async () => {
      const poData = {
        poNumber: 'PO-2024-003',
        supplierId: testSupplier._id,
        items: [],
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when createdBy is missing', async () => {
      const poData = {
        poNumber: 'PO-2024-004',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when itemName is missing', async () => {
      const poData = {
        poNumber: 'PO-2024-005',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });
  });

  describe('PO Number Uniqueness', () => {
    it('should enforce unique PO numbers', async () => {
      const poData1 = {
        poNumber: 'PO-2024-006',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await PurchaseOrder.create(poData1);

      const poData2 = {
        ...poData1,
        supplierId: testSupplier._id,
      };

      await expect(PurchaseOrder.create(poData2)).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status values', async () => {
      const validStatuses = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];

      for (const status of validStatuses) {
        const po = await PurchaseOrder.create({
          poNumber: `PO-STATUS-${status}`,
          supplierId: testSupplier._id,
          status: status,
          items: [
            {
              itemId: testItem1._id,
              itemName: 'Test Item 1',
              boxQty: 10,
              boxTP: 100,
            },
          ],
          createdBy: testUser._id,
        });

        expect(po.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const poData = {
        poNumber: 'PO-INVALID-STATUS',
        supplierId: testSupplier._id,
        status: 'invalid_status',
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });
  });

  describe('Item Calculation', () => {
    it('should calculate netAmount correctly with box quantity only', async () => {
      const poData = {
        poNumber: 'PO-CALC-BOX',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items[0].netAmount).toBe(500); // 5 * 100 = 500
      expect(po.totalAmount).toBe(500);
    });

    it('should calculate netAmount correctly with unit quantity only', async () => {
      const poData = {
        poNumber: 'PO-CALC-UNIT',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 0,
            unitQty: 25,
            boxTP: 100,
            unitTP: 10,
            discount: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items[0].netAmount).toBe(250); // 25 * 10 = 250
      expect(po.totalAmount).toBe(250);
    });

    it('should calculate netAmount correctly with both box and unit quantities', async () => {
      const poData = {
        poNumber: 'PO-CALC-BOTH',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 5,
            unitQty: 25,
            boxTP: 100,
            unitTP: 10,
            discount: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items[0].netAmount).toBe(750); // (5 * 100) + (25 * 10) = 750
      expect(po.totalAmount).toBe(750);
    });

    it('should apply discount correctly', async () => {
      const poData = {
        poNumber: 'PO-CALC-DISCOUNT',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 10, // 10% discount
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      // Gross: 10 * 100 = 1000
      // Discount: 1000 * 0.10 = 100
      // Net: 1000 - 100 = 900
      expect(po.items[0].netAmount).toBe(900);
      expect(po.totalAmount).toBe(900);
    });

    it('should support multiple items in a purchase order', async () => {
      const poData = {
        poNumber: 'PO-MULTI-ITEMS',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 0,
          },
          {
            itemId: testItem2._id,
            itemName: 'Test Item 2',
            boxPacking: 5,
            boxQty: 5,
            unitQty: 10,
            boxTP: 200,
            unitTP: 40,
            discount: 5,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items).toHaveLength(2);
      expect(po.items[0].itemId.toString()).toBe(testItem1._id.toString());
      expect(po.items[1].itemId.toString()).toBe(testItem2._id.toString());
      
      // Item 1: 10 * 100 = 1000
      expect(po.items[0].netAmount).toBe(1000);
      
      // Item 2: (5 * 200) + (10 * 40) = 1400, discount 5% = 1400 * 0.95 = 1330
      expect(po.items[1].netAmount).toBe(1330);
      
      // Total: 1000 + 1330 = 2330
      expect(po.totalAmount).toBe(2330);
    });
  });

  describe('Pending Quantity Calculation', () => {
    it('should calculate pending quantity on save', async () => {
      const poData = {
        poNumber: 'PO-PENDING-QTY',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 5,
            boxTP: 100,
            unitTP: 10,
            receivedQuantity: 30,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      // Total ordered: (10 * 10) + 5 = 105
      // Received: 30
      // Pending: 105 - 30 = 75
      expect(po.items[0].pendingQuantity).toBe(75);
    });

    it('should set pending quantity to full quantity when nothing received', async () => {
      const poData = {
        poNumber: 'PO-NO-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      // Total ordered: (10 * 10) + 0 = 100
      expect(po.items[0].pendingQuantity).toBe(100);
    });
  });

  describe('Virtual Properties', () => {
    it('should return true for isFullyReceived when all items are received', async () => {
      const poData = {
        poNumber: 'PO-FULLY-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            receivedQuantity: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isFullyReceived).toBe(true);
    });

    it('should return false for isFullyReceived when items are partially received', async () => {
      const poData = {
        poNumber: 'PO-PARTIAL-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            receivedQuantity: 50,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isFullyReceived).toBe(false);
    });

    it('should return true for isPartiallyReceived when some items are received', async () => {
      const poData = {
        poNumber: 'PO-PARTIAL-CHECK',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            receivedQuantity: 50,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isPartiallyReceived).toBe(true);
    });

    it('should return false for isPartiallyReceived when nothing is received', async () => {
      const poData = {
        poNumber: 'PO-NO-PARTIAL',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxPacking: 10,
            boxQty: 10,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            receivedQuantity: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isPartiallyReceived).toBe(false);
    });
  });

  describe('Workflow Fields', () => {
    it('should store conversion information', async () => {
      const convertedDate = new Date('2024-01-20');
      const invoiceId = new mongoose.Types.ObjectId();
      
      const poData = {
        poNumber: 'PO-CONVERTED',
        supplierId: testSupplier._id,
        status: 'received',
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
        convertedInvoiceId: invoiceId,
        convertedAt: convertedDate,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.convertedInvoiceId.toString()).toBe(invoiceId.toString());
      expect(po.convertedAt).toEqual(convertedDate);
    });

    it('should store status transition timestamps', async () => {
      const sentDate = new Date('2024-01-15');
      const confirmedDate = new Date('2024-01-16');
      const receivedDate = new Date('2024-01-20');
      
      const poData = {
        poNumber: 'PO-TIMESTAMPS',
        supplierId: testSupplier._id,
        status: 'received',
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
        sentAt: sentDate,
        confirmedAt: confirmedDate,
        receivedAt: receivedDate,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.sentAt).toEqual(sentDate);
      expect(po.confirmedAt).toEqual(confirmedDate);
      expect(po.receivedAt).toEqual(receivedDate);
    });
  });

  describe('Soft Delete', () => {
    it('should support soft delete with isDeleted flag', async () => {
      const poData = {
        poNumber: 'PO-SOFT-DELETE',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
        isDeleted: true,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isDeleted).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt timestamps', async () => {
      const poData = {
        poNumber: 'PO-AUTO-TIMESTAMPS',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.createdAt).toBeDefined();
      expect(po.updatedAt).toBeDefined();
      expect(po.createdAt).toBeInstanceOf(Date);
      expect(po.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('PO Number Generation', () => {
    it('should generate PO number with correct format', async () => {
      const poNumber = await PurchaseOrder.generatePONumber();
      const year = new Date().getFullYear();
      
      expect(poNumber).toMatch(new RegExp(`^PO${year}\\d{6}$`));
    });

    it('should generate sequential PO numbers', async () => {
      const poNumber1 = await PurchaseOrder.generatePONumber();
      
      await PurchaseOrder.create({
        poNumber: poNumber1,
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            itemName: 'Test Item 1',
            boxQty: 10,
            boxTP: 100,
          },
        ],
        createdBy: testUser._id,
      });

      const poNumber2 = await PurchaseOrder.generatePONumber();
      
      // Extract numbers from PO numbers
      const num1 = parseInt(poNumber1.slice(-6));
      const num2 = parseInt(poNumber2.slice(-6));
      
      expect(num2).toBe(num1 + 1);
    });
  });
});
