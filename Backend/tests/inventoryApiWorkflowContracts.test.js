const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Inventory = require('../src/models/Inventory');
const Item = require('../src/models/Item');
const StockMovement = require('../src/models/StockMovement');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('inventory API source-of-truth workflows', () => {
  let replSet;
  let adminToken;
  let inventoryToken;
  let managerToken;
  let adminUser;
  let inventoryUser;
  let managerUser;
  let item;
  let sourceWarehouse;
  let destinationWarehouse;

  const authHeaders = (token = adminToken) => ({ Authorization: `Bearer ${token}` });

  const createWarehouse = (code, name) => Warehouse.create({
    code,
    name,
    location: {
      address: `${name} Address`,
      city: 'Karachi',
      country: 'Pakistan',
    },
    isActive: true,
  });

  const getInventory = (warehouseId, batchNumber = 'BATCH-API-1') => Inventory.findOne({
    item: item._id,
    warehouse: warehouseId,
    batchNumber,
  });

  const expectGlobalStock = async (expectedStock) => {
    const freshItem = await Item.findById(item._id).lean();
    expect(freshItem.inventory.currentStock).toBe(expectedStock);
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'inventory-api-workflow-test-secret';
    process.env.JWT_REFRESH_SECRET = 'inventory-api-workflow-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'inventory_api_workflow_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    inventoryUser = await User.create({
      username: 'inventory',
      email: 'inventory@example.com',
      password: 'password123',
      role: 'inventory',
    });
    managerUser = await User.create({
      username: 'manager',
      email: 'manager@example.com',
      password: 'password123',
      role: 'manager',
    });

    adminToken = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });
    inventoryToken = authService.generateAccessToken({ userId: inventoryUser._id, role: 'inventory' });
    managerToken = authService.generateAccessToken({ userId: managerUser._id, role: 'manager' });

    item = await Item.create({
      code: 'ITEM-INV-API',
      name: 'Inventory API Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 10,
        salePrice: 12,
      },
      inventory: {
        currentStock: 0,
        minimumStock: 5,
        maximumStock: 100,
      },
      isActive: true,
      status: 'active',
    });

    sourceWarehouse = await createWarehouse('SRCAPI', 'Source Warehouse');
    destinationWarehouse = await createWarehouse('DSTAPI', 'Destination Warehouse');
  });

  it('posts a completed warehouse transfer through the mounted API and reconciles stock records', async () => {
    await Inventory.create({
      item: item._id,
      warehouse: sourceWarehouse._id,
      batchNumber: 'BATCH-API-1',
      quantity: 30,
      reservedQuantity: 0,
    });
    await expectGlobalStock(30);

    const response = await request(app)
      .post('/api/v1/inventory/transfer')
      .set(authHeaders())
      .send({
        itemId: item._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 12,
        batchNumber: 'BATCH-API-1',
        status: 'completed',
        notes: 'API transfer contract',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.transfer.quantity).toBe(12);

    const sourceInventory = await getInventory(sourceWarehouse._id);
    const destinationInventory = await getInventory(destinationWarehouse._id);
    expect(sourceInventory.quantity).toBe(18);
    expect(sourceInventory.availableQuantity).toBe(18);
    expect(destinationInventory.quantity).toBe(12);
    expect(destinationInventory.availableQuantity).toBe(12);
    await expectGlobalStock(30);

    const movements = await StockMovement.find({
      referenceType: 'warehouse_transfer',
      'transferInfo.transferId': response.body.data.transferId,
    }).lean();
    expect(movements).toHaveLength(2);
    expect(movements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: item._id,
        warehouse: sourceWarehouse._id,
        movementType: 'out',
        quantity: -12,
        status: 'completed',
        createdBy: adminUser._id,
      }),
      expect.objectContaining({
        itemId: item._id,
        warehouse: destinationWarehouse._id,
        movementType: 'in',
        quantity: 12,
        status: 'completed',
        createdBy: adminUser._id,
      }),
    ]));
  });

  it('keeps in-transit transfer stock out of destination until the receive endpoint completes it', async () => {
    await Inventory.create({
      item: item._id,
      warehouse: sourceWarehouse._id,
      batchNumber: 'BATCH-API-1',
      quantity: 30,
      reservedQuantity: 0,
    });

    const createResponse = await request(app)
      .post('/api/v1/inventory/transfer')
      .set(authHeaders())
      .send({
        itemId: item._id.toString(),
        fromWarehouseId: sourceWarehouse._id.toString(),
        toWarehouseId: destinationWarehouse._id.toString(),
        quantity: 7,
        batchNumber: 'BATCH-API-1',
        status: 'in_transit',
        notes: 'API transfer in transit',
      })
      .expect(201);

    const transferId = createResponse.body.data.transferId;
    expect((await getInventory(sourceWarehouse._id)).quantity).toBe(23);
    expect(await getInventory(destinationWarehouse._id)).toBeNull();
    await expectGlobalStock(23);

    await request(app)
      .post(`/api/v1/inventory/transfer/${transferId}/receive`)
      .set(authHeaders())
      .expect(200);

    expect((await getInventory(sourceWarehouse._id)).quantity).toBe(23);
    expect((await getInventory(destinationWarehouse._id)).quantity).toBe(7);
    await expectGlobalStock(30);

    const movements = await StockMovement.find({
      referenceType: 'warehouse_transfer',
      'transferInfo.transferId': transferId,
    }).lean();
    expect(movements).toHaveLength(2);
    expect(movements.every((movement) => movement.status === 'completed')).toBe(true);
  });

  it('runs stock adjustment approval through the API without changing Inventory before approval', async () => {
    await Inventory.create({
      item: item._id,
      warehouse: sourceWarehouse._id,
      batchNumber: 'BATCH-API-1',
      quantity: 30,
      reservedQuantity: 0,
    });

    const createResponse = await request(app)
      .post('/api/v1/inventory/adjustment')
      .set(authHeaders(inventoryToken))
      .send({
        itemId: item._id.toString(),
        warehouseId: sourceWarehouse._id.toString(),
        adjustmentType: 'decrease',
        quantity: 20,
        reason: 'damage',
        notes: 'Large damaged stock adjustment requires approval',
        batchNumber: 'BATCH-API-1',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.requiresApproval).toBe(true);
    expect(createResponse.body.adjustment.newStock).toBe(30);
    expect((await getInventory(sourceWarehouse._id)).quantity).toBe(30);
    await expectGlobalStock(30);

    const adjustmentId = createResponse.body.adjustmentId;
    const pendingMovement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    }).lean();
    expect(pendingMovement).toEqual(expect.objectContaining({
      itemId: item._id,
      warehouse: sourceWarehouse._id,
      movementType: 'out',
      quantity: -20,
      status: 'pending',
      approvalStatus: 'pending_approval',
      createdBy: inventoryUser._id,
    }));

    const approveResponse = await request(app)
      .patch(`/api/v1/inventory/adjustment/${adjustmentId}/approve`)
      .set(authHeaders(managerToken))
      .send({ notes: 'Verified damaged stock' })
      .expect(200);

    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.adjustment.newStock).toBe(10);
    expect((await getInventory(sourceWarehouse._id)).quantity).toBe(10);
    await expectGlobalStock(10);

    const approvedMovement = await StockMovement.findOne({
      referenceType: 'adjustment',
      referenceId: adjustmentId,
    }).lean();
    expect(approvedMovement.status).toBe('completed');
    expect(approvedMovement.approvalStatus).toBe('approved');
    expect(approvedMovement.approvedBy).toEqual(managerUser._id);
  });
});
