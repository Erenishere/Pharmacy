const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Account = require('../src/models/Account');
const Customer = require('../src/models/Customer');
const DimensionBranch = require('../src/models/dimensionbranch');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const Salesman = require('../src/models/Salesman');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('recovery summary API contracts', () => {
  let replSet;
  let token;
  let adminUser;
  let cashAccount;
  let dimensionNorth;
  let salesmanA;
  let salesmanB;
  let item;
  let customerA;
  let customerB;
  let customerC;
  let invoiceA1;
  let invoiceA2;
  let invoiceB1;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const createSalesInvoice = async ({
    invoiceNumber,
    customer,
    salesman,
    total,
    invoiceDate,
    dueDate,
  }) => Invoice.create({
    invoiceNumber,
    type: 'sales',
    customerId: customer._id,
    salesmanId: salesman._id,
    invoiceDate: new Date(invoiceDate),
    dueDate: new Date(dueDate),
    items: [{
      itemId: item._id,
      quantity: 1,
      unitPrice: total,
      discount: 0,
      gstRate: 0,
      lineTotal: total,
    }],
    totals: {
      subtotal: total,
      grandTotal: total,
      netBillTotal: total,
      paidAmount: 0,
      dueAmount: total,
    },
    status: 'confirmed',
    paymentStatus: 'pending',
    createdBy: adminUser._id,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'recovery-summary-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'recovery-summary-api-refresh-test-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'recovery_summary_api_contracts' });
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

    cashAccount = await Account.create({
      name: 'Cash in Hand',
      code: 'CASH-RECOVERY',
      accountType: 'asset',
      balance: 5000,
      isActive: true,
      createdBy: adminUser._id,
    });

    dimensionNorth = await DimensionBranch.create({
      code: 'DIM-NORTH',
      name: 'North Zone',
      type: 'REGION',
      isActive: true,
      createdBy: adminUser._id,
    });

    salesmanA = await Salesman.create({
      code: 'SM-001',
      name: 'Ali Raza',
      isActive: true,
      createdBy: adminUser._id,
    });

    salesmanB = await Salesman.create({
      code: 'SM-002',
      name: 'Sara Khan',
      isActive: true,
      createdBy: adminUser._id,
    });

    item = await Item.create({
      code: 'ITEM-RECOVERY',
      name: 'Recovery Test Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      category: 'General',
      unit: 'piece',
      pricing: {
        costPrice: 30,
        salePrice: 100,
      },
      inventory: {
        minimumStock: 0,
      },
      isActive: true,
    });

    customerA = await Customer.create({
      code: 'CUST-REC-A',
      name: 'Alpha Pharmacy',
      type: 'regular',
      accountType: 'customer',
      dimensionId: dimensionNorth._id,
      contactInfo: {
        town: 'Lahore',
      },
      isActive: true,
    });

    customerB = await Customer.create({
      code: 'CUST-REC-B',
      name: 'Beta Medical',
      type: 'regular',
      accountType: 'customer',
      dimensionId: dimensionNorth._id,
      contactInfo: {
        town: 'Lahore',
      },
      isActive: true,
    });

    customerC = await Customer.create({
      code: 'CUST-REC-C',
      name: 'City Health',
      type: 'regular',
      accountType: 'customer',
      dimensionId: dimensionNorth._id,
      contactInfo: {
        town: 'Faisalabad',
      },
      isActive: true,
    });

    invoiceA1 = await createSalesInvoice({
      invoiceNumber: 'SI-REC-001',
      customer: customerA,
      salesman: salesmanA,
      total: 300,
      invoiceDate: '2026-05-01T10:00:00.000Z',
      dueDate: '2026-05-10T10:00:00.000Z',
    });

    invoiceA2 = await createSalesInvoice({
      invoiceNumber: 'SI-REC-002',
      customer: customerB,
      salesman: salesmanA,
      total: 200,
      invoiceDate: '2026-04-01T10:00:00.000Z',
      dueDate: '2026-04-05T10:00:00.000Z',
    });

    invoiceB1 = await createSalesInvoice({
      invoiceNumber: 'SI-REC-003',
      customer: customerC,
      salesman: salesmanB,
      total: 150,
      invoiceDate: '2026-05-03T10:00:00.000Z',
      dueDate: '2026-05-20T10:00:00.000Z',
    });

    await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customerA._id,
        cashAccountId: cashAccount._id,
        receiptDate: '2026-05-12T10:00:00.000Z',
        amount: 100,
        paymentMethod: 'cash',
        invoiceAllocations: [{ invoiceId: invoiceA1._id, amount: 100 }],
        notes: 'partial recovery for Alpha Pharmacy',
      })
      .expect(201);

    await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customerC._id,
        cashAccountId: cashAccount._id,
        receiptDate: '2026-05-21T10:00:00.000Z',
        amount: 50,
        paymentMethod: 'cash',
        invoiceAllocations: [{ invoiceId: invoiceB1._id, amount: 50 }],
        notes: 'partial recovery for City Health',
      })
      .expect(201);
  });

  it('returns per-salesman recovery totals that reconcile to invoice paid and due amounts', async () => {
    const response = await request(app)
      .get('/api/v1/recovery-summary?startDate=2026-04-01&endDate=2026-05-31')
      .set(authHeaders())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.pagination).toEqual(expect.objectContaining({
      total: 2,
      page: 1,
      limit: 50,
    }));

    const aliSummary = response.body.data.find((row) => row.salesmanName === 'Ali Raza');
    const saraSummary = response.body.data.find((row) => row.salesmanName === 'Sara Khan');

    expect(aliSummary).toEqual(expect.objectContaining({
      totalSales: 500,
      totalRecovery: 100,
      totalOutstanding: 400,
      overdueAmount: 400,
      customerCount: 2,
      invoiceCount: 2,
      recoveryPercentage: 20,
    }));
    expect(aliSummary.details).toHaveLength(2);
    expect(aliSummary.details[0]).toEqual(expect.objectContaining({
      customerName: 'Alpha Pharmacy',
      totalSales: 300,
      totalRecovery: 100,
      totalOutstanding: 200,
      recoveryPercentage: 33.33,
    }));

    expect(saraSummary).toEqual(expect.objectContaining({
      totalSales: 150,
      totalRecovery: 50,
      totalOutstanding: 100,
      overdueAmount: 100,
      customerCount: 1,
      invoiceCount: 1,
      recoveryPercentage: 33.33,
    }));

    const refreshedInvoiceA1 = await Invoice.findById(invoiceA1._id).lean();
    const refreshedInvoiceB1 = await Invoice.findById(invoiceB1._id).lean();
    expect(refreshedInvoiceA1.totals.paidAmount).toBe(100);
    expect(refreshedInvoiceA1.totals.dueAmount).toBe(200);
    expect(refreshedInvoiceB1.totals.paidAmount).toBe(50);
    expect(refreshedInvoiceB1.totals.dueAmount).toBe(100);
  });

  it('returns real recovery statistics and honors aging-bucket filtering', async () => {
    const statsResponse = await request(app)
      .get('/api/v1/recovery-summary/statistics?startDate=2026-04-01&endDate=2026-05-31')
      .set(authHeaders())
      .expect(200);

    expect(statsResponse.body.success).toBe(true);
    expect(statsResponse.body.data).toEqual(expect.objectContaining({
      totalSales: 650,
      totalRecovery: 150,
      totalOutstanding: 500,
      totalOverdue: 500,
      recoveryRate: 23.08,
      activeSalesmen: 2,
      totalCustomers: 3,
    }));
    expect(statsResponse.body.data.agingAnalysis).toEqual({
      '0-30': { count: 2, amount: 300 },
      '31-60': { count: 1, amount: 200 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    });

    const agingResponse = await request(app)
      .get('/api/v1/recovery-summary?startDate=2026-04-01&endDate=2026-05-31&agingBucket=31-60')
      .set(authHeaders())
      .expect(200);

    expect(agingResponse.body.data).toHaveLength(1);
    expect(agingResponse.body.data[0]).toEqual(expect.objectContaining({
      salesmanName: 'Ali Raza',
      totalSales: 200,
      totalRecovery: 0,
      totalOutstanding: 200,
      invoiceCount: 1,
      customerCount: 1,
      recoveryPercentage: 0,
    }));
  });
});
