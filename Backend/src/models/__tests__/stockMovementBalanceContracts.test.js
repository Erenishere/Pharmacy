const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const StockMovement = require('../StockMovement');
const Item = require('../Item');
const User = require('../User');
const Warehouse = require('../Warehouse');
const stockMovementRepository = require('../../repositories/stockMovementRepository');

jest.setTimeout(120000);

describe('StockMovement balance contracts', () => {
  let mongoServer;
  let item;
  let sourceWarehouse;
  let destinationWarehouse;
  let user;
  let asOfDate;

  const getBalanceByWarehouseCode = (rows) => rows.reduce((acc, row) => {
    acc[row.warehouse.code] = row.balance ?? row.quantity;
    return acc;
  }, {});

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'stock_movement_balance_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await StockMovement.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await Warehouse.deleteMany({});

    user = await User.create({
      username: 'stock-user',
      email: 'stock-user@example.com',
      password: 'password123',
      role: 'admin',
    });

    item = await Item.create({
      code: 'BAL-ITEM',
      name: 'Balance Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'piece',
      pricing: {
        costPrice: 50,
        salePrice: 100,
      },
      isActive: true,
    });

    sourceWarehouse = await Warehouse.create({
      code: 'SRC',
      name: 'Source Warehouse',
      location: {
        address: 'Source Address',
        city: 'Karachi',
        country: 'Pakistan',
      },
    });

    destinationWarehouse = await Warehouse.create({
      code: 'DST',
      name: 'Destination Warehouse',
      location: {
        address: 'Destination Address',
        city: 'Lahore',
        country: 'Pakistan',
      },
    });

    const transferId = new mongoose.Types.ObjectId();
    const purchaseInvoiceId = new mongoose.Types.ObjectId();
    const salesInvoiceId = new mongoose.Types.ObjectId();
    const movementDate = new Date('2026-05-05T10:00:00.000Z');
    asOfDate = new Date('2026-05-06T00:00:00.000Z');

    await StockMovement.create([
      {
        itemId: item._id,
        warehouse: sourceWarehouse._id,
        movementType: 'in',
        quantity: 100,
        referenceType: 'purchase_invoice',
        referenceId: purchaseInvoiceId,
        movementDate,
        status: 'completed',
        createdBy: user._id,
      },
      {
        itemId: item._id,
        warehouse: sourceWarehouse._id,
        movementType: 'out',
        quantity: 30,
        referenceType: 'warehouse_transfer',
        transferInfo: {
          toWarehouse: destinationWarehouse._id,
          transferId,
        },
        movementDate,
        status: 'completed',
        createdBy: user._id,
      },
      {
        itemId: item._id,
        warehouse: destinationWarehouse._id,
        movementType: 'in',
        quantity: 30,
        referenceType: 'warehouse_transfer',
        transferInfo: {
          fromWarehouse: sourceWarehouse._id,
          transferId,
        },
        movementDate,
        status: 'completed',
        createdBy: user._id,
      },
      {
        itemId: item._id,
        warehouse: destinationWarehouse._id,
        movementType: 'out',
        quantity: 10,
        referenceType: 'sales_invoice',
        referenceId: salesInvoiceId,
        movementDate,
        status: 'completed',
        createdBy: user._id,
      },
    ]);
  });

  it('attributes completed transfers to the source and destination warehouses correctly', async () => {
    const balances = await StockMovement.calculateStockBalance(item._id, null, asOfDate);

    expect(getBalanceByWarehouseCode(balances)).toEqual({
      SRC: 70,
      DST: 20,
    });
  });

  it('does not include outbound transfer rows in the destination warehouse balance query', async () => {
    const balances = await StockMovement.calculateStockBalance(
      item._id,
      destinationWarehouse._id,
      asOfDate,
    );

    expect(balances).toHaveLength(1);
    expect(balances[0].warehouse.code).toBe('DST');
    expect(balances[0].balance).toBe(20);
  });

  it('keeps repository argument order as item, as-of date, optional warehouse', async () => {
    const balances = await stockMovementRepository.calculateStockBalance(item._id, asOfDate);

    expect(getBalanceByWarehouseCode(balances)).toEqual({
      SRC: 70,
      DST: 20,
    });
  });

  it('returns positive per-warehouse item stock levels after transfers and sales', async () => {
    const stockLevels = await StockMovement.getItemStockLevels(item._id);

    expect(getBalanceByWarehouseCode(stockLevels)).toEqual({
      SRC: 70,
      DST: 20,
    });
  });
});
