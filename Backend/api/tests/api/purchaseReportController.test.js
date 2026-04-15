const request = require('supertest');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const User = require('../../src/models/User');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Purchase Report Controller API Tests', () => {
  let authToken;
  let adminUser;
  let testSupplier;
  let testItem;
  let testInvoice;
  let testPurchaseOrder;

  beforeAll(async () => {
    // Create admin user
    adminUser = await User.create({
      username: 'admin_purchase_reports',
      email: 'admin_purchase_reports@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    // Generate auth token
    authToken = jwt.sign(
      { _id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // Create test supplier
    testSupplier = await Supplier.create({
      name: 'Test Supplier Ltd',
      code: 'SUP001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      town: 'Karachi',
      advanceTaxStatus: 'filer',
      isActive: true
    });

    // Create test item
    testItem = await Item.create({
      name: 'Test Medicine',
      code: 'MED001',
      category: 'Medicines',
      unit: 'box',
      boxPacking: 10,
      gstRate: 18,
      isActive: true,
      categoryId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      companyId: new mongoose.Types.ObjectId(),
      pricing: {
        salePrice: 150,
        costPrice: 100
      }
    });

    // Create test purchase invoice
    testInvoice = await Invoice.create({
      invoiceNumber: 'PI2025000001',
      type: 'purchase',
      invoiceDate: new Date('2025-01-15'),
      dueDate: new Date('2025-02-15'),
      supplierBillNo: 'BILL-001',
      supplierId: testSupplier._id,
      supplierName: testSupplier.name,
      items: [
        {
          itemId: testItem._id,
          itemName: testItem.name,
          quantity: 100,
          boxQuantity: 10,
          unitQuantity: 0,
          boxTP: 1000,
          unitTP: 100,
          unitPrice: 100,
          gstRate: 18,
          gstAmount: 1800,
          gst18Amount: 1800,
          gst4Amount: 0,
          lineTotal: 11800
        }
      ],
      totals: {
        subtotal: 10000,
        grossTotal: 10000,
        gst18Total: 1800,
        gst4Total: 0,
        gstTotal: 1800,
        grandTotal: 11800
      },
      status: 'confirmed',
      createdBy: adminUser._id
    });

    // Create test purchase order
    testPurchaseOrder = await PurchaseOrder.create({
      poNumber: 'PO2025000001',
      poDate: new Date('2025-01-10'),
      supplierId: testSupplier._id,
      supplierName: testSupplier.name,
      items: [
        {
          itemId: testItem._id,
          itemName: testItem.name,
          boxQty: 5,
          unitQty: 0,
          boxTP: 1000,
          unitTP: 100,
          netAmount: 5000
        }
      ],
      totalAmount: 5000,
      status: 'sent',
      createdBy: adminUser._id
    });
  });

  afterAll(async () => {
    // Cleanup
    await Invoice.deleteMany({ invoiceNumber: /^PI2025/ });
    await PurchaseOrder.deleteMany({ poNumber: /^PO2025/ });
    await Supplier.deleteMany({ code: 'SUP001' });
    await Item.deleteMany({ code: 'MED001' });
    await User.deleteMany({ username: 'admin_purchase_reports' });
  });

  describe('GET /api/v1/purchase-reports/summary', () => {
    it('should return purchase summary report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalInvoices');
      expect(response.body.data).toHaveProperty('purchaseInvoices');
      expect(response.body.data).toHaveProperty('returnInvoices');
      expect(response.body.data).toHaveProperty('totalPurchaseAmount');
      expect(response.body.data).toHaveProperty('gstSummary');
      expect(response.body.data.gstSummary).toHaveProperty('gst18');
      expect(response.body.data.gstSummary).toHaveProperty('gst4');
      expect(response.body.data.gstSummary).toHaveProperty('totalGST');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/summary');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/purchase-reports/by-supplier', () => {
    it('should return purchase by supplier report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/by-supplier')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const supplier = response.body.data[0];
        expect(supplier).toHaveProperty('supplierName');
        expect(supplier).toHaveProperty('invoiceCount');
        expect(supplier).toHaveProperty('totalAmount');
        expect(supplier).toHaveProperty('totalGST');
      }
    });
  });

  describe('GET /api/v1/purchase-reports/by-item', () => {
    it('should return purchase by item report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/by-item')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const item = response.body.data[0];
        expect(item).toHaveProperty('itemName');
        expect(item).toHaveProperty('totalQuantity');
        expect(item).toHaveProperty('totalAmount');
        expect(item).toHaveProperty('totalGST');
      }
    });
  });

  describe('GET /api/v1/purchase-reports/analysis', () => {
    it('should return purchase analysis report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('costAnalysis');
      expect(response.body.data).toHaveProperty('schemeAnalysis');
      expect(response.body.data).toHaveProperty('discountAnalysis');
      expect(response.body.data).toHaveProperty('taxAnalysis');
      
      expect(response.body.data.costAnalysis).toHaveProperty('totalPurchaseValue');
      expect(response.body.data.costAnalysis).toHaveProperty('averageCostPerUnit');
      
      expect(response.body.data.taxAnalysis).toHaveProperty('gst18');
      expect(response.body.data.taxAnalysis).toHaveProperty('gst4');
      expect(response.body.data.taxAnalysis).toHaveProperty('totalGST');
    });
  });

  describe('GET /api/v1/purchase-reports/gst-input-summary', () => {
    it('should return GST input summary with dual rates', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/gst-input-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gst18');
      expect(response.body.data).toHaveProperty('gst4');
      expect(response.body.data).toHaveProperty('totalInputGST');
      expect(response.body.data).toHaveProperty('advanceTax');
      expect(response.body.data).toHaveProperty('nonFilerGST');
    });
  });

  describe('GET /api/v1/purchase-reports/supplier-aging', () => {
    it('should return supplier aging report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/supplier-aging')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suppliers');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.suppliers)).toBe(true);
      
      expect(response.body.data.summary).toHaveProperty('current');
      expect(response.body.data.summary).toHaveProperty('1-30');
      expect(response.body.data.summary).toHaveProperty('31-60');
      expect(response.body.data.summary).toHaveProperty('61-90');
      expect(response.body.data.summary).toHaveProperty('>90');
    });
  });

  describe('GET /api/v1/purchase-reports/payment-due', () => {
    it('should return payment due report', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/payment-due')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateTo: '2025-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invoices');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.invoices)).toBe(true);
      
      expect(response.body.data.summary).toHaveProperty('totalInvoices');
      expect(response.body.data.summary).toHaveProperty('totalDueAmount');
      expect(response.body.data.summary).toHaveProperty('overdueCount');
      expect(response.body.data.summary).toHaveProperty('overdueAmount');
    });
  });

  describe('GET /api/v1/purchase-reports/vs-sales', () => {
    it('should return purchase vs sales comparison', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/vs-sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparison');
      expect(Array.isArray(response.body.data.comparison)).toBe(true);
      
      if (response.body.data.comparison.length > 0) {
        const monthData = response.body.data.comparison[0];
        expect(monthData).toHaveProperty('month');
        expect(monthData).toHaveProperty('purchase');
        expect(monthData).toHaveProperty('sales');
        expect(monthData).toHaveProperty('difference');
        
        expect(monthData.purchase).toHaveProperty('amount');
        expect(monthData.purchase).toHaveProperty('gst18');
        expect(monthData.purchase).toHaveProperty('gst4');
      }
    });
  });

  describe('GET /api/v1/purchase-reports/outstanding-pos', () => {
    it('should return outstanding purchase orders', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/outstanding-pos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      
      expect(response.body.data.summary).toHaveProperty('totalOrders');
      expect(response.body.data.summary).toHaveProperty('totalAmount');
      expect(response.body.data.summary).toHaveProperty('byStatus');
    });

    it('should filter by supplier', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/outstanding-pos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          supplierId: testSupplier._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/purchase-reports/export', () => {
    it('should export summary report to CSV', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'summary',
          format: 'csv',
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('summary');
    });

    it('should export by-supplier report to Excel', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'by-supplier',
          format: 'excel',
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('by-supplier');
    });

    it('should export analysis report to PDF', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'analysis',
          format: 'pdf',
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('analysis');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate format', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'summary',
          format: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate report type', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'invalid',
          format: 'csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authorization Tests', () => {
    let purchaseUser;
    let purchaseToken;

    beforeAll(async () => {
      purchaseUser = await User.create({
        username: 'purchase_user',
        email: 'purchase@test.com',
        password: 'password123',
        role: 'accountant',
        isActive: true
      });

      purchaseToken = jwt.sign(
        { _id: purchaseUser._id, role: purchaseUser.role },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );
    });

    afterAll(async () => {
      await User.deleteMany({ username: 'purchase_user' });
    });

    it('should allow accountant role to access summary', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/summary')
        .set('Authorization', `Bearer ${purchaseToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow accountant role to access by-supplier', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-reports/by-supplier')
        .set('Authorization', `Bearer ${purchaseToken}`);

      expect(response.status).toBe(200);
    });
  });
});
