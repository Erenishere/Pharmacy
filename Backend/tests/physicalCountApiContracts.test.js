const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Inventory = require('../src/models/Inventory');
const Item = require('../src/models/Item');
const PhysicalCount = require('../src/models/PhysicalCount');
const StockMovement = require('../src/models/StockMovement');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('physical count API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let warehouse;
  let item;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'physical-count-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'physical-count-api-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'physical_count_api_contracts' });
    await Promise.all([
      Inventory.init(),
      Item.init(),
      PhysicalCount.init(),
      StockMovement.init(),
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
      Inventory.deleteMany({}),
      Item.deleteMany({}),
      PhysicalCount.deleteMany({}),
      StockMovement.deleteMany({}),
      User.deleteMany({}),
      Warehouse.deleteMany({}),
    ]);

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    warehouse = await Warehouse.create({
      code: 'PHYAPI',
      name: 'Physical Count Warehouse',
      location: {
        address: 'Physical Count Street',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });

    item = await Item.create({
      code: 'ITEM-PHY-API',
      name: 'Physical Count Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 10,
        salePrice: 15,
      },
      inventory: {
        currentStock: 0,
        minimumStock: 0,
        maximumStock: 100,
      },
      isActive: true,
      status: 'active',
    });
  });

  const expectGlobalStock = async (expectedStock) => {
    const freshItem = await Item.findById(item._id).lean();
    expect(freshItem.inventory.currentStock).toBe(expectedStock);
  };

  it('creates, lists, approves, and reports a physical count through the mounted API', async () => {
    await Inventory.create({
      item: item._id,
      warehouse: warehouse._id,
      quantity: 10,
      reservedQuantity: 0,
    });
    await expectGlobalStock(10);

    const createResponse = await request(app)
      .post('/api/v1/inventory/physical-count')
      .set(authHeaders())
      .send({
        warehouseId: warehouse._id.toString(),
        countDate: '2024-05-06T10:00:00.000Z',
        notes: 'Shelf audit contract test',
        items: [{
          itemId: item._id.toString(),
          countedQuantity: 6,
        }],
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toEqual(expect.objectContaining({
      status: 'completed',
      warehouseId: warehouse._id.toString(),
      notes: 'Shelf audit contract test',
    }));
    expect(createResponse.body.data.items[0]).toEqual(expect.objectContaining({
      itemId: item._id.toString(),
      systemQuantity: 10,
      countedQuantity: 6,
      variance: -4,
    }));

    const countId = createResponse.body.data._id;

    const listResponse = await request(app)
      .get('/api/v1/inventory/physical-count')
      .set(authHeaders())
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.pagination.totalItems).toBe(1);
    expect(listResponse.body.data[0]).toEqual(expect.objectContaining({
      _id: countId,
      status: 'completed',
    }));

    await request(app)
      .post(`/api/v1/inventory/physical-count/${countId}/approve`)
      .set(authHeaders())
      .expect(200);

    const updatedInventory = await Inventory.findOne({
      item: item._id,
      warehouse: warehouse._id,
    }).lean();
    expect(updatedInventory.quantity).toBe(6);
    expect(updatedInventory.available).toBe(6);
    await expectGlobalStock(6);

    const count = await PhysicalCount.findById(countId).lean();
    expect(count.status).toBe('approved');
    expect(count.approvalInfo.approvedBy).toEqual(adminUser._id);

    const movement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: count._id,
    }).lean();
    expect(movement).toEqual(expect.objectContaining({
      itemId: item._id,
      warehouse: warehouse._id,
      movementType: 'out',
      quantity: -4,
      createdBy: adminUser._id,
    }));

    const varianceResponse = await request(app)
      .get('/api/v1/inventory/reports/variance')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString() })
      .expect(200);

    expect(varianceResponse.body.success).toBe(true);
    expect(varianceResponse.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        countNumber: count.countNumber,
        warehouse: warehouse.name,
        systemStock: 10,
        physicalStock: 6,
        variance: -4,
        approved: true,
      }),
    ]));

    const discrepancyResponse = await request(app)
      .get('/api/v1/inventory/reports/discrepancies')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), limit: 10 })
      .expect(200);

    expect(discrepancyResponse.body.success).toBe(true);
    expect(discrepancyResponse.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        countNumber: count.countNumber,
        warehouse: warehouse.name,
        itemId: item._id.toString(),
        itemCode: item.code,
        variance: -4,
        varianceType: 'shortage',
      }),
    ]));
  });

  it('cancels an unapproved physical count without changing inventory', async () => {
    await Inventory.create({
      item: item._id,
      warehouse: warehouse._id,
      quantity: 14,
      reservedQuantity: 0,
    });
    await expectGlobalStock(14);

    const createResponse = await request(app)
      .post('/api/v1/inventory/physical-count')
      .set(authHeaders())
      .send({
        warehouseId: warehouse._id.toString(),
        countDate: '2024-05-06T10:00:00.000Z',
        items: [{
          itemId: item._id.toString(),
          countedQuantity: 14,
        }],
      })
      .expect(201);

    const countId = createResponse.body.data._id;

    const cancelResponse = await request(app)
      .post(`/api/v1/inventory/physical-count/${countId}/cancel`)
      .set(authHeaders())
      .send({ reason: 'User cancelled before posting' })
      .expect(200);

    expect(cancelResponse.body.success).toBe(true);
    expect(cancelResponse.body.data.status).toBe('cancelled');

    const inventory = await Inventory.findOne({
      item: item._id,
      warehouse: warehouse._id,
    }).lean();
    expect(inventory.quantity).toBe(14);
    await expectGlobalStock(14);
    expect(await StockMovement.countDocuments({ referenceId: countId })).toBe(0);
  });
});
