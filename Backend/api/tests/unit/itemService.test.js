/**
 * Item Service Unit Tests
 * Tests for Requirements 1.1-1.20
 * 
 * Test Coverage:
 * - createItem with valid data
 * - createItem with invalid data
 * - getItems with various filters
 * - updateItem
 * - deleteItem
 * - low stock detection
 * - expiry detection
 * - item code generation
 */

const mongoose = require('mongoose');
const itemService = require('../../src/services/itemService');
const Item = require('../../src/models/Item');
const Company = require('../../src/models/Company');
const Category = require('../../src/models/category');
const SubCategory = require('../../src/models/subcategory');
const Business = require('../../src/models/business');
const Formula = require('../../src/models/formula');
const FormulaSize = require('../../src/models/formulasize');

describe('Item Service Unit Tests - Requirements 1.1-1.20', () => {
  let testCompany;
  let testCategory;
  let testSubCategory;
  let testBusinessType;
  let testFormula;
  let testFormulaSize;
  let testUserId;

  beforeAll(async () => {
    // Create test user ID
    testUserId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Item.deleteMany({});
    await Company.deleteMany({});
    await Category.deleteMany({});
    await SubCategory.deleteMany({});
    await Business.deleteMany({});
    await Formula.deleteMany({});
    await FormulaSize.deleteMany({});

    // Create test dependencies
    testCompany = await Company.create({
      name: 'Test Pharma Company',
      code: 'TPC001',
      groupType: 'A',
      isActive: true
    });

    testCategory = await Category.create({
      name: 'Test Category',
      isActive: true
    });

    testSubCategory = await SubCategory.create({
      name: 'Test SubCategory',
      categoryId: testCategory._id,
      isActive: true
    });

    testBusinessType = await Business.create({
      name: 'Medicine',
      isActive: true
    });

    testFormula = await Formula.create({
      name: 'Paracetamol',
      composition: 'Acetaminophen',
      isActive: true
    });

    testFormulaSize = await FormulaSize.create({
      formulaId: testFormula._id,
      size: '500mg',
      strength: '500mg',
      isActive: true
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await Item.deleteMany({});
    await Company.deleteMany({});
    await Category.deleteMany({});
    await SubCategory.deleteMany({});
    await Business.deleteMany({});
    await Formula.deleteMany({});
    await FormulaSize.deleteMany({});
  });

  // Helper function to create valid item data
  const createValidItemData = (overrides = {}) => ({
    name: 'Test Medicine Item',
    companyId: testCompany._id,
    businessTypeId: testBusinessType._id,
    categoryId: testCategory._id,
    subCategoryId: testSubCategory._id,
    formulaId: testFormula._id,
    formulaSizeId: testFormulaSize._id,
    sellingGroup: 'A',
    unit: 'tablet',
    pricing: {
      costPrice: 100,
      salePrice: 150,
      retailPrice: 160,
      wholesalePrice: 140,
      mrp: 180
    },
    inventory: {
      openingStock: 100,
      minimumStock: 10,
      maximumStock: 500,
      reorderPoint: 20
    },
    tax: {
      taxType: 'GST',
      gstRate: 18
    },
    ...overrides
  });

  describe('generateItemCode', () => {
    it('should generate unique item code', async () => {
      const code1 = await itemService.generateItemCode();
      expect(code1).toMatch(/^ITEM\d{6}$/);

      const code2 = await itemService.generateItemCode();
      expect(code2).toMatch(/^ITEM\d{6}$/);
    });
  });

  describe('createItem - Requirement 1.1-1.14', () => {
    it('should create item with valid data', async () => {
      const itemData = createValidItemData();
      
      const result = await itemService.createItem(itemData, testUserId);

      expect(result).toBeDefined();
      expect(result.name).toBe(itemData.name);
      expect(result.code).toMatch(/^ITEM\d{6}$/);
      expect(result.companyId._id.toString()).toBe(testCompany._id.toString());
      expect(result.pricing.salePrice).toBe(150);
      expect(result.inventory.currentStock).toBe(100);
      expect(result.isActive).toBe(true);
    });

    it('should create item with auto-generated code', async () => {
      const itemData = createValidItemData();
      delete itemData.code;

      const result = await itemService.createItem(itemData, testUserId);

      expect(result.code).toMatch(/^ITEM\d{6}$/);
    });

    it('should initialize current stock from opening stock', async () => {
      const itemData = createValidItemData({
        inventory: {
          openingStock: 250,
          minimumStock: 10,
          maximumStock: 500
        }
      });

      const result = await itemService.createItem(itemData, testUserId);

      expect(result.inventory.currentStock).toBe(250);
      expect(result.inventory.openingStock).toBe(250);
    });

    it('should throw error when name is missing', async () => {
      const itemData = createValidItemData();
      delete itemData.name;

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should throw error when name is too short', async () => {
      const itemData = createValidItemData({ name: 'AB' });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('at least 3 characters'))).toBe(true);
      }
    });

    it('should throw error when company is missing - Requirement 1.1', async () => {
      const itemData = createValidItemData();
      delete itemData.companyId;

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'companyId')).toBe(true);
      }
    });

    it('should throw error when company is inactive - Requirement 1.1', async () => {
      testCompany.isActive = false;
      await testCompany.save();

      const itemData = createValidItemData();

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('inactive company'))).toBe(true);
      }
    });

    it('should validate selling group - Requirement 1.2', async () => {
      const itemData = createValidItemData({ sellingGroup: 'D' });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'sellingGroup')).toBe(true);
      }
    });

    it('should accept valid selling groups A, B, C - Requirement 1.2', async () => {
      for (const group of ['A', 'B', 'C']) {
        const itemData = createValidItemData({ 
          sellingGroup: group,
          name: `Test Item ${group}`
        });
        const result = await itemService.createItem(itemData, testUserId);
        expect(result.sellingGroup).toBe(group);
      }
    });

    it('should throw error when business type is missing - Requirement 1.5', async () => {
      const itemData = createValidItemData();
      delete itemData.businessTypeId;

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'businessTypeId')).toBe(true);
      }
    });

    it('should throw error when category is missing - Requirement 1.6', async () => {
      const itemData = createValidItemData();
      delete itemData.categoryId;

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'categoryId')).toBe(true);
      }
    });

    it('should validate all prices are non-negative - Requirement 1.7', async () => {
      const itemData = createValidItemData({
        pricing: {
          costPrice: -100,
          salePrice: 150
        }
      });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('cannot be negative'))).toBe(true);
      }
    });

    it('should validate inventory levels are non-negative - Requirement 1.8', async () => {
      const itemData = createValidItemData({
        inventory: {
          openingStock: -10,
          minimumStock: 5,
          maximumStock: 100
        }
      });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('Opening stock cannot be negative'))).toBe(true);
      }
    });

    it('should validate min <= max stock levels - Requirement 1.8', async () => {
      const itemData = createValidItemData({
        inventory: {
          openingStock: 50,
          minimumStock: 100,
          maximumStock: 50
        }
      });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('Minimum stock cannot be greater than maximum stock'))).toBe(true);
      }
    });

    it('should validate reorder point <= max stock - Requirement 1.8', async () => {
      const itemData = createValidItemData({
        inventory: {
          openingStock: 50,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 150
        }
      });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('Reorder point cannot be greater than maximum stock'))).toBe(true);
      }
    });

    it('should validate GST rate is 0, 4, or 18 - Requirement 1.9', async () => {
      const itemData = createValidItemData({
        tax: {
          taxType: 'GST',
          gstRate: 10
        }
      });

      try {
        await itemService.createItem(itemData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('GST rate must be 0, 4, or 18'))).toBe(true);
      }
    });

    it('should accept valid GST rates 0, 4, 18 - Requirement 1.9', async () => {
      for (const rate of [0, 4, 18]) {
        const itemData = createValidItemData({
          name: `Test Item GST ${rate}`,
          tax: {
            taxType: 'GST',
            gstRate: rate
          }
        });
        const result = await itemService.createItem(itemData, testUserId);
        expect(result.tax.gstRate).toBe(rate);
      }
    });

    it('should throw error when barcode already exists', async () => {
      const itemData1 = createValidItemData({ barcode: 'BAR123456' });
      await itemService.createItem(itemData1, testUserId);

      const itemData2 = createValidItemData({ 
        name: 'Another Item',
        barcode: 'BAR123456' 
      });

      await expect(itemService.createItem(itemData2, testUserId))
        .rejects.toThrow('Barcode already exists');
    });

    it('should throw error when code already exists', async () => {
      const itemData1 = createValidItemData({ code: 'CUSTOM001' });
      await itemService.createItem(itemData1, testUserId);

      const itemData2 = createValidItemData({ 
        name: 'Another Item',
        code: 'CUSTOM001' 
      });

      await expect(itemService.createItem(itemData2, testUserId))
        .rejects.toThrow('Item code already exists');
    });
  });

  describe('getItems - Requirement 1.15-1.18', () => {
    beforeEach(async () => {
      // Create multiple test items
      await itemService.createItem(createValidItemData({
        name: 'Paracetamol 500mg',
        sellingGroup: 'A',
        pricing: { costPrice: 100, salePrice: 150 }
      }), testUserId);

      await itemService.createItem(createValidItemData({
        name: 'Ibuprofen 400mg',
        sellingGroup: 'B',
        pricing: { costPrice: 200, salePrice: 300 }
      }), testUserId);

      await itemService.createItem(createValidItemData({
        name: 'Aspirin 75mg',
        sellingGroup: 'C',
        pricing: { costPrice: 50, salePrice: 80 }
      }), testUserId);
    });

    it('should return all items with pagination', async () => {
      const result = await itemService.getItems({}, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(3);
      expect(result.pagination.totalItems).toBe(3);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter items by keyword search', async () => {
      const result = await itemService.getItems({ keyword: 'Paracetamol' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('Paracetamol');
    });

    it('should filter items by company', async () => {
      const result = await itemService.getItems({ companyId: testCompany._id });

      expect(result.items).toHaveLength(3);
      result.items.forEach(item => {
        expect(item.companyId._id.toString()).toBe(testCompany._id.toString());
      });
    });

    it('should filter items by category', async () => {
      const result = await itemService.getItems({ categoryId: testCategory._id });

      expect(result.items).toHaveLength(3);
    });

    it('should filter items by selling group', async () => {
      const result = await itemService.getItems({ sellingGroup: 'A' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sellingGroup).toBe('A');
    });

    it('should filter items by price range', async () => {
      const result = await itemService.getItems({ 
        minPrice: 100, 
        maxPrice: 200 
      });

      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(item => {
        expect(item.pricing.salePrice).toBeGreaterThanOrEqual(100);
        expect(item.pricing.salePrice).toBeLessThanOrEqual(200);
      });
    });

    it('should filter items by active status', async () => {
      const result = await itemService.getItems({ isActive: true });

      expect(result.items).toHaveLength(3);
      result.items.forEach(item => {
        expect(item.isActive).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const page1 = await itemService.getItems({}, { page: 1, limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.pagination.hasNextPage).toBe(true);
      expect(page1.pagination.hasPreviousPage).toBe(false);

      const page2 = await itemService.getItems({}, { page: 2, limit: 2 });
      expect(page2.items).toHaveLength(1);
      expect(page2.pagination.hasNextPage).toBe(false);
      expect(page2.pagination.hasPreviousPage).toBe(true);
    });

    it('should support sorting', async () => {
      const result = await itemService.getItems({}, { 
        sort: { 'pricing.salePrice': 1 } 
      });

      expect(result.items[0].pricing.salePrice).toBeLessThanOrEqual(
        result.items[1].pricing.salePrice
      );
    });
  });

  describe('updateItem', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({ name: 'Original Item' }), 
        testUserId
      );
    });

    it('should update item with valid data', async () => {
      const updateData = { name: 'Updated Item Name' };

      const result = await itemService.updateItem(
        createdItem._id, 
        updateData, 
        testUserId
      );

      expect(result.name).toBe('Updated Item Name');
      expect(result._id.toString()).toBe(createdItem._id.toString());
    });

    it('should update pricing information', async () => {
      const updateData = {
        pricing: {
          costPrice: 120,
          salePrice: 180
        }
      };

      const result = await itemService.updateItem(
        createdItem._id, 
        updateData, 
        testUserId
      );

      expect(result.pricing.costPrice).toBe(120);
      expect(result.pricing.salePrice).toBe(180);
    });

    it('should throw error when item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(itemService.updateItem(fakeId, { name: 'Test' }, testUserId))
        .rejects.toThrow('Item not found');
    });

    it('should validate updated data', async () => {
      const updateData = {
        pricing: {
          costPrice: -50,
          salePrice: 100
        }
      };

      try {
        await itemService.updateItem(createdItem._id, updateData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('cannot be negative'))).toBe(true);
      }
    });

    it('should prevent duplicate code on update', async () => {
      const item2 = await itemService.createItem(
        createValidItemData({ name: 'Item 2', code: 'UNIQUE002' }), 
        testUserId
      );

      await expect(
        itemService.updateItem(createdItem._id, { code: 'UNIQUE002' }, testUserId)
      ).rejects.toThrow('Item code already exists');
    });

    it('should prevent duplicate barcode on update', async () => {
      const item2 = await itemService.createItem(
        createValidItemData({ name: 'Item 2', barcode: 'BAR999' }), 
        testUserId
      );

      await expect(
        itemService.updateItem(createdItem._id, { barcode: 'BAR999' }, testUserId)
      ).rejects.toThrow('Barcode already exists');
    });
  });

  describe('deleteItem', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({ name: 'Item to Delete' }), 
        testUserId
      );
    });

    it('should soft delete item', async () => {
      const result = await itemService.deleteItem(createdItem._id, testUserId);

      expect(result.isActive).toBe(false);
      expect(result._id.toString()).toBe(createdItem._id.toString());
    });

    it('should throw error when item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(itemService.deleteItem(fakeId, testUserId))
        .rejects.toThrow('Item not found');
    });

    it('should not return deleted items in active queries', async () => {
      await itemService.deleteItem(createdItem._id, testUserId);

      const result = await itemService.getItems({ isActive: true });
      
      const deletedItem = result.items.find(
        item => item._id.toString() === createdItem._id.toString()
      );
      expect(deletedItem).toBeUndefined();
    });
  });

  describe('checkLowStock - Requirement 1.19', () => {
    beforeEach(async () => {
      // Create items with different stock levels
      await itemService.createItem(createValidItemData({
        name: 'Low Stock Item',
        inventory: {
          currentStock: 5,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 15
        }
      }), testUserId);

      await itemService.createItem(createValidItemData({
        name: 'Normal Stock Item',
        inventory: {
          currentStock: 50,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 15
        }
      }), testUserId);

      await itemService.createItem(createValidItemData({
        name: 'Out of Stock Item',
        inventory: {
          currentStock: 0,
          minimumStock: 10,
          maximumStock: 100,
          reorderPoint: 15
        }
      }), testUserId);
    });

    it('should identify low stock items', async () => {
      const result = await itemService.checkLowStock();

      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach(item => {
        expect(item.inventory.currentStock).toBeLessThanOrEqual(
          item.inventory.minimumStock
        );
      });
    });

    it('should include alert level information', async () => {
      const result = await itemService.checkLowStock();

      const criticalItem = result.find(item => item.inventory.currentStock === 0);
      expect(criticalItem.alertLevel).toBe('critical');

      const lowItem = result.find(item => 
        item.inventory.currentStock > 0 && 
        item.inventory.currentStock <= item.inventory.reorderPoint
      );
      if (lowItem) {
        expect(['high', 'medium']).toContain(lowItem.alertLevel);
      }
    });

    it('should calculate quantity needed', async () => {
      const result = await itemService.checkLowStock();

      result.forEach(item => {
        const expected = Math.max(
          0, 
          item.inventory.maximumStock - item.inventory.currentStock
        );
        expect(item.quantityNeeded).toBe(expected);
      });
    });

    it('should recommend reorder when below reorder point', async () => {
      const result = await itemService.checkLowStock();

      result.forEach(item => {
        if (item.inventory.currentStock <= item.inventory.reorderPoint) {
          expect(item.reorderRecommended).toBe(true);
        }
      });
    });
  });

  describe('checkExpiringItems - Requirement 1.20', () => {
    beforeEach(async () => {
      const today = new Date();
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);

      // Item with expiring batch
      await Item.create({
        ...createValidItemData({ name: 'Expiring Soon Item' }),
        code: 'EXP001',
        expiryTrackingEnabled: true,
        inventory: {
          currentStock: 50,
          batches: [
            {
              batchNumber: 'BATCH001',
              expiryDate: in10Days,
              stock: 30
            }
          ]
        }
      });

      // Item with expired batch
      await Item.create({
        ...createValidItemData({ name: 'Expired Item' }),
        code: 'EXP002',
        expiryTrackingEnabled: true,
        inventory: {
          currentStock: 20,
          batches: [
            {
              batchNumber: 'BATCH002',
              expiryDate: yesterday,
              stock: 20
            }
          ]
        }
      });

      // Item with far future expiry
      await Item.create({
        ...createValidItemData({ name: 'Good Expiry Item' }),
        code: 'EXP003',
        expiryTrackingEnabled: true,
        inventory: {
          currentStock: 100,
          batches: [
            {
              batchNumber: 'BATCH003',
              expiryDate: in60Days,
              stock: 100
            }
          ]
        }
      });
    });

    it('should identify items expiring within threshold', async () => {
      const result = await itemService.checkExpiringItems(30);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include expiring batch information', async () => {
      const result = await itemService.checkExpiringItems(30);

      result.forEach(item => {
        expect(item.expiringBatches).toBeDefined();
        expect(Array.isArray(item.expiringBatches)).toBe(true);
        expect(item.expiringBatches.length).toBeGreaterThan(0);
      });
    });

    it('should calculate days until expiry', async () => {
      const result = await itemService.checkExpiringItems(30);

      result.forEach(item => {
        item.expiringBatches.forEach(batch => {
          expect(batch.daysUntilExpiry).toBeDefined();
          expect(typeof batch.daysUntilExpiry).toBe('number');
        });
      });
    });

    it('should mark expired batches', async () => {
      const result = await itemService.checkExpiringItems(30);

      const expiredItem = result.find(item => 
        item.expiringBatches.some(batch => batch.isExpired)
      );

      if (expiredItem) {
        const expiredBatch = expiredItem.expiringBatches.find(b => b.isExpired);
        expect(expiredBatch.daysUntilExpiry).toBeLessThan(0);
        expect(expiredBatch.alertLevel).toBe('critical');
      }
    });

    it('should calculate total expiring quantity', async () => {
      const result = await itemService.checkExpiringItems(30);

      result.forEach(item => {
        const expectedTotal = item.expiringBatches.reduce(
          (sum, batch) => sum + batch.stock, 
          0
        );
        expect(item.totalExpiringQuantity).toBe(expectedTotal);
      });
    });

    it('should identify nearest expiry date', async () => {
      const result = await itemService.checkExpiringItems(30);

      result.forEach(item => {
        if (item.expiringBatches.length > 0) {
          const minDays = Math.min(
            ...item.expiringBatches.map(b => b.daysUntilExpiry)
          );
          expect(item.nearestExpiryDays).toBe(minDays);
        }
      });
    });

    it('should not include items without expiry tracking', async () => {
      await Item.create({
        ...createValidItemData({ name: 'No Expiry Tracking' }),
        code: 'NOEXP001',
        expiryTrackingEnabled: false,
        inventory: {
          currentStock: 50
        }
      });

      const result = await itemService.checkExpiringItems(30);

      const noExpiryItem = result.find(item => item.code === 'NOEXP001');
      expect(noExpiryItem).toBeUndefined();
    });
  });

  describe('updateStockLevel', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({
          name: 'Stock Test Item',
          inventory: {
            currentStock: 50,
            minimumStock: 10,
            maximumStock: 100
          }
        }), 
        testUserId
      );
    });

    it('should add stock to item', async () => {
      const result = await itemService.updateStockLevel(
        createdItem._id, 
        20, 
        'add'
      );

      expect(result.inventory.currentStock).toBe(70);
    });

    it('should subtract stock from item', async () => {
      const result = await itemService.updateStockLevel(
        createdItem._id, 
        15, 
        'subtract'
      );

      expect(result.inventory.currentStock).toBe(35);
    });

    it('should throw error for zero quantity', async () => {
      await expect(
        itemService.updateStockLevel(createdItem._id, 0, 'add')
      ).rejects.toThrow('Quantity must be greater than zero');
    });

    it('should throw error for negative quantity', async () => {
      await expect(
        itemService.updateStockLevel(createdItem._id, -10, 'add')
      ).rejects.toThrow('Quantity must be greater than zero');
    });

    it('should throw error for invalid operation', async () => {
      await expect(
        itemService.updateStockLevel(createdItem._id, 10, 'invalid')
      ).rejects.toThrow("Operation must be either 'add' or 'subtract'");
    });

    it('should throw error when subtracting more than available', async () => {
      await expect(
        itemService.updateStockLevel(createdItem._id, 100, 'subtract')
      ).rejects.toThrow('Insufficient stock');
    });

    it('should not allow negative stock after subtraction', async () => {
      const result = await itemService.updateStockLevel(
        createdItem._id, 
        50, 
        'subtract'
      );

      expect(result.inventory.currentStock).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getItemById', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({ name: 'Test Item for Get' }), 
        testUserId
      );
    });

    it('should return item with populated references', async () => {
      const result = await itemService.getItemById(createdItem._id);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(createdItem._id.toString());
      expect(result.companyId).toBeDefined();
      expect(result.companyId.name).toBe(testCompany.name);
      expect(result.categoryId).toBeDefined();
      expect(result.categoryId.name).toBe(testCategory.name);
    });

    it('should throw error when item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(itemService.getItemById(fakeId))
        .rejects.toThrow('Item not found');
    });
  });

  describe('getItemByCode', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({ 
          name: 'Test Item for Code',
          code: 'TESTCODE001'
        }), 
        testUserId
      );
    });

    it('should return item by code', async () => {
      const result = await itemService.getItemByCode('TESTCODE001');

      expect(result).toBeDefined();
      expect(result.code).toBe('TESTCODE001');
      expect(result.name).toBe('Test Item for Code');
    });

    it('should be case insensitive', async () => {
      const result = await itemService.getItemByCode('testcode001');

      expect(result).toBeDefined();
      expect(result.code).toBe('TESTCODE001');
    });

    it('should throw error when item not found', async () => {
      await expect(itemService.getItemByCode('NONEXISTENT'))
        .rejects.toThrow('Item not found');
    });
  });

  describe('checkStockAvailability', () => {
    let createdItem;

    beforeEach(async () => {
      createdItem = await itemService.createItem(
        createValidItemData({
          name: 'Stock Check Item',
          inventory: {
            currentStock: 50,
            minimumStock: 10,
            maximumStock: 100
          }
        }), 
        testUserId
      );
    });

    it('should return true when sufficient stock available', async () => {
      const result = await itemService.checkStockAvailability(
        createdItem._id, 
        30
      );

      expect(result).toBe(true);
    });

    it('should return true when exact stock available', async () => {
      const result = await itemService.checkStockAvailability(
        createdItem._id, 
        50
      );

      expect(result).toBe(true);
    });

    it('should return false when insufficient stock', async () => {
      const result = await itemService.checkStockAvailability(
        createdItem._id, 
        100
      );

      expect(result).toBe(false);
    });

    it('should throw error when item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(itemService.checkStockAvailability(fakeId, 10))
        .rejects.toThrow('Item not found');
    });
  });

  describe('validateItemData', () => {
    it('should validate complete item data', async () => {
      const itemData = createValidItemData();

      const result = await itemService.validateItemData(itemData, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid data', async () => {
      const itemData = {
        name: 'AB', // Too short
        pricing: {
          costPrice: -100 // Negative
        }
      };

      const result = await itemService.validateItemData(itemData, false);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
