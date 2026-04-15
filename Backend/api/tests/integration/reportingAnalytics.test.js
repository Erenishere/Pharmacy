const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

describe('Reporting & Analytics API Integration Tests', () => {
  let authToken;
  let adminToken;

  beforeAll(() => {
    authToken = generateToken({ id: 'user1', role: 'manager' });
    adminToken = generateToken({ id: 'admin1', role: 'admin' });
  });

  describe('Dashboard Endpoints', () => {
    describe('GET /api/v1/dashboard/kpis', () => {
      it('should return KPIs for date range', async () => {
        const response = await request(app)
          .get('/api/v1/dashboard/kpis')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('sales');
        expect(response.body.data).toHaveProperty('purchases');
        expect(response.body.data).toHaveProperty('inventory');
        expect(response.body.data).toHaveProperty('customers');
      });

      it('should return 400 if dates missing', async () => {
        const response = await request(app)
          .get('/api/v1/dashboard/kpis')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('required');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get('/api/v1/dashboard/kpis')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .expect(401);
      });
    });

    describe('GET /api/v1/dashboard/sales-trend', () => {
      it('should return sales trend', async () => {
        const response = await request(app)
          .get('/api/v1/dashboard/sales-trend')
          .query({ months: 6 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('trends');
        expect(Array.isArray(response.body.data.trends)).toBe(true);
      });
    });

    describe('GET /api/v1/dashboard/top-items', () => {
      it('should return top performing items', async () => {
        const response = await request(app)
          .get('/api/v1/dashboard/top-items')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31', limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('items');
      });
    });
  });

  describe('Inventory Report Endpoints', () => {
    describe('GET /api/v1/reports/inventory/stock-level', () => {
      it('should return stock level report', async () => {
        const response = await request(app)
          .get('/api/v1/reports/inventory/stock-level')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportType).toBe('stock_level');
        expect(response.body.data).toHaveProperty('stockLevels');
        expect(response.body.data).toHaveProperty('summary');
      });

      it('should filter by warehouse', async () => {
        const response = await request(app)
          .get('/api/v1/reports/inventory/stock-level')
          .query({ warehouseId: 'wh1' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/v1/reports/inventory/stock-movement', () => {
      it('should return stock movement report', async () => {
        const response = await request(app)
          .get('/api/v1/reports/inventory/stock-movement')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportType).toBe('stock_movement');
      });
    });

    describe('GET /api/v1/reports/inventory/batch-expiry', () => {
      it('should return batch expiry report', async () => {
        const response = await request(app)
          .get('/api/v1/reports/inventory/batch-expiry')
          .query({ daysAhead: 90 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportType).toBe('batch_expiry');
      });
    });
  });

  describe('Tax Report Endpoints', () => {
    describe('GET /api/v1/reports/tax/gst-sales', () => {
      it('should return GST sales report', async () => {
        const response = await request(app)
          .get('/api/v1/reports/tax/gst-sales')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportType).toBe('gst_sales');
      });

      it('should require admin/accountant role', async () => {
        const userToken = generateToken({ id: 'user1', role: 'salesman' });

        await request(app)
          .get('/api/v1/reports/tax/gst-sales')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/reports/tax/compliance-summary', () => {
      it('should return tax compliance summary', async () => {
        const response = await request(app)
          .get('/api/v1/reports/tax/compliance-summary')
          .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('netGSTPayable');
        expect(response.body.data).toHaveProperty('totalTaxLiability');
      });
    });
  });
});
