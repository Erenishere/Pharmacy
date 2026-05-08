const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Customer = require('../src/models/Customer');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('tax report drilldown API contracts', () => {
  let mongoServer;
  let token;
  let adminUser;
  let customerTax05;
  let customerTax25;
  let supplierA;
  let supplierB;
  let item18;
  let item4;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });
  const periodQuery = 'startDate=2024-05-01&endDate=2024-05-31';

  const expectNoPlaceholderText = (payload) => {
    expect(JSON.stringify(payload)).not.toMatch(/placeholder|mock|todo|coming soon|fake data/i);
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'tax-report-drilldown-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'tax-report-drilldown-api-refresh-test-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'tax_report_drilldown_api_contracts' });
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

    customerTax05 = await Customer.create({
      code: 'CUST-TAX-05',
      name: 'Tax Customer 0.5',
      type: 'regular',
      accountType: 'customer',
      financialInfo: {
        advanceTaxRate: 0.5,
        isNonFiler: true,
      },
      isActive: true,
    });

    customerTax25 = await Customer.create({
      code: 'CUST-TAX-25',
      name: 'Tax Customer 2.5',
      type: 'regular',
      accountType: 'customer',
      financialInfo: {
        advanceTaxRate: 2.5,
        isNonFiler: true,
      },
      isActive: true,
    });

    supplierA = await Supplier.create({
      code: 'SUP-TAX-A',
      name: 'Tax Supplier A',
      type: 'supplier',
      isActive: true,
    });

    supplierB = await Supplier.create({
      code: 'SUP-TAX-B',
      name: 'Tax Supplier B',
      type: 'supplier',
      isActive: true,
    });

    item18 = await Item.create({
      code: 'ITEM-TAX-18',
      name: 'Tax Item 18',
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

    item4 = await Item.create({
      code: 'ITEM-TAX-4',
      name: 'Tax Item 4',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'Supplements',
      unit: 'piece',
      pricing: {
        costPrice: 20,
        salePrice: 50,
      },
      inventory: {
        minimumStock: 3,
      },
      isActive: true,
    });

    await Invoice.create([
      {
        invoiceNumber: 'SI-TAX-001',
        type: 'sales',
        customerId: customerTax05._id,
        invoiceDate: new Date('2024-05-03T10:00:00.000Z'),
        dueDate: new Date('2024-05-10T10:00:00.000Z'),
        items: [{
          itemId: item18._id,
          quantity: 2,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 36,
          taxAmount: 39,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 1,
          lineTotal: 239,
        }],
        totals: {
          subtotal: 200,
          grossTotal: 200,
          totalDiscount: 0,
          totalTax: 39,
          grandTotal: 239,
          netBillTotal: 239,
          gst18Total: 36,
          advanceTaxTotal: 1,
          nonFilerGSTTotal: 2,
          paidAmount: 0,
          dueAmount: 239,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: adminUser._id,
      },
      {
        invoiceNumber: 'SI-TAX-002',
        type: 'sales',
        customerId: customerTax25._id,
        invoiceDate: new Date('2024-05-04T10:00:00.000Z'),
        dueDate: new Date('2024-05-11T10:00:00.000Z'),
        items: [{
          itemId: item4._id,
          quantity: 2,
          unitPrice: 50,
          discount: 0,
          gstRate: 4,
          gstAmount: 4,
          taxAmount: 7,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: 2.5,
          lineTotal: 107,
        }],
        totals: {
          subtotal: 100,
          grossTotal: 100,
          totalDiscount: 0,
          totalTax: 7,
          grandTotal: 107,
          netBillTotal: 107,
          gst4Total: 4,
          advanceTaxTotal: 2.5,
          nonFilerGSTTotal: 0.5,
          paidAmount: 0,
          dueAmount: 107,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: adminUser._id,
      },
      {
        invoiceNumber: 'PI-TAX-001',
        type: 'purchase',
        supplierId: supplierA._id,
        supplierBillNo: 'SUP-A-BILL-001',
        invoiceDate: new Date('2024-05-05T10:00:00.000Z'),
        dueDate: new Date('2024-05-15T10:00:00.000Z'),
        items: [{
          itemId: item18._id,
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
      },
      {
        invoiceNumber: 'PI-TAX-002',
        type: 'purchase',
        supplierId: supplierB._id,
        supplierBillNo: 'SUP-B-BILL-001',
        invoiceDate: new Date('2024-05-06T10:00:00.000Z'),
        dueDate: new Date('2024-05-16T10:00:00.000Z'),
        items: [{
          itemId: item4._id,
          quantity: 4,
          unitPrice: 50,
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
          paidAmount: 0,
          dueAmount: 236,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: adminUser._id,
      },
    ]);
  });

  it('reports mounted tax-summary totals for GST, advance tax, and non-filer tax from real invoices', async () => {
    const response = await request(app)
      .get(`/api/v1/reports/tax-summary?${periodQuery}&invoiceType=sales`)
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reportType).toBe('comprehensive_tax_report');
    expect(response.body.data.taxBreakdown.summary).toEqual(expect.objectContaining({
      totalInvoices: 2,
      totalTaxableAmount: 300,
      totalGSTAmount: 40,
      totalAdvanceTaxAmount: 3.5,
      totalNonFilerGSTAmount: 0.3,
      totalTaxAmount: 43.8,
    }));
    expect(response.body.data.taxBreakdown.gst.gst18).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 200,
      taxAmount: 36,
    }));
    expect(response.body.data.taxBreakdown.gst.gst4).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 100,
      taxAmount: 4,
    }));
    expect(response.body.data.taxBreakdown.advanceTax.rate0_5).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 200,
      taxAmount: 1,
    }));
    expect(response.body.data.taxBreakdown.advanceTax.rate2_5).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 100,
      taxAmount: 2.5,
    }));
    expect(response.body.data.taxBreakdown.nonFilerGST).toEqual(expect.objectContaining({
      invoiceCount: 2,
      taxableAmount: 300,
      taxAmount: 0.3,
    }));
    expectNoPlaceholderText(response.body);
  });

  it('reports purchase GST drilldowns and supplier-wise totals from mounted report routes', async () => {
    const breakdownResponse = await request(app)
      .get(`/api/v1/reports/purchase-gst-breakdown?${periodQuery}`)
      .set(authHeaders());

    expect(breakdownResponse.status).toBe(200);
    expect(breakdownResponse.body.success).toBe(true);
    expect(breakdownResponse.body.data.breakdown.byTaxRate.gst4).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 300,
      gstAmount: 12,
      totalAmount: 312,
    }));
    expect(breakdownResponse.body.data.breakdown.byTaxRate.gst18).toEqual(expect.objectContaining({
      invoiceCount: 1,
      taxableAmount: 200,
      gstAmount: 36,
      totalAmount: 236,
    }));
    expect(breakdownResponse.body.data.breakdown.total).toEqual(expect.objectContaining({
      invoiceCount: 2,
      taxableAmount: 500,
      gstAmount: 48,
      totalAmount: 548,
    }));

    const summaryResponse = await request(app)
      .get(`/api/v1/reports/purchase-summary-gst?${periodQuery}`)
      .set(authHeaders());

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.success).toBe(true);
    expect(summaryResponse.body.data.summary).toEqual(expect.objectContaining({
      totalInvoices: 2,
      totalPurchases: 548,
      totalTax: 48,
      gst4Total: 12,
      gst18Total: 36,
    }));
    expect(summaryResponse.body.data.gstBreakdown.total).toEqual(expect.objectContaining({
      invoiceCount: 2,
      taxableAmount: 500,
      gstAmount: 48,
      totalAmount: 548,
    }));

    const supplierWiseResponse = await request(app)
      .get(`/api/v1/reports/supplier-wise-gst?${periodQuery}`)
      .set(authHeaders());

    expect(supplierWiseResponse.status).toBe(200);
    expect(supplierWiseResponse.body.success).toBe(true);
    expect(supplierWiseResponse.body.data.suppliers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        supplier: expect.objectContaining({ code: 'SUP-TAX-A', name: 'Tax Supplier A' }),
        gst4: 12,
        gst18: 0,
        total: 312,
        invoiceCount: 1,
      }),
      expect.objectContaining({
        supplier: expect.objectContaining({ code: 'SUP-TAX-B', name: 'Tax Supplier B' }),
        gst4: 0,
        gst18: 36,
        total: 236,
        invoiceCount: 1,
      }),
    ]));
    expect(supplierWiseResponse.body.data.summary).toEqual(expect.objectContaining({
      totalSuppliers: 2,
      totalInvoices: 2,
      totalGST: 48,
      grandTotal: 548,
    }));
    expectNoPlaceholderText(supplierWiseResponse.body);
  });
});
