const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Customer = require('../src/models/Customer');
const Invoice = require('../src/models/Invoice');
const Inventory = require('../src/models/Inventory');
const Item = require('../src/models/Item');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('report, print, export, and dashboard API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let customer;
  let supplier;
  let item;
  let salesInvoice;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });
  const periodQuery = 'startDate=2024-05-01&endDate=2024-05-31';

  const parseBinary = (res, callback) => {
    res.setEncoding('binary');
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => callback(null, Buffer.from(data, 'binary')));
  };

  const expectNoPlaceholderText = (payload) => {
    expect(JSON.stringify(payload)).not.toMatch(/placeholder|mock|todo|coming soon|fake data/i);
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'report-print-export-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'report-print-export-api-test-refresh-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'report_print_export_api_contracts' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
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

    customer = await Customer.create({
      code: 'CUST-RPT',
      name: 'Report Customer',
      type: 'regular',
      accountType: 'customer',
      isActive: true,
    });

    supplier = await Supplier.create({
      code: 'SUP-RPT',
      name: 'Report Supplier',
      type: 'supplier',
      isActive: true,
    });

    item = await Item.create({
      code: 'ITEM-RPT',
      name: 'Report Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'Analgesics',
      unit: 'piece',
      pricing: {
        costPrice: 60,
        salePrice: 100,
      },
      inventory: {
        minimumStock: 5,
      },
      isActive: true,
    });

    await Inventory.create({
      item: item._id,
      warehouse: new mongoose.Types.ObjectId(),
      quantity: 20,
      reorderPoint: 5,
    });

    salesInvoice = await Invoice.create({
      invoiceNumber: 'SI-RPT-001',
      type: 'sales',
      customerId: customer._id,
      invoiceDate: new Date('2024-05-03T10:00:00.000Z'),
      dueDate: new Date('2024-05-10T10:00:00.000Z'),
      items: [{
        itemId: item._id,
        quantity: 2,
        unitPrice: 100,
        discount: 0,
        gstRate: 18,
        gstAmount: 36,
        taxAmount: 36,
        lineTotal: 236,
      }],
      totals: {
        subtotal: 200,
        grossTotal: 200,
        totalDiscount: 0,
        totalTax: 36,
        grandTotal: 236,
        netBillTotal: 236,
        gst18Total: 36,
        paidAmount: 40,
        dueAmount: 196,
      },
      status: 'confirmed',
      paymentStatus: 'partial',
      createdBy: adminUser._id,
    });

    await Invoice.create({
      invoiceNumber: 'PI-RPT-001',
      type: 'purchase',
      supplierId: supplier._id,
      supplierBillNo: 'SUP-BILL-RPT-001',
      invoiceDate: new Date('2024-05-04T10:00:00.000Z'),
      dueDate: new Date('2024-05-14T10:00:00.000Z'),
      items: [{
        itemId: item._id,
        quantity: 5,
        unitPrice: 60,
        discount: 0,
        gstRate: 4,
        gstAmount: 12,
        taxAmount: 12,
        lineTotal: 312,
      }],
      totals: {
        subtotal: 300,
        grossTotal: 300,
        totalDiscount: 0,
        totalTax: 12,
        grandTotal: 312,
        netBillTotal: 312,
        gst4Total: 12,
        paidAmount: 0,
        dueAmount: 312,
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      createdBy: adminUser._id,
    });
  });

  it('returns real print data and streams a non-empty invoice PDF', async () => {
    const printDataResponse = await request(app)
      .get(`/api/v1/print/invoices/${salesInvoice._id}?format=tax_invoice`)
      .set(authHeaders());

    expect(printDataResponse.status).toBe(200);
    expect(printDataResponse.body.success).toBe(true);
    expect(printDataResponse.body.data.invoice.invoiceNumber).toBe('SI-RPT-001');
    expect(printDataResponse.body.data.items).toHaveLength(1);
    expect(printDataResponse.body.data.totals.grandTotal).toBe(236);
    expectNoPlaceholderText(printDataResponse.body);

    const pdfResponse = await request(app)
      .get(`/api/v1/print/invoices/${salesInvoice._id}/pdf?format=tax_invoice`)
      .set(authHeaders())
      .buffer(true)
      .parse(parseBinary);

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfResponse.body.length).toBeGreaterThan(1000);
    expect(pdfResponse.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('returns sales report JSON plus non-empty CSV and PDF exports from mounted report routes', async () => {
    const reportResponse = await request(app)
      .get(`/api/v1/reports/sales?${periodQuery}`)
      .set(authHeaders());

    expect(reportResponse.status).toBe(200);
    expect(reportResponse.body.success).toBe(true);
    expect(reportResponse.body.data.summary.totalInvoices).toBe(1);
    expect(reportResponse.body.data.summary.totalSales).toBe(236);
    expect(reportResponse.body.data.invoices[0].invoiceNumber).toBe('SI-RPT-001');
    expectNoPlaceholderText(reportResponse.body);

    const csvResponse = await request(app)
      .get(`/api/v1/reports/sales?${periodQuery}&format=csv`)
      .set(authHeaders());

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers['content-type']).toMatch(/text\/csv/);
    expect(csvResponse.text).toContain('Invoice Number');
    expect(csvResponse.text).toContain('SI-RPT-001');
    expect(csvResponse.text).not.toMatch(/placeholder|mock|todo|coming soon|fake data/i);

    const pdfResponse = await request(app)
      .get(`/api/v1/reports/sales?${periodQuery}&format=pdf`)
      .set(authHeaders())
      .buffer(true)
      .parse(parseBinary);

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfResponse.body.length).toBeGreaterThan(1000);
    expect(pdfResponse.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('serves dashboard cards and chart data from mounted analytics routes', async () => {
    const dashboardResponse = await request(app)
      .get('/api/v1/reports/analytics/dashboard')
      .set(authHeaders());

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.success).toBe(true);
    expect(dashboardResponse.body.data.cards.sales).toEqual(expect.objectContaining({
      invoiceCount: expect.any(Number),
      totalAmount: expect.any(Number),
    }));
    expect(dashboardResponse.body.data.charts).toHaveProperty('salesTrend');
    expect(dashboardResponse.body.data.charts).toHaveProperty('topItems');
    expectNoPlaceholderText(dashboardResponse.body);

    const trendResponse = await request(app)
      .get(`/api/v1/reports/analytics/sales-trends?${periodQuery}&interval=daily`)
      .set(authHeaders());

    expect(trendResponse.status).toBe(200);
    expect(trendResponse.body.success).toBe(true);
    expect(trendResponse.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: '2024-05-03', totalSales: 236, invoiceCount: 1 }),
    ]));

    const topItemsResponse = await request(app)
      .get(`/api/v1/reports/analytics/top-items?${periodQuery}&limit=5`)
      .set(authHeaders());

    expect(topItemsResponse.status).toBe(200);
    expect(topItemsResponse.body.success).toBe(true);
    expect(topItemsResponse.body.data[0]).toEqual(expect.objectContaining({
      code: 'ITEM-RPT',
      name: 'Report Item',
      quantity: 2,
      revenue: 236,
    }));
    expectNoPlaceholderText(topItemsResponse.body);
  });
});
