const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const BiltyReceipt = require('../src/models/BiltyReceipt');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('bilty receipt API contracts', () => {
  let mongoServer;
  let token;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'bilty-receipt-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'bilty-receipt-api-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'bilty_receipt_api_contracts' });
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

  it('creates a standalone bilty receipt and transitions status through the mounted status route', async () => {
    const createResponse = await request(app)
      .post('/api/v1/bilty-receipts')
      .set(authHeaders())
      .send({
        biltyType: 'send',
        biltyDate: '2024-05-10T10:00:00.000Z',
        biltyNo: 'BILTY-001',
        transporterName: 'Speed Logistics',
        agentName: 'Ali',
        agentAmount: 500,
        biltyAmount: 2500,
        nugDetail: [
          { nugType: 'Single', qtyNug: 2 },
          { nugType: 'Double', qtyNug: 1 }
        ]
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toEqual(expect.objectContaining({
      biltyType: 'send',
      status: 'pending',
      totalNug: 4,
    }));

    const receiptId = createResponse.body.data._id;

    const statusResponse = await request(app)
      .patch(`/api/v1/bilty-receipts/${receiptId}/status`)
      .set(authHeaders())
      .send({ status: 'sent' })
      .expect(200);

    expect(statusResponse.body.success).toBe(true);
    expect(statusResponse.body.data.status).toBe('sent');

    const persisted = await BiltyReceipt.findById(receiptId).lean();
    expect(persisted.status).toBe('sent');

    const listResponse = await request(app)
      .get('/api/v1/bilty-receipts?status=sent')
      .set(authHeaders())
      .expect(200);

    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]._id).toBe(receiptId);
  });

  it('rejects invalid bilty receipt status updates', async () => {
    const receipt = await BiltyReceipt.create({
      biltyType: 'receive',
      biltyDate: new Date('2024-05-12T10:00:00.000Z'),
      biltyNo: 'BILTY-002',
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const response = await request(app)
      .patch(`/api/v1/bilty-receipts/${receipt._id}/status`)
      .set(authHeaders())
      .send({ status: 'closed' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/Status must be one of/i);
  });
});
