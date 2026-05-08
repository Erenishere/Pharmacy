const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Account = require('../src/models/Account');
const Capital = require('../src/models/Capital');
const Inventory = require('../src/models/Inventory');
const Item = require('../src/models/Item');
const LedgerEntry = require('../src/models/LedgerEntry');
const User = require('../src/models/User');
const Warehouse = require('../src/models/Warehouse');

jest.setTimeout(120000);

describe('capital API contracts', () => {
  let mongoServer;
  let token;
  let adminUser;
  let cashAccount;
  let investorAccount;
  let warehouse;
  let item;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'capital-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'capital-api-refresh-test-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'capital_api_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    cashAccount = await Account.create({
      code: 'CASH-001',
      name: 'Main Cash',
      accountType: 'asset',
      balance: 10000,
      isActive: true,
    });

    investorAccount = await Account.create({
      code: 'INV-001',
      name: 'Primary Investor',
      accountType: 'equity',
      balance: 20000,
      isActive: true,
    });

    warehouse = await Warehouse.create({
      code: 'CAP01',
      name: 'Capital Warehouse',
      location: {
        address: 'Capital Warehouse Address',
        city: 'Karachi',
        country: 'Pakistan',
      },
      isActive: true,
    });

    item = await Item.create({
      code: 'ITEM-CAP',
      name: 'Capital Stock Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 25,
        salePrice: 40,
      },
      inventory: {
        currentStock: 10,
        minimumStock: 0,
      },
      isActive: true,
      status: 'active',
    });

    await Inventory.create({
      item: item._id,
      warehouse: warehouse._id,
      quantity: 10,
      reservedQuantity: 0,
      available: 10,
    });
  });

  it('creates capital in/out entries, updates balances and ledger, and returns a non-placeholder capital statement', async () => {
    const capitalInResponse = await request(app)
      .post('/api/v1/capital')
      .set(authHeaders())
      .send({
        capitalDate: '2024-05-03T10:00:00.000Z',
        capitalAssetName: 'Delivery Van',
        cashAccountId: cashAccount._id.toString(),
        investorAccountId: investorAccount._id.toString(),
        transactionType: 'in',
        amount: 5000,
        detailReference: 'Initial capital injection',
        status: 'Investor',
      })
      .expect(201);

    expect(capitalInResponse.body.data).toEqual(expect.objectContaining({
      cashAccountName: 'Main Cash',
      investorAccountName: 'Primary Investor',
      cashAccountBalance: 10000,
      investorAccountBalance: 20000,
      transactionType: 'in',
      amount: 5000,
      effectiveAmount: 5000,
    }));

    const capitalOutResponse = await request(app)
      .post('/api/v1/capital')
      .set(authHeaders())
      .send({
        capitalDate: '2024-05-10T10:00:00.000Z',
        capitalAssetName: 'Delivery Van',
        cashAccountId: cashAccount._id.toString(),
        investorAccountId: investorAccount._id.toString(),
        transactionType: 'out',
        amount: 1200,
        detailReference: 'Partial withdrawal',
        status: 'Investor',
      })
      .expect(201);

    const capitalOutId = capitalOutResponse.body.data._id;

    const listResponse = await request(app)
      .get('/api/v1/capital?page=1&limit=10')
      .set(authHeaders())
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toHaveLength(2);

    const refreshedCash = await Account.findById(cashAccount._id).lean();
    const refreshedInvestor = await Account.findById(investorAccount._id).lean();
    expect(refreshedCash.balance).toBe(13800);
    expect(refreshedInvestor.balance).toBe(23800);
    expect(await LedgerEntry.countDocuments({ referenceType: 'capital' })).toBe(4);

    const statementResponse = await request(app)
      .get('/api/v1/capital/statement?asOfDate=2024-05-31')
      .set(authHeaders())
      .expect(200);

    expect(statementResponse.body.success).toBe(true);
    expect(statementResponse.body.data.capitalSummary).toEqual(expect.objectContaining({
      totalCapitalIn: 5000,
      totalCapitalOut: 1200,
      runningCapital: 3800,
      proprietorCapital: 0,
      investorCapital: 3800,
      totalEntries: 2,
    }));
    expect(statementResponse.body.data).toEqual(expect.objectContaining({
      bankCash: 0,
      cashInHand: 13800,
      stockValue: 250,
      receivables: 0,
      payables: 0,
      fixedAssets: 5000,
      netCapital: 3800,
    }));
    expect(statementResponse.body.data.fixedCapitalList).toHaveLength(1);
    expect(statementResponse.body.data.fixedCapitalList[0].capitalAssetName).toBe('Delivery Van');
    expect(statementResponse.body.data.runningCapitalList[1].runningCapital).toBe(3800);

    await request(app)
      .delete(`/api/v1/capital/${capitalOutId}`)
      .set(authHeaders())
      .expect(200);

    const cashAfterDelete = await Account.findById(cashAccount._id).lean();
    const investorAfterDelete = await Account.findById(investorAccount._id).lean();
    expect(cashAfterDelete.balance).toBe(15000);
    expect(investorAfterDelete.balance).toBe(25000);
    expect(await Capital.countDocuments()).toBe(1);
    expect(await LedgerEntry.countDocuments({ referenceType: 'capital' })).toBe(2);

    const statementAfterDelete = await request(app)
      .get('/api/v1/capital/statement?asOfDate=2024-05-31')
      .set(authHeaders())
      .expect(200);

    expect(statementAfterDelete.body.data.capitalSummary).toEqual(expect.objectContaining({
      totalCapitalIn: 5000,
      totalCapitalOut: 0,
      runningCapital: 5000,
      totalEntries: 1,
    }));
    expect(statementAfterDelete.body.data.netCapital).toBe(5000);
  });

  it('rejects capital withdrawals that exceed the selected cash account balance', async () => {
    const response = await request(app)
      .post('/api/v1/capital')
      .set(authHeaders())
      .send({
        capitalDate: '2024-05-10T10:00:00.000Z',
        capitalAssetName: 'Emergency Withdrawal',
        cashAccountId: cashAccount._id.toString(),
        investorAccountId: investorAccount._id.toString(),
        transactionType: 'out',
        amount: 15000,
        status: 'Investor',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/Insufficient cash balance/i);
    expect(await Capital.countDocuments()).toBe(0);
    expect(await LedgerEntry.countDocuments()).toBe(0);
  });
});
