const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const Invoice = require('../../src/models/Invoice');
const authService = require('../../src/services/authService');

/**
 * Purchase Report Controller API Tests
 * Task 9.2: Create purchaseReportController.js
 * Requirements: 6.1-6.14
 */
describe('Purchase Report Controller API Tests', () => {
  let authToken;
  let testUser;
  let testSupplier1;
  let testSupplier2;
  let testItem1;
  let testItem2;
  let purchaseInvoice1;
  let purchaseInvoice2;
  let returnInvoice;

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await Invoice.deleteMany({});

    // Create test user with admin role
    testUser = await User.create({
      username: 'purchasereportuser',
      email: 'purchasereport@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    authToken = authService.generateAccessToken({
      userId: testUser._id,
      role: testUser.role,
    });

    // Create test suppliers
    testSupplier1 = await Supplier.create({
      code: 'SUPP001',
      name: 'ABC Pharma',
      contactPerson: 'John Supplier',
      phone: '1234567890',
      email: 'abc@pharma.com',
      address: '123 Supplier St',
      town: 'Karachi',
      financialInfo: {
        paymentTerms: 30,
        advanceTaxStatus: 'filer',
      },
    });

    testSupplier2 = await Supplier.create({
      code: 'SUPP002',
      name: 'XY