const mongoose = require('mongoose');
const Batch = require('../../src/models/Batch');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const batchSelectorService = require('../../src/services/batchSelectorService');

describe('POS Diagnostic Tests', () => {
  let warehouse;
  let testItem;
  let batch;

  beforeAll(async () => {
    // Create warehouse
    warehouse = await Warehouse.create({
      code: 'WH001',
      name: 'Test Warehouse',
      location: {
        address: '123 Test St',
        city: 'Test City',
        country: 'Pakistan'
      },
      isActive: true
    });

    // Create item
    testItem = await Item.create({
      code: 'TEST001',
      name: 'Test Item',
      barcode: '1234567890',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'piece',
      inventory: {
        unit: 'piece',
        currentStock: 100
      },
      pricing: {
        costPrice: 10.00,
        salePrice: 15.00
      },
      tax: {
        gstRate: 18
      },
      isActive: true
    });

    // Create batch
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);

    batch = await Batch.create({
      batchNumber: 'TESTBATCH001',
      item: testItem._id,
      warehouse: warehouse._id,
      manufacturingDate: new Date(),
      expiryDate: futureDate,
      quantity: 50,
      remainingQuantity: 50,
      unitCost: 10.00,
      totalCost: 500.00,
      status: 'active'
    });

    console.log('Created batch:', {
      id: batch._id,
      batchNumber: batch.batchNumber,
      item: batch.item,
      warehouse: batch.warehouse,
      remainingQuantity: batch.remainingQuantity,
      status: batch.status,
      expiryDate: batch.expiryDate
    });
  });

  afterAll(async () => {
    await Batch.deleteMany({});
    await Item.deleteMany({});
    await Warehouse.deleteMany({});
  });

  it('should find batch directly', async () => {
    const foundBatch = await Batch.findById(batch._id);
    expect(foundBatch).toBeDefined();
    expect(foundBatch.remainingQuantity).toBe(50);
    expect(foundBatch.status).toBe('active');
    console.log('Found batch directly:', {
      id: foundBatch._id,
      remainingQuantity: foundBatch.remainingQuantity,
      status: foundBatch.status
    });
  });

  it('should find batch by query', async () => {
    const batches = await Batch.find({
      item: testItem._id,
      warehouse: warehouse._id,
      remainingQuantity: { $gt: 0 },
      status: 'active'
    });

    console.log('Query result:', {
      count: batches.length,
      batches: batches.map(b => ({
        id: b._id,
        batchNumber: b.batchNumber,
        remainingQuantity: b.remainingQuantity,
        status: b.status
      }))
    });

    expect(batches.length).toBeGreaterThan(0);
  });

  it('should select batches using batch selector service', async () => {
    const allocations = await batchSelectorService.selectBatches(
      testItem._id,
      10,
      warehouse._id
    );

    console.log('Batch selector result:', {
      allocations: allocations.map(a => ({
        batchNumber: a.batchNumber,
        quantity: a.quantity,
        availableQuantity: a.availableQuantity
      }))
    });

    expect(allocations.length).toBeGreaterThan(0);
    expect(allocations[0].quantity).toBe(10);
  });

  it('should get total available stock', async () => {
    const totalStock = await batchSelectorService.getTotalAvailableStock(
      testItem._id,
      warehouse._id
    );

    console.log('Total available stock:', totalStock);
    expect(totalStock).toBe(50);
  });
});
