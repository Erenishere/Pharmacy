const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Category = require('../src/models/category');
const Company = require('../src/models/Company');
const Inventory = require('../src/models/Inventory');
const Item = require('../src/models/Item');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('inventory stock API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let warehouse;
  let category;
  let primaryCompany;
  let secondaryCompany;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const createItem = (overrides = {}) => Item.create({
    code: overrides.code || `ITEM-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`,
    name: overrides.name || 'Inventory Stock Item',
    barcode: overrides.barcode,
    companyId: overrides.companyId || primaryCompany._id,
    businessTypeId: new mongoose.Types.ObjectId(),
    categoryId: overrides.categoryId || category._id,
    category: 'General',
    unit: 'piece',
    pricing: {
      costPrice: overrides.costPrice || 10,
      salePrice: overrides.salePrice || 15,
    },
    inventory: {
      currentStock: overrides.currentStock || 0,
      minimumStock: overrides.minimumStock ?? 2,
      maximumStock: 100,
      reorderPoint: overrides.reorderPoint ?? 3,
    },
    isActive: true,
    status: 'active',
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'inventory-stock-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'inventory-stock-api-refresh-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    await mongoose.connect(replSet.getUri(), { dbName: 'inventory_stock_api_contracts' });
    await Promise.all([
      Category.init(),
      Company.init(),
      Inventory.init(),
      Item.init(),
      User.init(),
      Warehouse.init(),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      Category.deleteMany({}),
      Company.deleteMany({}),
      Inventory.deleteMany({}),
      Item.deleteMany({}),
      User.deleteMany({}),
      Warehouse.deleteMany({}),
    ]);

    adminUser = await User.create({
      username: 'inventory-admin',
      email: 'inventory-admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    warehouse = await Warehouse.create({
      code: 'STKWH',
      name: 'Stock API Warehouse',
      location: {
        address: 'Stock Street',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });

    category = await Category.create({
      name: 'Stock API Category',
      isActive: true,
    });

    primaryCompany = await Company.create({
      name: 'Primary Performance Pharma',
      code: 'PPP',
      isActive: true,
    });

    secondaryCompany = await Company.create({
      name: 'Secondary Performance Pharma',
      code: 'SPP',
      isActive: true,
    });
  });

  it('filters stock by company and barcode search with paginated metadata', async () => {
    const matchingItemA = await createItem({
      code: 'STK-001',
      name: 'Fast Filter One',
      barcode: 'MATCH-001',
      companyId: primaryCompany._id,
      minimumStock: 4,
    });
    const matchingItemB = await createItem({
      code: 'STK-002',
      name: 'Fast Filter Two',
      barcode: 'MATCH-002',
      companyId: primaryCompany._id,
      minimumStock: 1,
    });
    const otherCompanyItem = await createItem({
      code: 'STK-003',
      name: 'Other Company Item',
      barcode: 'MATCH-003',
      companyId: secondaryCompany._id,
      minimumStock: 1,
    });

    await Inventory.create([
      {
        item: matchingItemA._id,
        warehouse: warehouse._id,
        quantity: 8,
        reservedQuantity: 2,
        batchNumber: 'A-1',
      },
      {
        item: matchingItemB._id,
        warehouse: warehouse._id,
        quantity: 5,
        reservedQuantity: 0,
        batchNumber: 'B-1',
      },
      {
        item: otherCompanyItem._id,
        warehouse: warehouse._id,
        quantity: 6,
        reservedQuantity: 1,
        batchNumber: 'C-1',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/inventory/stock')
      .set(authHeaders())
      .query({
        companyId: primaryCompany._id.toString(),
        search: 'MATCH',
        page: 1,
        limit: 1,
        sortBy: 'itemCode',
        sortOrder: 'asc',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].itemCode).toBe('STK-001');
    expect(response.body.data[0].companyName).toBe('Primary Performance Pharma');
    expect(response.body.pagination).toMatchObject({
      currentPage: 1,
      itemsPerPage: 1,
      totalItems: 2,
      totalPages: 2,
      page: 1,
      limit: 1,
      total: 2,
    });
  });

  it('returns out of stock rows through the mounted stock filter', async () => {
    const emptyItem = await createItem({
      code: 'STK-OUT-001',
      name: 'Out Of Stock Item',
      barcode: 'OUT-001',
      companyId: primaryCompany._id,
    });
    const availableItem = await createItem({
      code: 'STK-IN-001',
      name: 'Available Item',
      barcode: 'IN-001',
      companyId: primaryCompany._id,
    });

    await Inventory.create([
      {
        item: emptyItem._id,
        warehouse: warehouse._id,
        quantity: 0,
        reservedQuantity: 0,
      },
      {
        item: availableItem._id,
        warehouse: warehouse._id,
        quantity: 9,
        reservedQuantity: 1,
      },
    ]);

    const response = await request(app)
      .get('/api/v1/inventory/stock')
      .set(authHeaders())
      .query({ stockStatus: 'out_of_stock' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      itemCode: 'STK-OUT-001',
      quantity: 0,
      availableQuantity: 0,
      companyName: 'Primary Performance Pharma',
    });
    expect(response.body.pagination.totalItems).toBe(1);
  });
});
