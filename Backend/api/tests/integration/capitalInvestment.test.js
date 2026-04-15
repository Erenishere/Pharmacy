const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

describe('Capital Investment API Integration Tests', () => {
  let authToken;
  let adminToken;

  beforeAll(() => {
    authToken = generateToken({ id: 'user1', role: 'accountant' });
    adminToken = generateToken({ id: 'admin1', role: 'admin' });
  });

  describe('Investor Endpoints', () => {
    describe('POST /api/v1/investors', () => {
      it('should create investor account', async () => {
        const investorData = {
          name: 'Test Investor',
          code: 'INV001',
          contactPerson: 'John Doe',
          phone: '1234567890',
          email: 'investor@example.com',
          address: '123 Main St',
          openingBalance: 100000,
        };

        const response = await request(app)
          .post('/api/v1/investors')
          .set('Authorization', `Bearer ${authToken}`)
          .send(investorData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Test Investor');
        expect(response.body.data.type).toBe('equity');
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/v1/investors')
          .send({ name: 'Test' })
          .expect(401);
      });
    });

    describe('GET /api/v1/investors', () => {
      it('should return all investors', async () => {
        const response = await request(app)
          .get('/api/v1/investors')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/investors/:id', () => {
      it('should return investor by ID', async () => {
        const response = await request(app)
          .get('/api/v1/investors/investor1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name');
      });

      it('should return 404 for invalid ID', async () => {
        const response = await request(app)
          .get('/api/v1/investors/invalid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/investors/:id', () => {
      it('should update investor account', async () => {
        const updateData = {
          contactPerson: 'Jane Doe',
          phone: '9876543210',
        };

        const response = await request(app)
          .put('/api/v1/investors/investor1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/v1/investors/:id', () => {
      it('should require admin role', async () => {
        await request(app)
          .delete('/api/v1/investors/investor1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });

      it('should deactivate investor with admin role', async () => {
        const response = await request(app)
          .delete('/api/v1/investors/investor1')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/v1/investors/:id/statement', () => {
      it('should return investor statement', async () => {
        const response = await request(app)
          .get('/api/v1/investors/investor1/statement')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('investor');
        expect(response.body.data).toHaveProperty('transactions');
        expect(response.body.data).toHaveProperty('openingBalance');
        expect(response.body.data).toHaveProperty('closingBalance');
      });

      it('should require date parameters', async () => {
        const response = await request(app)
          .get('/api/v1/investors/investor1/statement')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });
});
