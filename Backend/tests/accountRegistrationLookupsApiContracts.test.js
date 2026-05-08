const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const AccountHead = require('../src/models/accountHead');
const CustomerType = require('../src/models/customertype');
const Designation = require('../src/models/designation');
const DimensionBranch = require('../src/models/dimensionbranch');
const Town = require('../src/models/town');
const User = require('../src/models/User');
const { CacheManager } = require('../src/utils/cache');

jest.setTimeout(120000);

describe('account registration lookup API contracts', () => {
  let mongoServer;
  let token;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'account-registration-lookups-test-secret';
    process.env.JWT_REFRESH_SECRET = 'account-registration-lookups-test-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'account_registration_lookup_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await CacheManager.clearAll();
    await mongoose.connection.db.dropDatabase();

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    await DimensionBranch.create([
      {
        code: 'SOUTH',
        name: 'South Branch',
        type: 'BRANCH',
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'NORTH',
        name: 'North Branch',
        type: 'BRANCH',
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'OLD',
        name: 'Old Branch',
        type: 'BRANCH',
        isActive: false,
        createdBy: adminUser._id,
      },
    ]);

    await Designation.create([
      { name: 'Pharmacist', isActive: true },
      { name: 'Area Manager', isActive: true },
      { name: 'Dormant Designation', isActive: false },
    ]);

    await CustomerType.create([
      { name: 'Retailer', isActive: true },
      { name: 'Distributor', isActive: true },
      { name: 'Dormant Type', isActive: false },
    ]);

    await AccountHead.create([
      { name: 'Capital Head', code: 'CAP', type: 'Capital', isActive: true },
      { name: 'Cash Head', code: 'CASH', type: 'Cash', isActive: true },
      { name: 'Dormant Head', code: 'OLDH', type: 'Expenses', isActive: false },
    ]);

    await Town.create([
      { name: 'Lahore', region: 'Punjab', isActive: true },
      { name: 'Karachi', region: 'Sindh', isActive: true },
      { name: 'Dormant Town', region: 'Retired', isActive: false },
    ]);
  });

  it('returns a projected active lookup bundle for account registration boot', async () => {
    const response = await request(app)
      .get('/api/v1/accounts/registration-lookups')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Account registration lookups retrieved successfully');

    expect(response.body.data.dimensions.map((item) => item.name)).toEqual([
      'North Branch',
      'South Branch',
    ]);
    expect(response.body.data.designations.map((item) => item.name)).toEqual([
      'Area Manager',
      'Pharmacist',
    ]);
    expect(response.body.data.customerTypes.map((item) => item.name)).toEqual([
      'Distributor',
      'Retailer',
    ]);
    expect(response.body.data.accountHeads.map((item) => item.name)).toEqual([
      'Capital Head',
      'Cash Head',
    ]);
    expect(response.body.data.towns.map((item) => item.name)).toEqual([
      'Karachi',
      'Lahore',
    ]);

    expect(response.body.data.dimensions[0]).not.toHaveProperty('createdAt');
    expect(response.body.data.accountHeads[0]).not.toHaveProperty('createdAt');
    expect(response.body.data.towns[0]).not.toHaveProperty('updatedAt');
  });

  it('serves warm lookup reads from cache and invalidates on supporting-data mutation', async () => {
    const firstResponse = await request(app)
      .get('/api/v1/accounts/registration-lookups')
      .set(authHeaders());

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers['x-cache']).toBe('MISS');

    const warmResponse = await request(app)
      .get('/api/v1/accounts/registration-lookups')
      .set(authHeaders());

    expect(warmResponse.status).toBe(200);
    expect(warmResponse.headers['x-cache']).toBe('HIT');
    expect(warmResponse.body.data.designations.map((item) => item.name)).toEqual([
      'Area Manager',
      'Pharmacist',
    ]);

    const createDesignationResponse = await request(app)
      .post('/api/v1/designations')
      .send({ name: 'Warehouse Coordinator', isActive: true });

    expect(createDesignationResponse.status).toBe(200);

    const refreshedResponse = await request(app)
      .get('/api/v1/accounts/registration-lookups')
      .set(authHeaders());

    expect(refreshedResponse.status).toBe(200);
    expect(refreshedResponse.headers['x-cache']).toBe('MISS');
    expect(refreshedResponse.body.data.designations.map((item) => item.name)).toEqual([
      'Area Manager',
      'Pharmacist',
      'Warehouse Coordinator',
    ]);
  });
});
