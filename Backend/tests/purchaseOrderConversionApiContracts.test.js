const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Batch = require('../src/models/Batch');
const Inventory = require('../src/models/Inventory');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const LedgerEntry = require('../src/models/LedgerEntry');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const StockMovement = require('../src/models/StockMovement');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('purchase order conversion API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let supplier;
  let item;
  let warehouse;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'po-conversion-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'po-conversion-api-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'po_conversion_api_contracts' });
    await Promise.all([
      Batch.init(),
      Inventory.init(),
      Invoice.init(),
      Item.init(),
      LedgerEntry.init(),
      PurchaseOrder.init(),
      StockMovement.init(),
      Supplier.init(),
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
      LedgerEntry.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      StockMovement.deleteMany({}),
      Supplier.deleteMany({}),
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

    supplier = await Supplier.create({
      code: 'SUP-PO-API',
      name: 'PO API Supplier',
      type: 'supplier',
      isActive: true,
    });
    warehouse = await Warehouse.create({
      code: 'POAPI',
      name: 'PO API Warehouse',
      location: {
        address: 'PO API Warehouse Address',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });
    item = await Item.create({
      code: 'ITEM-PO-API',
      name: 'PO API Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 10,
        salePrice: 15,
      },
      tax: {
        gstRate: 0,
        whtRate: 0,
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

  const createConfirmedPurchaseOrder = () => PurchaseOrder.create({
    poNumber: 'PO-API-CONVERT-001',
    poDate: new Date('2024-05-06T10:00:00.000Z'),
    supplierId: supplier._id,
    supplierName: supplier.name,
    status: 'confirmed',
    confirmedAt: new Date('2024-05-06T10:00:00.000Z'),
    items: [{
      itemId: item._id,
      itemName: item.name,
      boxPacking: 5,
      boxQty: 1,
      unitQty: 2,
      boxTP: 50,
      unitTP: 10,
      discount: 0,
    }],
    createdBy: adminUser._id,
  });

  it('converts a confirmed PO to a draft purchase invoice and reconciles fulfillment on confirm/cancel', async () => {
    const purchaseOrder = await createConfirmedPurchaseOrder();

    const convertResponse = await request(app)
      .patch(`/api/v1/purchase-orders/${purchaseOrder._id}/convert`)
      .set(authHeaders())
      .send({
        warehouseId: warehouse._id.toString(),
        supplierBillNo: 'PO-CONVERT-BILL-001',
        invoiceDate: '2024-05-06T10:00:00.000Z',
        dueDate: '2024-05-20T10:00:00.000Z',
        batchInfo: {
          batchNumber: 'PO-CONVERT-BATCH-1',
          manufacturingDate: '2024-01-01T00:00:00.000Z',
          expiryDate: '2099-01-01T00:00:00.000Z',
        },
      })
      .expect(201);

    const invoiceId = convertResponse.body.data._id;
    const convertedInvoice = await Invoice.findById(invoiceId).lean();
    expect(convertedInvoice).toEqual(expect.objectContaining({
      type: 'purchase',
      status: 'draft',
      supplierBillNo: 'PO-CONVERT-BILL-001',
      poNumber: 'PO-API-CONVERT-001',
    }));
    expect(convertedInvoice.poId.toString()).toBe(purchaseOrder._id.toString());
    expect(convertedInvoice.items[0]).toEqual(expect.objectContaining({
      quantity: 7,
      unitPrice: 10,
      warehouseId: warehouse._id,
    }));
    expect(convertedInvoice.items[0].batchInfo.batchNumber).toBe('PO-CONVERT-BATCH-1');

    let freshPo = await PurchaseOrder.findById(purchaseOrder._id).lean();
    expect(freshPo.convertedInvoiceId.toString()).toBe(invoiceId.toString());
    expect(freshPo.status).toBe('received');
    expect(freshPo.fulfillmentStatus).toBe('pending');
    expect(freshPo.items[0].receivedQuantity).toBe(0);
    expect(freshPo.items[0].pendingQuantity).toBe(7);

    await request(app)
      .patch(`/api/v1/invoices/purchase/${invoiceId}/confirm`)
      .set(authHeaders())
      .expect(200);

    freshPo = await PurchaseOrder.findById(purchaseOrder._id).lean();
    expect(freshPo.fulfillmentStatus).toBe('fulfilled');
    expect(freshPo.items[0].receivedQuantity).toBe(7);
    expect(freshPo.items[0].pendingQuantity).toBe(0);

    const inventory = await Inventory.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'PO-CONVERT-BATCH-1' }).lean();
    const batch = await Batch.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'PO-CONVERT-BATCH-1' }).lean();
    expect(inventory.quantity).toBe(7);
    expect(batch.remainingQuantity).toBe(7);
    expect((await Item.findById(item._id).lean()).inventory.currentStock).toBe(7);
    expect(await StockMovement.countDocuments({ referenceId: invoiceId, referenceType: 'purchase_invoice' })).toBe(1);

    await request(app)
      .patch(`/api/v1/invoices/purchase/${invoiceId}/cancel`)
      .set(authHeaders())
      .send({ reason: 'PO conversion reconciliation test' })
      .expect(200);

    freshPo = await PurchaseOrder.findById(purchaseOrder._id).lean();
    expect(freshPo.fulfillmentStatus).toBe('pending');
    expect(freshPo.items[0].receivedQuantity).toBe(0);
    expect(freshPo.items[0].pendingQuantity).toBe(7);
    expect((await Inventory.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'PO-CONVERT-BATCH-1' }).lean()).quantity).toBe(0);
    expect((await Batch.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'PO-CONVERT-BATCH-1' }).lean()).remainingQuantity).toBe(0);
    expect((await Item.findById(item._id).lean()).inventory.currentStock).toBe(0);
    expect(await StockMovement.countDocuments({ referenceId: invoiceId, referenceType: 'purchase_invoice_cancellation' })).toBe(1);
  });
});
