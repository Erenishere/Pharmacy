const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Account = require('../src/models/Account');
const Customer = require('../src/models/Customer');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('cashbook lookup API contracts', () => {
  let mongoServer;
  let token;
  let adminUser;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'cashbook-lookups-test-secret';
    process.env.JWT_REFRESH_SECRET = 'cashbook-lookups-test-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'cashbook_lookup_api_contracts' });
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

    await Customer.create([
      {
        code: 'CUST-01',
        name: 'Alpha Medical',
        type: 'customer',
        accountType: 'customer',
        currentBalance: 1250,
        isActive: true,
      },
      {
        code: 'BOTH-01',
        name: 'Bridge Trading',
        type: 'both',
        accountType: 'both',
        currentBalance: 2250,
        isActive: true,
      },
      {
        code: 'SUP-01',
        name: 'Core Supplies',
        type: 'supplier',
        accountType: 'supplier',
        currentBalance: -800,
        isActive: true,
      },
      {
        code: 'OLD-01',
        name: 'Dormant Party',
        type: 'customer',
        accountType: 'customer',
        currentBalance: 500,
        isActive: false,
      },
    ]);

    await Account.create([
      {
        name: 'Cash In Hand',
        code: 'CASH-01',
        accountType: 'asset',
        balance: 10000,
        createdBy: adminUser._id,
        isActive: true,
      },
      {
        name: 'Main Bank',
        code: 'BANK-01',
        accountType: 'asset',
        balance: 45000,
        createdBy: adminUser._id,
        isActive: true,
      },
      {
        name: 'Dormant Asset',
        code: 'OLD-A',
        accountType: 'asset',
        balance: 1,
        createdBy: adminUser._id,
        isActive: false,
      },
      {
        name: 'Sales Revenue',
        code: 'REV-01',
        accountType: 'revenue',
        balance: 5000,
        createdBy: adminUser._id,
        isActive: true,
      },
    ]);

    await User.create([
      {
        username: 'salesman-a',
        email: 'salesman-a@example.com',
        password: 'password123',
        role: 'salesman',
        isActive: true,
      },
      {
        username: 'salesman-b',
        email: 'salesman-b@example.com',
        password: 'password123',
        role: 'salesman',
        isActive: true,
      },
      {
        username: 'manager-a',
        email: 'manager-a@example.com',
        password: 'password123',
        role: 'manager',
        isActive: true,
      },
      {
        username: 'salesman-old',
        email: 'salesman-old@example.com',
        password: 'password123',
        role: 'salesman',
        isActive: false,
      },
    ]);
  });

  it('returns projected receive lookups without supplier-only rows', async () => {
    const response = await request(app)
      .get('/api/v1/cashbook/lookups')
      .query({ transactionType: 'receive' })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Cash book lookups retrieved successfully');
    expect(response.body.data.transactionType).toBe('receive');

    expect(response.body.data.accountOptions.map((item) => item.name)).toEqual([
      'Alpha Medical',
      'Bridge Trading',
    ]);
    expect(response.body.data.cashAccountOptions.map((item) => item.name)).toEqual([
      'Cash In Hand',
      'Main Bank',
    ]);
    expect(response.body.data.salesmen.map((item) => item.name)).toEqual([
      'salesman-a',
      'salesman-b',
    ]);

    expect(response.body.data.accountOptions[0]).toEqual(
      expect.objectContaining({
        code: 'CUST-01',
        balance: 1250,
        accountType: 'customer',
      }),
    );
    expect(response.body.data.accountOptions[0]).not.toHaveProperty('contactInfo');
    expect(response.body.data.cashAccountOptions[0]).not.toHaveProperty('createdAt');
    expect(response.body.data.salesmen[0]).not.toHaveProperty('password');
  });

  it('returns supplier-compatible party lookups for payment mode', async () => {
    const response = await request(app)
      .get('/api/v1/cashbook/lookups')
      .query({ transactionType: 'payment' })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.data.transactionType).toBe('payment');
    expect(response.body.data.accountOptions.map((item) => item.name)).toEqual([
      'Bridge Trading',
      'Core Supplies',
    ]);
    expect(response.body.data.accountOptions[1]).toEqual(
      expect.objectContaining({
        code: 'SUP-01',
        balance: -800,
        accountType: 'supplier',
      }),
    );
  });
});
