const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Salesman = require('../../src/models/Salesman');
const SalaryPackage = require('../../src/models/SalaryPackage');
const SalaryCalculation = require('../../src/models/SalaryCalculation');
const Invoice = require('../../src/models/Invoice');
const CashReceipt = require('../../src/models/CashReceipt');
const Item = require('../../src/models/Item');
const database = require('../../src/config/database');

describe('Salary Package Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let employeeSalesman;
  let testItem;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await Salesman.deleteMany({});
    await SalaryPackage.deleteMany({});
    await SalaryCalculation.deleteMany({});
    await Invoice.deleteMany({});
    await CashReceipt.deleteMany({});
    await Item.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'admin',
        password: 'password123',
      });

    adminToken = loginResponse.body.data.accessToken;

    // Create test salesman (employee)
    employeeSalesman = await Salesman.create({
      code: 'EMP001',
      name: 'Test Employee',
      phone: '1234567890',
      email: 'employee@test.com',
      commissionRate: 5,
      isActive: true,
    });

    // Create test item for brand incentives
    testItem = await Item.create({
      itemName: 'Test Medicine',
      itemCode: 'MED001',
      category: 'Medicine',
      unit: 'Box',
      price: 100,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Salesman.deleteMany({});
    await SalaryPackage.deleteMany({});
    await SalaryCalculation.deleteMany({});
    await Invoice.deleteMany({});
    await CashReceipt.deleteMany({});
    await Item.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  });

  describe('POST /api/v1/salary-packages', () => {
    afterEach(async () => {
      await SalaryPackage.deleteMany({});
    });

    it('should create salary package successfully', async () => {
      const packageData = {
        employeeId: employeeSalesman._id.toString(),
        duration: {
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
        },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        recoveryTarget: {
          targetAmount: 450000,
          incentiveType: '%',
          incentiveValue: 5,
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 5000,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 8000,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 2000,
        },
        partyVisitTarget: {
          numberOfOrders: 100,
          type: 'Fix Amount',
          value: 5000,
        },
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('packageId');
      expect(response.body.data.package).toHaveProperty('employeeName', 'Test Employee');
      expect(response.body.data.package.basicPay.amount).toBe(50000);
      expect(response.body.data.package.salesTarget.targetAmount).toBe(500000);
    });

    it('should fail without authentication', async () => {
      const packageData = {
        employeeId: employeeSalesman._id.toString(),
        duration: {
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
        },
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .send(packageData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid employee ID', async () => {
      const packageData = {
        employeeId: new mongoose.Types.ObjectId().toString(),
        duration: {
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
        },
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(packageData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });

    it('should fail with invalid date range', async () => {
      const packageData = {
        employeeId: employeeSalesman._id.toString(),
        duration: {
          fromDate: '2025-12-31',
          toDate: '2025-01-01',
        },
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(packageData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should create package with brand incentives', async () => {
      const packageData = {
        employeeId: employeeSalesman._id.toString(),
        duration: {
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
        },
        brandIncentives: [
          {
            itemId: testItem._id.toString(),
            itemName: testItem.itemName,
            quantityTarget: 1000,
            duration: {
              fromDate: '2025-01-01',
              toDate: '2025-06-30',
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.package.brandIncentives).toHaveLength(1);
      expect(response.body.data.package.brandIncentives[0].itemName).toBe('Test Medicine');
    });

    it('should prevent overlapping packages', async () => {
      // Create first package
      await SalaryPackage.create({
        packageId: 'SP2025000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
        },
        status: 'Active',
        createdBy: adminUser._id,
      });

      // Try to create overlapping package
      const packageData = {
        employeeId: employeeSalesman._id.toString(),
        duration: {
          fromDate: '2025-06-01',
          toDate: '2025-12-31',
        },
      };

      const response = await request(app)
        .post('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(packageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Overlapping');
    });
  });

  describe('GET /api/v1/salary-packages', () => {
    let package1, package2, package3;

    beforeEach(async () => {
      await SalaryPackage.deleteMany({});

      // Create test packages
      package1 = await SalaryPackage.create({
        packageId: 'SP2025000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: { amount: 50000 },
        status: 'Active',
        createdBy: adminUser._id,
      });

      package2 = await SalaryPackage.create({
        packageId: 'SP2024000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-12-31'),
        },
        basicPay: { amount: 45000 },
        status: 'Inactive',
        createdBy: adminUser._id,
      });

      // Create another employee for testing
      const employee2 = await Salesman.create({
        code: 'EMP002',
        name: 'Employee 2',
        phone: '0987654321',
        email: 'employee2@test.com',
        commissionRate: 5,
        isActive: true,
      });

      package3 = await SalaryPackage.create({
        packageId: 'SP2025000002',
        employeeId: employee2._id,
        employeeName: employee2.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: { amount: 40000 },
        status: 'Active',
        createdBy: adminUser._id,
      });
    });

    afterEach(async () => {
      await SalaryPackage.deleteMany({});
      await Salesman.deleteMany({ code: 'EMP002' });
    });

    it('should get all salary packages', async () => {
      const response = await request(app)
        .get('/api/v1/salary-packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter packages by status', async () => {
      const response = await request(app)
        .get('/api/v1/salary-packages?status=Active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(pkg => pkg.status === 'Active')).toBe(true);
    });

    it('should filter packages by year', async () => {
      const response = await request(app)
        .get('/api/v1/salary-packages?year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter packages by employee ID', async () => {
      const response = await request(app)
        .get(`/api/v1/salary-packages?employeeId=${employeeSalesman._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(pkg => pkg.employeeId.toString() === employeeSalesman._id.toString())).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/salary-packages?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.recordsPerPage).toBe(2);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/salary-packages')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/salary-packages/:id', () => {
    let testPackage;

    beforeEach(async () => {
      await SalaryPackage.deleteMany({});

      testPackage = await SalaryPackage.create({
        packageId: 'SP2025000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: { amount: 50000 },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        status: 'Active',
        createdBy: adminUser._id,
      });
    });

    afterEach(async () => {
      await SalaryPackage.deleteMany({});
    });

    it('should update salary package successfully', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 6000,
        },
      };

      const response = await request(app)
        .put(`/api/v1/salary-packages/${testPackage._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.salesTarget.targetAmount).toBe(600000);
      expect(response.body.data.salesTarget.incentiveType).toBe('%');
      expect(response.body.data.dailyAllowance.value).toBe(6000);
    });

    it('should update package status', async () => {
      const updates = {
        status: 'Inactive',
      };

      const response = await request(app)
        .put(`/api/v1/salary-packages/${testPackage._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Inactive');
    });

    it('should fail with invalid package ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const updates = {
        status: 'Inactive',
      };

      const response = await request(app)
        .put(`/api/v1/salary-packages/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const updates = {
        status: 'Inactive',
      };

      const response = await request(app)
        .put(`/api/v1/salary-packages/${testPackage._id}`)
        .send(updates)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should add brand incentive to package', async () => {
      const incentiveData = {
        itemId: testItem._id.toString(),
        itemName: testItem.itemName,
        quantityTarget: 500,
        duration: {
          fromDate: '2025-01-01',
          toDate: '2025-06-30',
        },
        type: 'Fix Amount',
        value: 3000,
      };

      const response = await request(app)
        .post(`/api/v1/salary-packages/${testPackage._id}/brand-incentives`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incentiveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brandIncentives).toHaveLength(1);
      expect(response.body.data.brandIncentives[0].quantityTarget).toBe(500);
    });
  });

  describe('POST /api/v1/salary/calculate', () => {
    let testPackage;

    beforeEach(async () => {
      await SalaryPackage.deleteMany({});
      await SalaryCalculation.deleteMany({});
      await Invoice.deleteMany({});
      await CashReceipt.deleteMany({});

      testPackage = await SalaryPackage.create({
        packageId: 'SP2025000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: { amount: 50000 },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        recoveryTarget: {
          targetAmount: 450000,
          incentiveType: '%',
          incentiveValue: 5,
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 5000,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 8000,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 2000,
        },
        partyVisitTarget: {
          numberOfOrders: 100,
          type: 'Fix Amount',
          value: 5000,
        },
        status: 'Active',
        createdBy: adminUser._id,
      });
    });

    afterEach(async () => {
      await SalaryPackage.deleteMany({});
      await SalaryCalculation.deleteMany({});
      await Invoice.deleteMany({});
      await CashReceipt.deleteMany({});
    });

    it('should calculate salary successfully', async () => {
      const calculationData = {
        packageId: testPackage._id.toString(),
        month: 'January',
        year: 2025,
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(calculationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.calculation).toHaveProperty('calculationId');
      expect(response.body.data.calculation.month).toBe('January');
      expect(response.body.data.calculation.year).toBe(2025);
      expect(response.body.data.calculation.basicPay).toBe(50000);
      expect(response.body.data).toHaveProperty('grossSalary');
      expect(response.body.data).toHaveProperty('netSalary');
    });

    it('should calculate salary with sales achievement', async () => {
      // Create invoices to simulate sales
      await Invoice.create({
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date('2025-01-15'),
        customerId: new mongoose.Types.ObjectId(),
        salesmanId: employeeSalesman._id,
        items: [
          {
            itemId: testItem._id,
            itemName: testItem.itemName,
            quantity: 100,
            rate: 100,
            amount: 10000,
          },
        ],
        totalAmount: 600000,
        status: 'Completed',
      });

      const calculationData = {
        packageId: testPackage._id.toString(),
        month: 'January',
        year: 2025,
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(calculationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.calculation.salesIncentive.achieved).toBeGreaterThan(0);
      expect(response.body.data.calculation.salesIncentive.amount).toBeGreaterThan(0);
    });

    it('should fail with missing required fields', async () => {
      const calculationData = {
        packageId: testPackage._id.toString(),
        // Missing month and year
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(calculationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should fail with invalid package ID', async () => {
      const calculationData = {
        packageId: new mongoose.Types.ObjectId().toString(),
        month: 'January',
        year: 2025,
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(calculationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const calculationData = {
        packageId: testPackage._id.toString(),
        month: 'January',
        year: 2025,
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .send(calculationData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should include fixed components in calculation', async () => {
      const calculationData = {
        packageId: testPackage._id.toString(),
        month: 'January',
        year: 2025,
      };

      const response = await request(app)
        .post('/api/v1/salary/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(calculationData)
        .expect(201);

      expect(response.body.data.calculation.basicPay).toBe(50000);
      expect(response.body.data.calculation.dailyAllowance).toBe(5000);
      expect(response.body.data.calculation.petrolAllowance).toBe(8000);
      expect(response.body.data.calculation.mobilePackage).toBe(2000);
    });
  });

  describe('GET /api/v1/targets/achievement/:employeeId', () => {
    let testPackage;

    beforeEach(async () => {
      await SalaryPackage.deleteMany({});
      await Invoice.deleteMany({});
      await CashReceipt.deleteMany({});

      testPackage = await SalaryPackage.create({
        packageId: 'SP2025000001',
        employeeId: employeeSalesman._id,
        employeeName: employeeSalesman.accountName,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: { amount: 50000 },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        recoveryTarget: {
          targetAmount: 450000,
          incentiveType: '%',
          incentiveValue: 5,
        },
        partyVisitTarget: {
          numberOfOrders: 100,
          type: 'Fix Amount',
          value: 5000,
        },
        status: 'Active',
        createdBy: adminUser._id,
      });
    });

    afterEach(async () => {
      await SalaryPackage.deleteMany({});
      await Invoice.deleteMany({});
      await CashReceipt.deleteMany({});
    });

    it('should get employee target achievement successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/targets/achievement/${employeeSalesman._id}`)
        .query({ month: 'January', year: 2025 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeId');
      expect(response.body.data).toHaveProperty('employeeName');
      expect(response.body.data).toHaveProperty('salesTarget');
      expect(response.body.data).toHaveProperty('recoveryTarget');
      expect(response.body.data).toHaveProperty('partyVisitTarget');
      expect(response.body.data.month).toBe('January');
      expect(response.body.data.year).toBe(2025);
    });

    it('should show sales target achievement with invoices', async () => {
      // Create invoices
      await Invoice.create({
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date('2025-01-15'),
        customerId: new mongoose.Types.ObjectId(),
        salesmanId: employeeSalesman._id,
        items: [
          {
            itemId: testItem._id,
            itemName: testItem.itemName,
            quantity: 100,
            rate: 100,
            amount: 10000,
          },
        ],
        totalAmount: 300000,
        status: 'Completed',
      });

      const response = await request(app)
        .get(`/api/v1/targets/achievement/${employeeSalesman._id}`)
        .query({ month: 'January', year: 2025 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.salesTarget.achieved).toBeGreaterThan(0);
      expect(response.body.data.salesTarget.percentage).toBeGreaterThan(0);
    });

    it('should show recovery target achievement with cash receipts', async () => {
      // Create cash receipts
      await CashReceipt.create({
        receiptNumber: 'CR-2025-001',
        receiptDate: new Date('2025-01-15'),
        accountId: new mongoose.Types.ObjectId(),
        amount: 200000,
        collectedBy: employeeSalesman._id,
        paymentMethod: 'Cash',
      });

      const response = await request(app)
        .get(`/api/v1/targets/achievement/${employeeSalesman._id}`)
        .query({ month: 'January', year: 2025 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recoveryTarget.achieved).toBeGreaterThan(0);
    });

    it('should fail with missing query parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/targets/achievement/${employeeSalesman._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/targets/achievement/${employeeSalesman._id}`)
        .query({ month: 'January', year: 2025 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for employee without salary package', async () => {
      const newEmployee = await Salesman.create({
        code: 'EMP003',
        name: 'New Employee',
        phone: '1112223333',
        email: 'newemployee@test.com',
        commissionRate: 5,
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/v1/targets/achievement/${newEmployee._id}`)
        .query({ month: 'January', year: 2025 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Cleanup
      await Salesman.findByIdAndDelete(newEmployee._id);
    });
  });
});
