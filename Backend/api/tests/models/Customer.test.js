const mongoose = require('mongoose');
const Customer = require('../../src/models/Customer');

describe('Customer Model', () => {
  beforeEach(async () => {
    await Customer.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid customer', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          phone: '123456789',
          email: 'customer@example.com',
          address: '123 Test Street',
          city: 'Karachi',
          country: 'Pakistan'
        },
        financialInfo: {
          creditLimit: 50000,
          paymentTerms: 30,
          taxNumber: 'TAX123456',
          currency: 'PKR'
        }
      };

      const customer = new Customer(customerData);
      const savedCustomer = await customer.save();

      expect(savedCustomer.code).toBe(customerData.code);
      expect(savedCustomer.name).toBe(customerData.name);
      expect(savedCustomer.type).toBe(customerData.type);
      expect(savedCustomer.isActive).toBe(true);
    });

    it('should require name', async () => {
      const customerData = {
        code: 'CUST001',
        type: 'customer'
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Customer name is required');
    });

    it('should validate type enum', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'invalid_type'
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        contactInfo: {
          email: 'invalid-email'
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should enforce unique code', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer'
      };

      await new Customer(customerData).save();

      const duplicateCustomer = new Customer({
        ...customerData,
        name: 'Another Customer'
      });

      await expect(duplicateCustomer.save()).rejects.toThrow();
    });

    it('should auto-generate code if not provided', async () => {
      const customerData = {
        name: 'Test Customer',
        type: 'customer'
      };

      const customer = new Customer(customerData);
      await customer.save();

      expect(customer.code).toMatch(/^CUST\d{6}$/);
    });
  });

  describe('Virtuals', () => {
    it('should generate full address virtual', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        contactInfo: {
          address: '123 Test Street',
          city: 'Karachi',
          country: 'Pakistan'
        }
      });

      expect(customer.fullAddress).toBe('123 Test Street, Karachi, Pakistan');
    });

    it('should handle partial address in virtual', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        contactInfo: {
          city: 'Karachi'
        }
      });

      expect(customer.fullAddress).toBe('Karachi, Pakistan');
    });
  });

  describe('Instance Methods', () => {
    let customer;

    beforeEach(async () => {
      customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        financialInfo: {
          creditLimit: 50000
        }
      });
      await customer.save();
    });

    it('should check credit availability', () => {
      expect(customer.checkCreditAvailability(30000)).toBe(true);
      expect(customer.checkCreditAvailability(60000)).toBe(false);
    });

    it('should get available credit', () => {
      expect(customer.getAvailableCredit()).toBe(50000);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Customer.create([
        {
          name: 'Customer 1',
          type: 'customer',
          financialInfo: { creditLimit: 100000 },
          isActive: true
        },
        {
          name: 'Customer 2',
          type: 'customer',
          financialInfo: { creditLimit: 25000 },
          isActive: true
        },
        {
          name: 'Supplier 1',
          type: 'supplier',
          financialInfo: { creditLimit: 75000 },
          isActive: true
        },
        {
          name: 'Inactive Customer',
          type: 'customer',
          financialInfo: { creditLimit: 50000 },
          isActive: false
        }
      ]);
    });

    it('should find customers with credit limit', async () => {
      const customers = await Customer.findWithCreditLimit(50000);
      expect(customers).toHaveLength(2); // Customer 1 and Supplier 1
    });

    it('should find by type', async () => {
      const customers = await Customer.findByType('customer');
      expect(customers).toHaveLength(2); // Only active customers

      const suppliers = await Customer.findByType('supplier');
      expect(suppliers).toHaveLength(1);
    });
  });

  describe('Validation Rules', () => {
    it('should validate credit limit is not negative', async () => {
      const customerData = {
        name: 'Test Customer',
        financialInfo: {
          creditLimit: -1000
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Credit limit cannot be negative');
    });

    it('should validate payment terms range', async () => {
      const customerData = {
        name: 'Test Customer',
        financialInfo: {
          paymentTerms: 400
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Payment terms cannot exceed 365 days');
    });
  });

  describe('Account-Based Tax Determination - Phase 2 (Requirement 6.3, 6.4)', () => {
    describe('Advance Tax Rate', () => {
      it('should return 0% advance tax rate by default', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer'
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(0);
      });

      it('should return 0.5% advance tax rate when set', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(0.5);
      });

      it('should return 2.5% advance tax rate when set', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(2.5);
      });

      it('should validate advance tax rate enum values', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 5.0 // Invalid value
          }
        });

        await expect(customer.save()).rejects.toThrow();
      });
    });

    describe('Non-Filer Status', () => {
      it('should return false for non-filer status by default', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer'
        });
        await customer.save();

        expect(customer.isNonFilerAccount()).toBe(false);
      });

      it('should return true when customer is marked as non-filer', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        expect(customer.isNonFilerAccount()).toBe(true);
      });
    });

    describe('Advance Tax Calculation', () => {
      it('should calculate 0% advance tax when rate is 0', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(0);
      });

      it('should calculate 0.5% advance tax correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(50); // 0.5% of 10000
      });

      it('should calculate 2.5% advance tax correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(250); // 2.5% of 10000
      });

      it('should handle decimal amounts correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        const amount = 12345.67;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBeCloseTo(61.73, 2); // 0.5% of 12345.67
      });
    });

    describe('Non-Filer GST Calculation', () => {
      it('should return 0 for non-filer GST when customer is not a non-filer', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: false
          }
        });
        await customer.save();

        const amount = 10000;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(0);
      });

      it('should calculate 0.1% non-filer GST correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 10000;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
      });

      it('should handle decimal amounts for non-filer GST', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 12345.67;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBeCloseTo(12.35, 2); // 0.1% of 12345.67
      });
    });

    describe('Combined Tax Scenarios', () => {
      it('should handle customer with both advance tax and non-filer status', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5,
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        const nonFilerGST = customer.calculateNonFilerGST(amount);

        expect(advanceTax).toBe(250); // 2.5% of 10000
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
        expect(advanceTax + nonFilerGST).toBe(260);
      });

      it('should handle registered filer with advance tax', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5,
            isNonFiler: false
          }
        });
        await customer.save();

        const amount = 10000;
      });
    });
  });

  describe('Route Assignment - Phase 2 (Requirement 17.2)', () => {
    let route;

    beforeEach(async () => {
      // Create a mock route for testing
      const Route = require('../../src/models/Route');
      const User = require('../../src/models/User');

      // Create a user first (required for route creation)
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });

      route = await Route.create({
        code: 'RT001',
        name: 'Test Route',
        description: 'Test route for customer assignment',
        createdBy: user._id,
        isActive: true
      });
    });

    afterEach(async () => {
      const Route = require('../../src/models/Route');
      const User = require('../../src/models/User');
      await Route.deleteMany({});
      await User.deleteMany({});
    });

    it('should allow assigning a valid route to customer', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      expect(customer.routeId).toEqual(route._id);
    });

    it('should allow null routeId (no route assigned)', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: null
      });
      await customer.save();

      expect(customer.routeId).toBeNull();
    });

    it('should default routeId to null if not provided', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer'
      });
      await customer.save();

      expect(customer.routeId).toBeNull();
    });

    it('should populate route information when queried', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      const populatedCustomer = await Customer.findById(customer._id).populate('routeId');
      expect(populatedCustomer.routeId.code).toBe('RT001');
      expect(populatedCustomer.routeId.name).toBe('Test Route');
    });

    it('should allow updating route assignment', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: null
      });
      await customer.save();

      customer.routeId = route._id;
      await customer.save();

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.routeId).toEqual(route._id);
    });

    it('should allow removing route assignment', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      customer.routeId = null;
      await customer.save();

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.routeId).toBeNull();
    });
  });

  describe('Master Data Management - Account Type (Requirement 3.1)', () => {
    it('should create account with customer type', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer'
      });
      await customer.save();

      expect(customer.accountType).toBe('customer');
    });

    it('should create account with supplier type', async () => {
      const customer = new Customer({
        name: 'Test Supplier',
        accountType: 'supplier'
      });
      await customer.save();

      expect(customer.accountType).toBe('supplier');
    });

    it('should create account with employee type', async () => {
      const customer = new Customer({
        name: 'Test Employee',
        accountType: 'employee'
      });
      await customer.save();

      expect(customer.accountType).toBe('employee');
    });

    it('should create account with investor type', async () => {
      const customer = new Customer({
        name: 'Test Investor',
        accountType: 'investor'
      });
      await customer.save();

      expect(customer.accountType).toBe('investor');
    });

    it('should create account with both type', async () => {
      const customer = new Customer({
        name: 'Test Both',
        accountType: 'both'
      });
      await customer.save();

      expect(customer.accountType).toBe('both');
    });

    it('should default to customer type', async () => {
      const customer = new Customer({
        name: 'Test Default'
      });
      await customer.save();

      expect(customer.accountType).toBe('customer');
    });

    it('should validate accountType enum', async () => {
      const customer = new Customer({
        name: 'Test Invalid',
        accountType: 'invalid_type'
      });

      await expect(customer.save()).rejects.toThrow();
    });
  });

  describe('Master Data Management - Sub-account Hierarchy (Requirement 3.4)', () => {
    it('should create sub-account with parent reference', async () => {
      const parent = await Customer.create({
        name: 'Parent Account',
        accountType: 'customer'
      });

      const subAccount = new Customer({
        name: 'Sub Account',
        accountType: 'customer',
        parentAccountId: parent._id
      });
      await subAccount.save();

      expect(subAccount.parentAccountId).toEqual(parent._id);
    });

    it('should allow null parentAccountId for main accounts', async () => {
      const customer = new Customer({
        name: 'Main Account',
        accountType: 'customer',
        parentAccountId: null
      });
      await customer.save();

      expect(customer.parentAccountId).toBeNull();
    });

    it('should find sub-accounts by parent', async () => {
      const parent = await Customer.create({
        name: 'Parent Account',
        accountType: 'customer'
      });

      await Customer.create([
        { name: 'Sub 1', accountType: 'customer', parentAccountId: parent._id },
        { name: 'Sub 2', accountType: 'customer', parentAccountId: parent._id },
        { name: 'Independent', accountType: 'customer' }
      ]);

      const subAccounts = await Customer.findSubAccounts(parent._id);
      expect(subAccounts).toHaveLength(2);
    });
  });

  describe('Master Data Management - Employee Biodata (Requirement 3.11-3.13)', () => {
    it('should create employee account with biodata', async () => {
      const employee = new Customer({
        name: 'John Doe',
        accountType: 'employee',
        employeeBiodata: {
          fatherName: 'James Doe',
          fatherNIC: '12345-1234567-1',
          dateOfAppointment: new Date('2024-01-01'),
          guarantorName: 'Jane Smith',
          guarantorNIC: '54321-7654321-1',
          emergencyContact: '0300-1234567',
          bloodGroup: 'O+',
          permanentAddress: '123 Main St, Karachi',
          basicPay: 50000,
          salaryPosition: 'Senior'
        }
      });
      await employee.save();

      expect(employee.employeeBiodata.fatherName).toBe('James Doe');
      expect(employee.employeeBiodata.bloodGroup).toBe('O+');
      expect(employee.employeeBiodata.basicPay).toBe(50000);
    });

    it('should validate blood group enum', async () => {
      const employee = new Customer({
        name: 'Test Employee',
        accountType: 'employee',
        employeeBiodata: {
          bloodGroup: 'Invalid'
        }
      });

      await expect(employee.save()).rejects.toThrow();
    });

    it('should allow valid blood groups', async () => {
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      
      for (const bloodGroup of bloodGroups) {
        const employee = new Customer({
          name: `Employee ${bloodGroup}`,
          accountType: 'employee',
          employeeBiodata: { bloodGroup }
        });
        await employee.save();
        expect(employee.employeeBiodata.bloodGroup).toBe(bloodGroup);
      }
    });

    it('should validate basic pay is not negative', async () => {
      const employee = new Customer({
        name: 'Test Employee',
        accountType: 'employee',
        employeeBiodata: {
          basicPay: -1000
        }
      });

      await expect(employee.save()).rejects.toThrow('Basic pay cannot be negative');
    });
  });

  describe('Master Data Management - Business Details (Requirement 3.14-3.17)', () => {
    it('should create customer with business details', async () => {
      const customer = new Customer({
        name: 'ABC Pharmacy',
        accountType: 'customer',
        businessDetails: {
          customerType: 'pharmacy',
          creditDaysLimit: 30,
          creditAmountLimit: 100000,
          openingBalance: 5000,
          balanceType: 'debit'
        }
      });
      await customer.save();

      expect(customer.businessDetails.customerType).toBe('pharmacy');
      expect(customer.businessDetails.creditDaysLimit).toBe(30);
      expect(customer.businessDetails.creditAmountLimit).toBe(100000);
    });

    it('should validate customer type enum', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer',
        businessDetails: {
          customerType: 'invalid_type'
        }
      });

      await expect(customer.save()).rejects.toThrow();
    });

    it('should validate credit days limit range', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer',
        businessDetails: {
          creditDaysLimit: 400
        }
      });

      await expect(customer.save()).rejects.toThrow('Credit days limit cannot exceed 365');
    });

    it('should validate credit amount limit is not negative', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer',
        businessDetails: {
          creditAmountLimit: -1000
        }
      });

      await expect(customer.save()).rejects.toThrow('Credit amount limit cannot be negative');
    });
  });

  describe('Master Data Management - Banking Information (Requirement 3.18)', () => {
    it('should create account with banking info', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer',
        bankingInfo: {
          bankName: 'HBL',
          accountNumber: '1234567890',
          branch: 'Karachi Main Branch'
        }
      });
      await customer.save();

      expect(customer.bankingInfo.bankName).toBe('HBL');
      expect(customer.bankingInfo.accountNumber).toBe('1234567890');
      expect(customer.bankingInfo.branch).toBe('Karachi Main Branch');
    });
  });

  describe('Master Data Management - Multiple Phone Numbers (Requirement 3.8)', () => {
    it('should store multiple phone numbers', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        accountType: 'customer',
        contactInfo: {
          phone: '0300-1111111',
          phone1: '0301-2222222',
          phone2: '0302-3333333',
          phone3: '0303-4444444'
        }
      });
      await customer.save();

      expect(customer.contactInfo.phone).toBe('0300-1111111');
      expect(customer.contactInfo.phone1).toBe('0301-2222222');
      expect(customer.contactInfo.phone2).toBe('0302-3333333');
      expect(customer.contactInfo.phone3).toBe('0303-4444444');
    });
  });

  describe('Master Data Management - Helper Methods', () => {
    it('should check if account is employee', async () => {
      const employee = await Customer.create({
        name: 'Employee',
        accountType: 'employee'
      });

      expect(employee.isEmployee()).toBe(true);
      expect(employee.isCustomer()).toBe(false);
      expect(employee.isSupplier()).toBe(false);
    });

    it('should check if account is customer', async () => {
      const customer = await Customer.create({
        name: 'Customer',
        accountType: 'customer'
      });

      expect(customer.isCustomer()).toBe(true);
      expect(customer.isEmployee()).toBe(false);
      expect(customer.isSupplier()).toBe(false);
    });

    it('should check if account is supplier', async () => {
      const supplier = await Customer.create({
        name: 'Supplier',
        accountType: 'supplier'
      });

      expect(supplier.isSupplier()).toBe(true);
      expect(supplier.isEmployee()).toBe(false);
      expect(supplier.isCustomer()).toBe(false);
    });

    it('should check if account is both customer and supplier', async () => {
      const both = await Customer.create({
        name: 'Both',
        accountType: 'both'
      });

      expect(both.isCustomer()).toBe(true);
      expect(both.isSupplier()).toBe(true);
      expect(both.isEmployee()).toBe(false);
    });
  });

  describe('Master Data Management - Credit Limit Checks (Requirement 3.21)', () => {
    it('should check if credit limit is exceeded', async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        accountType: 'customer',
        currentBalance: -50000,
        businessDetails: {
          creditAmountLimit: 100000
        }
      });

      expect(customer.checkCreditLimitExceeded(30000)).toBe(false); // 50000 + 30000 = 80000 < 100000
      expect(customer.checkCreditLimitExceeded(60000)).toBe(true);  // 50000 + 60000 = 110000 > 100000
    });

    it('should get available credit amount', async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        accountType: 'customer',
        currentBalance: -30000,
        businessDetails: {
          creditAmountLimit: 100000
        }
      });

      expect(customer.getAvailableCreditAmount()).toBe(70000); // 100000 - 30000
    });

    it('should return 0 available credit when no limit set', async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        accountType: 'customer',
        currentBalance: -30000
      });

      expect(customer.getAvailableCreditAmount()).toBe(0);
    });
  });

  describe('Master Data Management - Credit Days Check (Requirement 3.22)', () => {
    it('should check if credit days are exceeded', async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        accountType: 'customer',
        businessDetails: {
          creditDaysLimit: 30
        }
      });

      const oldInvoiceDate = new Date();
      oldInvoiceDate.setDate(oldInvoiceDate.getDate() - 35); // 35 days ago

      const recentInvoiceDate = new Date();
      recentInvoiceDate.setDate(recentInvoiceDate.getDate() - 20); // 20 days ago

      expect(customer.checkCreditDaysExceeded(oldInvoiceDate)).toBe(true);
      expect(customer.checkCreditDaysExceeded(recentInvoiceDate)).toBe(false);
    });
  });

  describe('Master Data Management - Static Methods', () => {
    beforeEach(async () => {
      await Customer.create([
        { name: 'Customer 1', accountType: 'customer', isActive: true },
        { name: 'Customer 2', accountType: 'customer', isActive: true },
        { name: 'Supplier 1', accountType: 'supplier', isActive: true },
        { name: 'Employee 1', accountType: 'employee', isActive: true },
        { name: 'Inactive Customer', accountType: 'customer', isActive: false }
      ]);
    });

    it('should find by account type', async () => {
      const customers = await Customer.findByAccountType('customer');
      expect(customers).toHaveLength(2);

      const suppliers = await Customer.findByAccountType('supplier');
      expect(suppliers).toHaveLength(1);

      const employees = await Customer.findByAccountType('employee');
      expect(employees).toHaveLength(1);
    });
  });
});