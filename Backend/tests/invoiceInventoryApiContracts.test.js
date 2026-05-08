const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Batch = require('../src/models/Batch');
const Customer = require('../src/models/Customer');
const Inventory = require('../src/models/Inventory');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const LedgerEntry = require('../src/models/LedgerEntry');
const StockMovement = require('../src/models/StockMovement');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('invoice API inventory reconciliation workflows', () => {
  let replSet;
  let token;
  let adminUser;
  let customer;
  let supplier;
  let item;
  let warehouse;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const expectStock = async ({ inventoryQuantity, itemStock, batchRemaining }) => {
    const inventory = await Inventory.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'INV-BATCH-1' }).lean();
    const freshItem = await Item.findById(item._id).lean();
    const batch = await Batch.findOne({ item: item._id, warehouse: warehouse._id, batchNumber: 'INV-BATCH-1' }).lean();

    expect(inventory.quantity).toBe(inventoryQuantity);
    expect(freshItem.inventory.currentStock).toBe(itemStock);
    expect(batch.remainingQuantity).toBe(batchRemaining);
  };

  const createSalesInvoice = () => Invoice.create({
    invoiceNumber: 'SI-API-STOCK-001',
    type: 'sales',
    status: 'draft',
    paymentStatus: 'pending',
    invoiceDate: new Date('2024-05-06T10:00:00.000Z'),
    dueDate: new Date('2024-05-20T10:00:00.000Z'),
    customerId: customer._id,
    customerName: customer.name,
    items: [{
      itemId: item._id,
      itemName: item.name,
      itemCode: item.code,
      warehouseId: warehouse._id,
      batchInfo: {
        batchNumber: 'INV-BATCH-1',
        expiryDate: new Date('2099-01-01T00:00:00.000Z'),
      },
      boxQty: 0,
      unitQty: 4,
      totalUnitQty: 4,
      scheme1Quantity: 1,
      scheme2Quantity: 0,
      quantity: 4,
      unitPrice: 25,
      unitTP: 25,
      lineTotal: 100,
      netAmount: 100,
    }],
    totals: {
      subtotal: 100,
      grossTotal: 100,
      discountTotal: 0,
      gstTotal: 0,
      advanceTaxTotal: 0,
      netBillTotal: 100,
      grandTotal: 100,
      paidAmount: 0,
      dueAmount: 100,
    },
    createdBy: adminUser._id,
  });

  const createPurchaseInvoice = () => Invoice.create({
    invoiceNumber: 'PI-API-STOCK-001',
    type: 'purchase',
    status: 'draft',
    paymentStatus: 'pending',
    invoiceDate: new Date('2024-05-06T10:00:00.000Z'),
    dueDate: new Date('2024-05-20T10:00:00.000Z'),
    supplierId: supplier._id,
    supplierBillNo: 'SUP-BILL-API-001',
    items: [{
      itemId: item._id,
      itemName: item.name,
      warehouseId: warehouse._id,
      quantity: 6,
      unitPrice: 20,
      lineTotal: 120,
      batchInfo: {
        batchNumber: 'INV-BATCH-1',
        manufacturingDate: new Date('2026-01-01T00:00:00.000Z'),
        expiryDate: new Date('2099-01-01T00:00:00.000Z'),
      },
    }],
    totals: {
      subtotal: 120,
      grossTotal: 120,
      totalTax: 0,
      netBillTotal: 120,
      grandTotal: 120,
      paidAmount: 0,
      dueAmount: 120,
    },
    createdBy: adminUser._id,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'invoice-inventory-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'invoice-inventory-api-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'invoice_inventory_api_contracts' });
    await Promise.all([
      Batch.init(),
      Customer.init(),
      Inventory.init(),
      Invoice.init(),
      Item.init(),
      LedgerEntry.init(),
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
      Customer.deleteMany({}),
      Inventory.deleteMany({}),
      Invoice.deleteMany({}),
      Item.deleteMany({}),
      LedgerEntry.deleteMany({}),
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

    customer = await Customer.create({
      code: 'CUST-INV-API',
      name: 'Invoice API Customer',
      type: 'regular',
      accountType: 'customer',
      currentBalance: 0,
      isActive: true,
    });
    supplier = await Supplier.create({
      code: 'SUP-INV-API',
      name: 'Invoice API Supplier',
      type: 'supplier',
      isActive: true,
    });
    warehouse = await Warehouse.create({
      code: 'INVAPI',
      name: 'Invoice API Warehouse',
      location: {
        address: 'Invoice API Warehouse Address',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });
    item = await Item.create({
      code: 'ITEM-INV-API',
      name: 'Invoice API Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 20,
        salePrice: 25,
      },
      inventory: {
        currentStock: 20,
        minimumStock: 2,
        maximumStock: 100,
      },
      isActive: true,
      status: 'active',
    });

    await Inventory.create({
      item: item._id,
      warehouse: warehouse._id,
      batchNumber: 'INV-BATCH-1',
      quantity: 20,
      reservedQuantity: 0,
    });
    await Batch.create({
      batchNumber: 'INV-BATCH-1',
      item: item._id,
      warehouse: warehouse._id,
      supplier: supplier._id,
      manufacturingDate: new Date('2026-01-01T00:00:00.000Z'),
      expiryDate: new Date('2099-01-01T00:00:00.000Z'),
      quantity: 20,
      remainingQuantity: 20,
      unitCost: 20,
      totalCost: 400,
      status: 'active',
      createdBy: adminUser._id,
    });
  });

  it('confirms and cancels a sales invoice through mounted APIs while reconciling stock and audit rows', async () => {
    const invoice = await createSalesInvoice();

    await request(app)
      .patch(`/api/v1/invoices/sales/${invoice._id}/confirm`)
      .set(authHeaders())
      .expect(200);

    await expectStock({ inventoryQuantity: 15, itemStock: 15, batchRemaining: 15 });
    expect((await Invoice.findById(invoice._id).lean()).status).toBe('confirmed');
    expect((await Customer.findById(customer._id).lean()).currentBalance).toBe(118);

    await request(app)
      .patch(`/api/v1/invoices/sales/${invoice._id}/cancel`)
      .set(authHeaders())
      .send({ reason: 'API stock reconciliation test' })
      .expect(200);

    await expectStock({ inventoryQuantity: 20, itemStock: 20, batchRemaining: 20 });
    expect((await Invoice.findById(invoice._id).lean()).status).toBe('cancelled');
    expect((await Customer.findById(customer._id).lean()).currentBalance).toBe(0);

    const movements = await StockMovement.find({ referenceId: invoice._id }).sort({ movementDate: 1 }).lean();
    expect(movements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceType: 'sales_invoice',
        movementType: 'out',
        quantity: -5,
        warehouse: warehouse._id,
      }),
      expect.objectContaining({
        referenceType: 'sales_invoice_cancellation',
        movementType: 'in',
        quantity: 5,
        warehouse: warehouse._id,
      }),
    ]));
    expect(await LedgerEntry.countDocuments({ referenceId: invoice._id })).toBeGreaterThan(0);
  });

  it('confirms and cancels a purchase invoice through mounted APIs while reconciling stock and supplier ledger', async () => {
    const invoice = await createPurchaseInvoice();

    await request(app)
      .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
      .set(authHeaders())
      .expect(200);

    await expectStock({ inventoryQuantity: 26, itemStock: 26, batchRemaining: 26 });
    expect((await Invoice.findById(invoice._id).lean()).status).toBe('confirmed');

    await request(app)
      .patch(`/api/v1/invoices/purchase/${invoice._id}/cancel`)
      .set(authHeaders())
      .send({ reason: 'API stock reconciliation test' })
      .expect(200);

    await expectStock({ inventoryQuantity: 20, itemStock: 20, batchRemaining: 20 });
    expect((await Invoice.findById(invoice._id).lean()).status).toBe('cancelled');

    const movements = await StockMovement.find({ referenceId: invoice._id }).sort({ movementDate: 1 }).lean();
    expect(movements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceType: 'purchase_invoice',
        movementType: 'in',
        quantity: 6,
        warehouse: warehouse._id,
      }),
      expect.objectContaining({
        referenceType: 'purchase_invoice_cancellation',
        movementType: 'out',
        quantity: -6,
        warehouse: warehouse._id,
      }),
    ]));

    const ledgerEntries = await LedgerEntry.find({ accountId: supplier._id, accountType: 'Supplier' }).lean();
    expect(ledgerEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ transactionType: 'credit', amount: 141.6 }),
      expect.objectContaining({ transactionType: 'debit', amount: 141.6 }),
    ]));
  });
});
