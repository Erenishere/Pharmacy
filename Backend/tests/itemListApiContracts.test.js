const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Category = require('../src/models/Category');
const Company = require('../src/models/Company');
const Item = require('../src/models/Item');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('item list API contracts', () => {
  let mongoServer;
  let token;
  let companyA;
  let categoryA;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'item-list-test-secret';
    process.env.JWT_REFRESH_SECRET = 'item-list-test-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'item_list_api_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    companyA = await Company.create({
      name: 'Alpha Pharma',
      code: 'ALPHA',
      groupType: 'A',
      isActive: true,
    });
    const companyB = await Company.create({
      name: 'Beta Labs',
      code: 'BETA',
      groupType: 'B',
      isActive: true,
    });
    categoryA = await Category.create({
      name: 'Antibiotics',
      code: 'ANTI',
      isActive: true,
    });
    const categoryB = await Category.create({
      name: 'Analgesics',
      code: 'ANAL',
      isActive: true,
    });

    await Item.create([
      {
        code: 'ITEM-A',
        name: 'A Item',
        companyId: companyA._id,
        categoryId: categoryA._id,
        businessTypeId: new mongoose.Types.ObjectId(),
        unit: 'piece',
        pricing: {
          costPrice: 10,
          purchasePrice: 12,
          salePrice: 18,
          retailPrice: 20,
        },
        inventory: {
          currentStock: 5,
          minimumStock: 10,
        },
        isActive: true,
      },
      {
        code: 'ITEM-B',
        name: 'B Item',
        companyId: companyB._id,
        categoryId: categoryB._id,
        businessTypeId: new mongoose.Types.ObjectId(),
        unit: 'piece',
        pricing: {
          costPrice: 20,
          purchasePrice: 25,
          salePrice: 30,
          retailPrice: 35,
        },
        inventory: {
          currentStock: 20,
          minimumStock: 5,
        },
        isActive: true,
      },
      {
        code: 'ITEM-C',
        name: 'C Item',
        companyId: companyA._id,
        categoryId: categoryB._id,
        businessTypeId: new mongoose.Types.ObjectId(),
        unit: 'piece',
        pricing: {
          costPrice: 5,
          purchasePrice: 7,
          salePrice: 9,
          retailPrice: 11,
        },
        inventory: {
          currentStock: 12,
          minimumStock: 12,
        },
        isActive: true,
      },
    ]);
  });

  it('sorts items by supported stock and price fields through the mounted list contract', async () => {
    const stockSortedResponse = await request(app)
      .get('/api/v1/items')
      .query({ sortBy: 'currentStock', sortOrder: 'desc', page: 1, limit: 3 })
      .set(authHeaders());

    expect(stockSortedResponse.status).toBe(200);
    expect(stockSortedResponse.body.pagination).toMatchObject({
      currentPage: 1,
      itemsPerPage: 3,
      totalItems: 3,
      totalPages: 1,
    });
    expect(stockSortedResponse.body.data.map((item) => item.code)).toEqual([
      'ITEM-B',
      'ITEM-C',
      'ITEM-A',
    ]);

    const priceSortedResponse = await request(app)
      .get('/api/v1/items')
      .query({ sortBy: 'unitRetailPrice', sortOrder: 'asc', page: 1, limit: 2 })
      .set(authHeaders());

    expect(priceSortedResponse.status).toBe(200);
    expect(priceSortedResponse.body.pagination).toMatchObject({
      currentPage: 1,
      itemsPerPage: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(priceSortedResponse.body.data.map((item) => item.code)).toEqual([
      'ITEM-C',
      'ITEM-A',
    ]);
  });

  it('treats keyword searches as literal text and keeps pagination bounded', async () => {
    await Item.create({
      code: 'ITEM-SPECIAL',
      name: 'Pain+Relief (500)',
      companyId: companyA._id,
      categoryId: categoryA._id,
      businessTypeId: new mongoose.Types.ObjectId(),
      unit: 'piece',
      pricing: {
        costPrice: 11,
        purchasePrice: 12,
        salePrice: 16,
        retailPrice: 18,
      },
      inventory: {
        currentStock: 8,
        minimumStock: 2,
      },
      isActive: true,
    });

    const response = await request(app)
      .get('/api/v1/items')
      .query({
        keyword: 'Pain+Relief (',
        page: '0',
        limit: '500',
      })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({
      currentPage: 1,
      itemsPerPage: 100,
      totalItems: 1,
    });
    expect(response.body.data.map((item) => item.code)).toEqual(['ITEM-SPECIAL']);
  });

  it('declares compound indexes for the common item list filter and sort paths', () => {
    const indexFields = Item.schema.indexes().map(([fields]) => fields);

    expect(indexFields).toContainEqual({ isActive: 1, name: 1, _id: 1 });
    expect(indexFields).toContainEqual({ isActive: 1, code: 1, _id: 1 });
    expect(indexFields).toContainEqual({ isActive: 1, 'inventory.currentStock': -1, _id: 1 });
    expect(indexFields).toContainEqual({ isActive: 1, 'pricing.retailPrice': 1, _id: 1 });
    expect(indexFields).toContainEqual({ companyId: 1, isActive: 1, name: 1 });
    expect(indexFields).toContainEqual({ categoryId: 1, isActive: 1, name: 1 });
  });
});
