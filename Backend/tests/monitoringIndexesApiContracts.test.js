const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('monitoring index API contracts', () => {
  let mongoServer;
  let token;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'monitoring-indexes-test-secret';
    process.env.JWT_REFRESH_SECRET = 'monitoring-indexes-test-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'monitoring_indexes_api_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });
  });

  it('exposes the documented monitoring index snapshot route', async () => {
    const response = await request(app)
      .get('/api/v1/monitoring/indexes')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.some((entry) => entry.collection === 'users')).toBe(true);
  });
});
