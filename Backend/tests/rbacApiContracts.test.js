const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { authorize } = require('../src/middleware/auth');
const User = require('../src/models/User');
const Salesman = require('../src/models/Salesman');
const RoutePlan = require('../src/models/RoutePlan');

jest.setTimeout(120000);

const createMockResponse = () => ({
  req: {
    originalUrl: '/test',
    method: 'GET',
  },
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe('rbac backend contracts', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'rbac-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'rbac-api-test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'rbac_api_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  const loginAs = async (identifier, password) => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier, password })
      .expect(200);

    return response.body.data.accessToken;
  };

  it('accepts variadic role arguments in authorize()', () => {
    const middleware = authorize('admin', 'sales', 'accountant');
    const req = { user: { role: 'sales' } };
    const res = createMockResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('normalizes legacy role aliases in authorize()', () => {
    const middleware = authorize(['admin', 'inventory_manager']);
    const req = { user: { role: 'inventory' } };
    const res = createMockResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('allows salesman users to open their self-service profile', async () => {
    const salesmanUser = await User.create({
      username: 'field.salesman',
      email: 'field.salesman@example.com',
      password: 'FieldPass123',
      role: 'salesman',
      isActive: true,
    });

    await Salesman.create({
      code: 'SM1001',
      name: 'Field Salesman',
      userId: salesmanUser._id,
      isActive: true,
      createdBy: salesmanUser._id,
    });

    const accessToken = await loginAs('field.salesman', 'FieldPass123');

    const response = await request(app)
      .get('/api/v1/salesmen/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.userId.toString()).toBe(salesmanUser._id.toString());
  });

  it('blocks non-sales users from salesman directory endpoints', async () => {
    await User.create({
      username: 'finance.user',
      email: 'finance.user@example.com',
      password: 'FinancePass123',
      role: 'accountant',
      isActive: true,
    });

    const accessToken = await loginAs('finance.user', 'FinancePass123');

    const response = await request(app)
      .get('/api/v1/salesmen')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('limits salesman route-plan reads to the logged-in user', async () => {
    const manager = await User.create({
      username: 'route.manager',
      email: 'route.manager@example.com',
      password: 'ManagerPass123',
      role: 'manager',
      isActive: true,
    });

    const salesmanOne = await User.create({
      username: 'sales.one',
      email: 'sales.one@example.com',
      password: 'SalesPass123',
      role: 'salesman',
      isActive: true,
    });

    const salesmanTwo = await User.create({
      username: 'sales.two',
      email: 'sales.two@example.com',
      password: 'SalesPass123',
      role: 'salesman',
      isActive: true,
    });

    await Salesman.create({
      code: 'SM2001',
      name: 'Sales One',
      userId: salesmanOne._id,
      isActive: true,
      createdBy: manager._id,
    });

    await Salesman.create({
      code: 'SM2002',
      name: 'Sales Two',
      userId: salesmanTwo._id,
      isActive: true,
      createdBy: manager._id,
    });

    await RoutePlan.create({
      monthYear: '2026-05',
      salesmanId: salesmanOne._id,
      salesTarget: 10,
      recoveryTarget: 5,
      visitTarget: 3,
      days: [],
      createdBy: manager._id,
    });

    await RoutePlan.create({
      monthYear: '2026-05',
      salesmanId: salesmanTwo._id,
      salesTarget: 20,
      recoveryTarget: 10,
      visitTarget: 6,
      days: [],
      createdBy: manager._id,
    });

    const accessToken = await loginAs('sales.one', 'SalesPass123');

    const response = await request(app)
      .get('/api/v1/route-plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].salesmanId._id.toString()).toBe(salesmanOne._id.toString());
    expect(response.body.data[0].salesmanDisplayName).toBe('Sales One');
  });
});
