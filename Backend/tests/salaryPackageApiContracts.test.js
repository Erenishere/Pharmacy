const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Customer = require('../src/models/Customer');
const SalaryCalculation = require('../src/models/SalaryCalculation');
const SalaryPackage = require('../src/models/SalaryPackage');
const User = require('../src/models/User');
const Invoice = require('../src/models/Invoice');
const CashReceipt = require('../src/models/CashReceipt');
const EOrder = require('../src/models/EOrder');
const RoutePlan = require('../src/models/RoutePlan');
const Town = require('../src/models/town');
const Area = require('../src/models/area');

jest.setTimeout(120000);

describe('salary package API contracts', () => {
  let mongoServer;
  let token;
  let adminUser;
  let employee;
  let employeeUser;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'salary-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'salary-api-test-refresh-secret';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'salary_package_api_contracts' });
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

    employee = await Customer.create({
      code: 'EMP1',
      name: 'Salary Employee',
      type: 'regular',
      accountType: 'employee',
      employeeBiodata: {
        basicPay: 50000,
      },
      isActive: true,
    });

    employeeUser = await User.create({
      username: 'sales.employee',
      email: 'sales.employee@example.com',
      password: 'password123',
      role: 'salesman',
      accountId: employee._id,
    });
  });

  it('creates a salary package from the canonical employee account and calculates from that package', async () => {
    const packageResponse = await request(app)
      .post('/api/v1/salary-packages')
      .set(authHeaders())
      .send({
        employeeId: employee._id,
        duration: {
          fromDate: '2026-01-01T00:00:00.000Z',
          toDate: '2026-12-31T00:00:00.000Z',
        },
        salesTarget: { targetAmount: 0, incentiveType: 'Fix Amount', incentiveValue: 0 },
        recoveryTarget: { targetAmount: 0, incentiveType: 'Fix Amount', incentiveValue: 0 },
        dailyAllowance: { type: 'Fix Amount', value: 500 },
        petrolAllowance: { type: 'Fix Amount', value: 1000 },
        mobilePackage: { type: 'Fix Amount', value: 250 },
        mobileOrderIncentive: { type: 'Fix Amount', value: 0 },
        mobileCashRecoveryIncentive: { type: 'Fix Amount', value: 0 },
        partyVisitTarget: { numberOfOrders: 0, type: 'Fix Amount', value: 0 },
        eidFitrBonus: { month: 'March', type: 'Fix Amount', value: 0 },
        eidAdhaBonus: { month: 'June', type: 'Fix Amount', value: 0 },
        otherBonus: { detail: '', month: 'January', type: 'Fix Amount', value: 0 },
        brandIncentives: [],
      });

    expect(packageResponse.status).toBe(201);
    expect(packageResponse.body.data.package.employeeName).toBe('Salary Employee');
    expect(packageResponse.body.data.package.basicPay.amount).toBe(50000);

    const salaryPackage = await SalaryPackage.findById(packageResponse.body.data.package._id).lean();
    expect(salaryPackage.employeeId.toString()).toBe(employee._id.toString());

    const calculationResponse = await request(app)
      .post('/api/v1/salary/calculate')
      .set(authHeaders())
      .send({
        packageId: salaryPackage._id,
        month: 'January',
        year: 2026,
      });

    expect(calculationResponse.status).toBe(201);
    expect(calculationResponse.body.data.calculation.employeeName).toBe('Salary Employee');
    expect(calculationResponse.body.data.calculation.basicPay).toBe(50000);
    expect(calculationResponse.body.data.calculation.grossSalary).toBe(51750);
    expect(await SalaryCalculation.countDocuments()).toBe(1);
  });

  it('uses one shared monthly performance path for salary calculation and target dashboard metrics', async () => {
    const town = await Town.create({ name: 'Salary Town', region: 'North' });
    const plannedArea = await Area.create({ name: 'Planned Area', townId: town._id });
    const outsideArea = await Area.create({ name: 'Outside Area', townId: town._id });

    const plannedCustomer = await Customer.create({
      code: 'CUSTPLAN',
      name: 'Planned Customer',
      type: 'regular',
      accountType: 'customer',
      townId: town._id,
      areaId: plannedArea._id,
      isActive: true,
    });

    const outsideCustomer = await Customer.create({
      code: 'CUSTOUT',
      name: 'Outside Customer',
      type: 'regular',
      accountType: 'customer',
      townId: town._id,
      areaId: outsideArea._id,
      isActive: true,
    });

    await RoutePlan.create({
      monthYear: '2026-01',
      salesmanId: employeeUser._id,
      salesTarget: 1000,
      recoveryTarget: 500,
      visitTarget: 1,
      days: [{ dayOfWeek: 'Monday', areaId: plannedArea._id }],
      createdBy: adminUser._id,
    });

    await Invoice.create([
      {
        invoiceNumber: 'SI-PLAN-001',
        type: 'sales',
        customerId: plannedCustomer._id,
        salesmanId: employee._id,
        invoiceDate: new Date('2026-01-10T00:00:00.000Z'),
        dueDate: new Date('2026-01-10T00:00:00.000Z'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          itemName: 'Planned Item',
          quantity: 1,
          unitPrice: 1200,
          lineTotal: 1200,
        }],
        totals: {
          subtotal: 1200,
          grandTotal: 1200,
          dueAmount: 1200,
          paidAmount: 0,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: adminUser._id,
      },
      {
        invoiceNumber: 'SI-OUT-001',
        type: 'sales',
        customerId: outsideCustomer._id,
        salesmanId: employee._id,
        invoiceDate: new Date('2026-01-12T00:00:00.000Z'),
        dueDate: new Date('2026-01-12T00:00:00.000Z'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          itemName: 'Outside Item',
          quantity: 1,
          unitPrice: 300,
          lineTotal: 300,
        }],
        totals: {
          subtotal: 300,
          grandTotal: 300,
          dueAmount: 300,
          paidAmount: 0,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: adminUser._id,
      },
    ]);

    await CashReceipt.create([
      {
        receiptNumber: 'CR-PLAN-001',
        customerId: plannedCustomer._id,
        amount: 500,
        paymentMethod: 'cash',
        receiptDate: new Date('2026-01-15T00:00:00.000Z'),
        salesmanId: employee._id,
        cashAccountId: new mongoose.Types.ObjectId(),
        createdBy: employeeUser._id,
        status: 'cleared',
      },
      {
        receiptNumber: 'CR-OUT-001',
        customerId: outsideCustomer._id,
        amount: 200,
        paymentMethod: 'cash',
        receiptDate: new Date('2026-01-18T00:00:00.000Z'),
        salesmanId: employee._id,
        cashAccountId: new mongoose.Types.ObjectId(),
        createdBy: adminUser._id,
        status: 'cleared',
      },
    ]);

    await EOrder.create([
      {
        orderNumber: 'EO-MOBILE-001',
        customerId: plannedCustomer._id,
        customerName: plannedCustomer.name,
        salesmanId: employee._id,
        orderDate: new Date('2026-01-09T00:00:00.000Z'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          itemName: 'Mobile Planned Item',
          unitPrice: 500,
          boxQuantity: 1,
          unitQuantity: 0,
          lineTotal: 500,
        }],
        subtotal: 500,
        grandTotal: 500,
        estimatedAmount: 500,
        status: 'approved',
        mobileSync: {
          offlineCreated: true,
          isSynced: true,
          deviceId: 'device-001',
        },
        createdBy: employeeUser._id,
      },
      {
        orderNumber: 'EO-DESK-001',
        customerId: outsideCustomer._id,
        customerName: outsideCustomer.name,
        salesmanId: employee._id,
        orderDate: new Date('2026-01-20T00:00:00.000Z'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          itemName: 'Desk Order Item',
          unitPrice: 250,
          boxQuantity: 1,
          unitQuantity: 0,
          lineTotal: 250,
        }],
        subtotal: 250,
        grandTotal: 250,
        estimatedAmount: 250,
        status: 'approved',
        mobileSync: {
          offlineCreated: false,
          isSynced: false,
        },
        createdBy: adminUser._id,
      },
    ]);

    const packageResponse = await request(app)
      .post('/api/v1/salary-packages')
      .set(authHeaders())
      .send({
        employeeId: employee._id,
        duration: {
          fromDate: '2026-01-01T00:00:00.000Z',
          toDate: '2026-12-31T00:00:00.000Z',
        },
        salesTarget: { targetAmount: 1000, incentiveType: 'Fix Amount', incentiveValue: 200 },
        recoveryTarget: { targetAmount: 500, incentiveType: 'Fix Amount', incentiveValue: 150 },
        dailyAllowance: { type: 'Fix Amount', value: 0 },
        petrolAllowance: { type: 'Fix Amount', value: 0 },
        mobilePackage: { type: 'Fix Amount', value: 0 },
        mobileOrderIncentive: { type: 'Amount', value: 50 },
        mobileCashRecoveryIncentive: { type: '%', value: 10 },
        partyVisitTarget: { numberOfOrders: 1, type: 'Fix Amount', value: 100 },
        eidFitrBonus: { month: 'March', type: 'Fix Amount', value: 0 },
        eidAdhaBonus: { month: 'June', type: 'Fix Amount', value: 0 },
        otherBonus: { detail: '', month: 'January', type: 'Fix Amount', value: 0 },
        brandIncentives: [],
      });

    expect(packageResponse.status).toBe(201);

    const salaryPackage = await SalaryPackage.findById(packageResponse.body.data.package._id).lean();

    const calculationResponse = await request(app)
      .post('/api/v1/salary/calculate')
      .set(authHeaders())
      .send({
        packageId: salaryPackage._id,
        month: 'January',
        year: 2026,
      });

    expect(calculationResponse.status).toBe(201);
    expect(calculationResponse.body.data.calculation.salesIncentive.achieved).toBe(1770);
    expect(calculationResponse.body.data.calculation.recoveryIncentive.achieved).toBe(700);
    expect(calculationResponse.body.data.calculation.partyVisitIncentive.achieved).toBe(1);
    expect(calculationResponse.body.data.calculation.mobileOrderIncentive.ordersCreated).toBe(1);
    expect(calculationResponse.body.data.calculation.mobileCashRecoveryIncentive.amountRecovered).toBe(500);
    expect(calculationResponse.body.data.calculation.grossSalary).toBe(50550);

    const dashboardResponse = await request(app)
      .get('/api/v1/targets/dashboard')
      .set(authHeaders())
      .query({ month: 'January', year: 2026, page: 1, limit: 10 });

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.data.employees).toHaveLength(1);
    expect(dashboardResponse.body.data.employees[0].salesTarget.achieved).toBe(1770);
    expect(dashboardResponse.body.data.employees[0].recoveryTarget.achieved).toBe(700);
    expect(dashboardResponse.body.data.employees[0].partyVisitTarget.achieved).toBe(1);
    expect(dashboardResponse.body.data.employees[0].mobileOrders.ordersCreated).toBe(1);
    expect(dashboardResponse.body.data.employees[0].mobileCashRecovery.amountRecovered).toBe(500);

    const employeeTargetsResponse = await request(app)
      .get(`/api/v1/targets/achievement/${employee._id}`)
      .set(authHeaders())
      .query({ month: 'January', year: 2026 });

    expect(employeeTargetsResponse.status).toBe(200);
    expect(employeeTargetsResponse.body.data.employeeId).toBe(employee._id.toString());
    expect(employeeTargetsResponse.body.data.salesTarget.achieved).toBe(1770);
    expect(employeeTargetsResponse.body.data.recoveryTarget.achieved).toBe(700);
    expect(employeeTargetsResponse.body.data.partyVisitTarget.achieved).toBe(1);
    expect(employeeTargetsResponse.body.data.mobileOrders.ordersCreated).toBe(1);
    expect(employeeTargetsResponse.body.data.mobileCashRecovery.amountRecovered).toBe(500);

    const salarySheetResponse = await request(app)
      .get(`/api/v1/salary/sheet/${employee._id}`)
      .set(authHeaders())
      .query({ month: 'January', year: 2026 });

    expect(salarySheetResponse.status).toBe(200);
    expect(salarySheetResponse.body.data.employeeName).toBe('Salary Employee');
    expect(salarySheetResponse.body.data.fixedComponents.total).toBe(50000);
    expect(salarySheetResponse.body.data.incentives.sales.achieved).toBe(1770);
    expect(salarySheetResponse.body.data.incentives.recovery.achieved).toBe(700);
    expect(salarySheetResponse.body.data.incentives.partyVisit.achieved).toBe(1);
    expect(salarySheetResponse.body.data.incentives.mobileOrder.ordersCreated).toBe(1);
    expect(salarySheetResponse.body.data.incentives.mobileCashRecovery.amountRecovered).toBe(500);
    expect(salarySheetResponse.body.data.grossSalary).toBe(50550);
    expect(salarySheetResponse.body.data.netSalary).toBe(50550);
  });
});
