const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Batch = require('../src/models/Batch');
const Inventory = require('../src/models/Inventory');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const StockMovement = require('../src/models/StockMovement');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('inventory report read API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let warehouse;
  let lowItem;
  let outItem;
  let healthyItem;
  let lowBatchManufacturingDate;
  let healthyBatchManufacturingDate;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const createItem = (code, name, costPrice, inventoryOverrides = {}) => Item.create({
    code,
    name,
    companyId: new mongoose.Types.ObjectId(),
    businessTypeId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(),
    category: 'General',
    unit: 'piece',
    pricing: {
      costPrice,
      salePrice: costPrice + 5,
    },
    inventory: {
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 100,
      reorderPoint: 0,
      ...inventoryOverrides,
    },
    isActive: true,
    status: 'active',
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'inventory-report-read-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'inventory-report-read-api-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'inventory_report_read_api_contracts' });
    await Promise.all([
      Batch.init(),
      Inventory.init(),
      Invoice.init(),
      Item.init(),
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
      Batch.deleteMany({}),
      Inventory.deleteMany({}),
      Invoice.deleteMany({}),
      Item.deleteMany({}),
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
      code: 'RPTINV',
      name: 'Inventory Report Warehouse',
      location: {
        address: 'Inventory Report Street',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });

    lowItem = await createItem('ITEM-RPT-LOW', 'Low Stock Item', 10, {
      minimumStock: 5,
      reorderPoint: 7,
    });
    outItem = await createItem('ITEM-RPT-OUT', 'Out Stock Item', 20, {
      minimumStock: 2,
      reorderPoint: 4,
    });
    healthyItem = await createItem('ITEM-RPT-OK', 'Healthy Stock Item', 8, {
      minimumStock: 2,
      reorderPoint: 5,
    });

    lowBatchManufacturingDate = new Date(Date.now() - (45 * 24 * 60 * 60 * 1000));
    healthyBatchManufacturingDate = new Date(Date.now() - (120 * 24 * 60 * 60 * 1000));

    await Inventory.create({
      item: lowItem._id,
      warehouse: warehouse._id,
      batchNumber: 'LOW-B1',
      quantity: 4,
      reservedQuantity: 1,
    });
    await Inventory.create({
      item: outItem._id,
      warehouse: warehouse._id,
      quantity: 0,
      reservedQuantity: 0,
    });
    await Inventory.create({
      item: healthyItem._id,
      warehouse: warehouse._id,
      batchNumber: 'OK-B1',
      quantity: 12,
      reservedQuantity: 2,
    });

    const lowBatch = await Batch.create({
      batchNumber: 'LOW-B1',
      item: lowItem._id,
      warehouse: warehouse._id,
      manufacturingDate: lowBatchManufacturingDate,
      expiryDate: new Date('2099-01-01T00:00:00.000Z'),
      quantity: 4,
      remainingQuantity: 4,
      unitCost: 10,
      totalCost: 40,
      createdBy: adminUser._id,
    });
    const healthyBatch = await Batch.create({
      batchNumber: 'OK-B1',
      item: healthyItem._id,
      warehouse: warehouse._id,
      manufacturingDate: healthyBatchManufacturingDate,
      expiryDate: new Date('2099-01-01T00:00:00.000Z'),
      quantity: 12,
      remainingQuantity: 12,
      unitCost: 8,
      totalCost: 96,
      createdBy: adminUser._id,
    });

    await Batch.updateOne(
      { _id: lowBatch._id },
      { $set: { createdAt: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)) } },
    );
    await Batch.updateOne(
      { _id: healthyBatch._id },
      { $set: { createdAt: new Date(Date.now() - (120 * 24 * 60 * 60 * 1000)) } },
    );

    await StockMovement.create({
      itemId: lowItem._id,
      warehouse: warehouse._id,
      movementType: 'out',
      quantity: 6,
      referenceType: 'sales_invoice',
      referenceId: new mongoose.Types.ObjectId(),
      createdBy: adminUser._id,
      movementDate: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)),
    });
    await StockMovement.create({
      itemId: lowItem._id,
      warehouse: warehouse._id,
      movementType: 'in',
      quantity: 2,
      referenceType: 'purchase_invoice',
      referenceId: new mongoose.Types.ObjectId(),
      createdBy: adminUser._id,
      movementDate: new Date(Date.now() - (4 * 24 * 60 * 60 * 1000)),
    });

    await Invoice.create({
      invoiceNumber: 'SI-RPT-READ-001',
      type: 'sales',
      customerId: new mongoose.Types.ObjectId(),
      invoiceDate: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)),
      dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
      items: [{
        itemId: lowItem._id,
        itemName: lowItem.name,
        quantity: 2,
        unitPrice: 15,
        lineTotal: 30,
        warehouseId: warehouse._id,
      }],
      totals: {
        subtotal: 30,
        grossTotal: 30,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: 30,
        netBillTotal: 30,
        paidAmount: 30,
        dueAmount: 0,
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      createdBy: adminUser._id,
    });
  });

  it('reconciles summary, warehouse stock, low-stock, and movement reads against inventory truth', async () => {
    const summaryResponse = await request(app)
      .get('/api/v1/inventory/stock/overview')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString() })
      .expect(200);

    expect(summaryResponse.body.success).toBe(true);
    expect(summaryResponse.body.data).toEqual(expect.objectContaining({
      totalItems: 3,
      totalQuantity: 16,
      totalReserved: 3,
      totalAvailable: 13,
      totalInventoryValue: 136,
      lowStockCount: 1,
      outOfStockCount: 1,
      totalCategories: 3,
    }));

    const warehouseResponse = await request(app)
      .get('/api/v1/inventory/stock/warehouse')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString() })
      .expect(200);

    expect(warehouseResponse.body.success).toBe(true);
    expect(warehouseResponse.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        warehouseId: warehouse._id.toString(),
        warehouseName: warehouse.name,
        batchNumber: 'LOW-B1',
        quantity: 4,
        reservedQuantity: 1,
        availableQuantity: 3,
        totalValue: 40,
      }),
      expect.objectContaining({
        itemId: healthyItem._id.toString(),
        batchNumber: 'OK-B1',
        quantity: 12,
        reservedQuantity: 2,
        availableQuantity: 10,
        totalValue: 96,
      }),
    ]));

    const lowStockResponse = await request(app)
      .get('/api/v1/inventory/reports/low-stock')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), limit: 10 })
      .expect(200);

    expect(lowStockResponse.body.success).toBe(true);
    expect(lowStockResponse.body.data.total).toBe(2);
    expect(lowStockResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        itemCode: 'ITEM-RPT-LOW',
        currentStock: 3,
        minimumLevel: 5,
        reorderLevel: 7,
      }),
      expect.objectContaining({
        itemId: outItem._id.toString(),
        itemCode: 'ITEM-RPT-OUT',
        currentStock: 0,
        minimumLevel: 2,
        reorderLevel: 4,
      }),
    ]));

    const movementResponse = await request(app)
      .get('/api/v1/inventory/movements')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), itemId: lowItem._id.toString() })
      .expect(200);

    expect(movementResponse.body.success).toBe(true);
    expect(movementResponse.body.movements).toHaveLength(2);
    expect(movementResponse.body.summary).toEqual(expect.objectContaining({
      totalMovements: 2,
      inwardMovements: 1,
      outwardMovements: 1,
      totalInwardQty: 2,
      totalOutwardQty: 6,
    }));
  });

  it('builds aging buckets and flattened rows from batch-level stock', async () => {
    const agingResponse = await request(app)
      .get('/api/v1/inventory/reports/aging')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString() })
      .expect(200);

    expect(agingResponse.body.success).toBe(true);
    expect(agingResponse.body.data.totalBatches).toBe(2);
    expect(agingResponse.body.data.brackets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '31-60',
        count: 1,
        quantity: 4,
        totalValue: 40,
      }),
      expect.objectContaining({
        label: '91-180',
        count: 1,
        quantity: 12,
        totalValue: 96,
      }),
    ]));
    expect(agingResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        itemCode: 'ITEM-RPT-LOW',
        warehouseName: warehouse.name,
        batchNumber: 'LOW-B1',
        quantity: 4,
        bracket: '31-60',
      }),
      expect.objectContaining({
        itemId: healthyItem._id.toString(),
        itemCode: 'ITEM-RPT-OK',
        batchNumber: 'OK-B1',
        quantity: 12,
        bracket: '91-180',
      }),
    ]));
  });

  it('reconciles fast, slow, dead, reorder, and turnover reports against canonical stock and sales data', async () => {
    const turnoverStart = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)).toISOString();
    const turnoverEnd = new Date().toISOString();

    const fastMovingResponse = await request(app)
      .get('/api/v1/inventory/reports/fast-moving')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), days: 30, limit: 10 })
      .expect(200);

    expect(fastMovingResponse.body.success).toBe(true);
    expect(fastMovingResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        itemCode: 'ITEM-RPT-LOW',
        warehouseId: warehouse._id.toString(),
        totalSold: 6,
        currentStock: 3,
      }),
    ]));

    const slowMovingResponse = await request(app)
      .get('/api/v1/inventory/reports/slow-moving')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), days: 30, limit: 10 })
      .expect(200);

    expect(slowMovingResponse.body.success).toBe(true);
    expect(slowMovingResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: healthyItem._id.toString(),
        itemCode: 'ITEM-RPT-OK',
        warehouseId: warehouse._id.toString(),
        currentStock: 10,
      }),
    ]));
    expect(slowMovingResponse.body.data.items.some((row) => row.itemId === lowItem._id.toString())).toBe(false);

    const deadStockResponse = await request(app)
      .get('/api/v1/inventory/reports/dead-stock')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), days: 30, limit: 10 })
      .expect(200);

    expect(deadStockResponse.body.success).toBe(true);
    expect(deadStockResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: healthyItem._id.toString(),
        itemCode: 'ITEM-RPT-OK',
        warehouseId: warehouse._id.toString(),
        currentStock: 10,
      }),
    ]));
    expect(deadStockResponse.body.data.items.some((row) => row.itemId === lowItem._id.toString())).toBe(false);

    const reorderResponse = await request(app)
      .get('/api/v1/inventory/reports/reorder-suggestions')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), limit: 10 })
      .expect(200);

    expect(reorderResponse.body.success).toBe(true);
    expect(reorderResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        itemCode: 'ITEM-RPT-LOW',
        currentStock: 3,
        reorderLevel: 7,
        suggestedOrderQuantity: 4,
      }),
      expect.objectContaining({
        itemId: outItem._id.toString(),
        itemCode: 'ITEM-RPT-OUT',
        currentStock: 0,
        reorderLevel: 4,
        suggestedOrderQuantity: 4,
      }),
    ]));

    const turnoverResponse = await request(app)
      .get('/api/v1/inventory/reports/turnover')
      .set(authHeaders())
      .query({
        warehouseId: warehouse._id.toString(),
        startDate: turnoverStart,
        endDate: turnoverEnd,
      })
      .expect(200);

    expect(turnoverResponse.body.success).toBe(true);
    expect(turnoverResponse.body.data).toEqual(expect.objectContaining({
      soldQuantity: 2,
      costOfGoodsSold: 20,
      inventoryValue: 136,
      stockQuantity: 16,
    }));
    expect(turnoverResponse.body.data.turnoverRatio).toBeCloseTo(20 / 136, 5);
    expect(turnoverResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: lowItem._id.toString(),
        itemCode: 'ITEM-RPT-LOW',
        soldQuantity: 2,
        costOfGoodsSold: 20,
      }),
    ]));
  });

  it('reports current stockouts through the mounted stockout-history route', async () => {
    const stockoutResponse = await request(app)
      .get('/api/v1/inventory/reports/stockout-history')
      .set(authHeaders())
      .query({ warehouseId: warehouse._id.toString(), days: 30, limit: 10 })
      .expect(200);

    expect(stockoutResponse.body.success).toBe(true);
    expect(stockoutResponse.body.data.total).toBe(1);
    expect(stockoutResponse.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: outItem._id.toString(),
        itemCode: 'ITEM-RPT-OUT',
        itemName: 'Out Stock Item',
        warehouseId: warehouse._id.toString(),
        warehouseName: warehouse.name,
        currentStock: 0,
        daysSinceLastMovement: 30,
        stockoutSince: null,
      }),
    ]));
    expect(stockoutResponse.body.data.items.some((row) => row.itemId === lowItem._id.toString())).toBe(false);
  });
});
