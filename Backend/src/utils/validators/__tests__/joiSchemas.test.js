const {
  itemSchema,
  companySchema,
  accountSchema,
  userSchema,
  warehouseSchema,
  townSchema,
  areaSchema,
} = require('../joiSchemas');

describe('Joi Validation Schemas', () => {
  describe('itemSchema', () => {
    it('should validate valid item data', () => {
      const validItem = {
        name: 'Paracetamol 500mg',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        sellingGroup: 'A',
        pricing: {
          purchasePrice: 100,
          salePrice: 150,
        },
        inventory: {
          minStockLevel: 10,
          reorderPoint: 20,
          maxStockLevel: 50,
        },
        tax: {
          taxPercentage: 18,
        },
      };

      const { error } = itemSchema.validate(validItem);
      expect(error).toBeUndefined();
    });

    it('should reject item with invalid name length', () => {
      const invalidItem = {
        name: 'AB', // Too short
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
      };

      const { error } = itemSchema.validate(invalidItem);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('should reject item with invalid selling group', () => {
      const invalidItem = {
        name: 'Test Item',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        sellingGroup: 'D', // Invalid
      };

      const { error } = itemSchema.validate(invalidItem);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Selling group must be A, B, or C');
    });

    it('should reject item with invalid tax percentage', () => {
      const invalidItem = {
        name: 'Test Item',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        tax: {
          taxPercentage: 10, // Invalid, must be 0, 4, or 18
        },
      };

      const { error } = itemSchema.validate(invalidItem);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Tax percentage must be 0, 4, or 18');
    });

    it('should reject item with invalid stock levels', () => {
      const invalidItem = {
        name: 'Test Item',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        inventory: {
          minStockLevel: 50,
          maxStockLevel: 10, // Max < Min
        },
      };

      const { error } = itemSchema.validate(invalidItem);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('min <= reorder <= max');
    });

    it('should reject item with negative prices', () => {
      const invalidItem = {
        name: 'Test Item',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        pricing: {
          salePrice: -100, // Negative
        },
      };

      const { error } = itemSchema.validate(invalidItem);
      expect(error).toBeDefined();
    });

    it('should strip unknown fields', () => {
      const itemWithExtra = {
        name: 'Test Item',
        companyId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        businessTypeId: '507f1f77bcf86cd799439013',
        unknownField: 'should be removed',
      };

      const { value } = itemSchema.validate(itemWithExtra, { stripUnknown: true });
      expect(value.unknownField).toBeUndefined();
    });
  });

  describe('companySchema', () => {
    it('should validate valid company data', () => {
      const validCompany = {
        name: 'GSK Pharmaceuticals',
        groupType: 'A',
        contactPerson: 'John Doe',
        phone: '03001234567',
        email: 'contact@gsk.com',
      };

      const { error } = companySchema.validate(validCompany);
      expect(error).toBeUndefined();
    });

    it('should reject company with short name', () => {
      const invalidCompany = {
        name: 'A', // Too short
      };

      const { error } = companySchema.validate(invalidCompany);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('should reject company with invalid group type', () => {
      const invalidCompany = {
        name: 'Test Company',
        groupType: 'X', // Invalid
      };

      const { error } = companySchema.validate(invalidCompany);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Group type must be A, B, or C');
    });

    it('should reject company with invalid email', () => {
      const invalidCompany = {
        name: 'Test Company',
        email: 'invalid-email', // Invalid format
      };

      const { error } = companySchema.validate(invalidCompany);
      expect(error).toBeDefined();
    });
  });

  describe('accountSchema', () => {
    it('should validate valid customer account', () => {
      const validAccount = {
        name: 'ABC Pharmacy',
        accountType: 'customer',
        townId: '507f1f77bcf86cd799439011',
        contactInfo: {
          phone1: '03001234567',
          email: 'abc@pharmacy.com',
        },
        businessDetails: {
          customerType: 'retailer',
          creditDaysLimit: 30,
          creditAmountLimit: 50000,
        },
      };

      const { error } = accountSchema.validate(validAccount);
      expect(error).toBeUndefined();
    });

    it('should validate valid employee account', () => {
      const validAccount = {
        name: 'John Doe',
        accountType: 'employee',
        contactInfo: {
          nicNumber: '12345-1234567-1',
        },
        employeeBiodata: {
          fatherName: 'Richard Doe',
          dateOfAppointment: new Date('2024-01-01'),
          bloodGroup: 'O+',
          designationId: '507f1f77bcf86cd799439011',
          basicPay: 50000,
        },
      };

      const { error } = accountSchema.validate(validAccount);
      expect(error).toBeUndefined();
    });

    it('should reject account with invalid account type', () => {
      const invalidAccount = {
        name: 'Test Account',
        accountType: 'invalid', // Invalid type
      };

      const { error } = accountSchema.validate(invalidAccount);
      expect(error).toBeDefined();
    });

    it('should reject account with invalid CNIC format', () => {
      const invalidAccount = {
        name: 'Test Account',
        accountType: 'customer',
        contactInfo: {
          nicNumber: '12345', // Invalid format
        },
      };

      const { error } = accountSchema.validate(invalidAccount);
      expect(error).toBeDefined();
    });

    it('should reject account with invalid blood group', () => {
      const invalidAccount = {
        name: 'Test Account',
        accountType: 'employee',
        employeeBiodata: {
          bloodGroup: 'X+', // Invalid
        },
      };

      const { error } = accountSchema.validate(invalidAccount);
      expect(error).toBeDefined();
    });

    it('should reject account with negative credit limit', () => {
      const invalidAccount = {
        name: 'Test Account',
        accountType: 'customer',
        businessDetails: {
          creditAmountLimit: -1000, // Negative
        },
      };

      const { error } = accountSchema.validate(invalidAccount);
      expect(error).toBeDefined();
    });
  });

  describe('userSchema', () => {
    it('should validate valid user data', () => {
      const validUser = {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'admin',
        dimensionId: '507f1f77bcf86cd799439011',
      };

      const { error } = userSchema.validate(validUser);
      expect(error).toBeUndefined();
    });

    it('should reject user with short username', () => {
      const invalidUser = {
        username: 'ab', // Too short
        email: 'test@example.com',
        role: 'admin',
      };

      const { error } = userSchema.validate(invalidUser);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('username');
    });

    it('should reject user with invalid email', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'invalid-email', // Invalid format
        role: 'admin',
      };

      const { error } = userSchema.validate(invalidUser);
      expect(error).toBeDefined();
    });

    it('should reject user with invalid role', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'test@example.com',
        role: 'superuser', // Invalid role
      };

      const { error } = userSchema.validate(invalidUser);
      expect(error).toBeDefined();
    });

    it('should reject user with short password', () => {
      const invalidUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345', // Too short
        role: 'admin',
      };

      const { error } = userSchema.validate(invalidUser);
      expect(error).toBeDefined();
    });
  });

  describe('warehouseSchema', () => {
    it('should validate valid warehouse data', () => {
      const validWarehouse = {
        name: 'Main Warehouse',
        address: '123 Main Street, Sukkur',
        townId: '507f1f77bcf86cd799439011',
      };

      const { error } = warehouseSchema.validate(validWarehouse);
      expect(error).toBeUndefined();
    });

    it('should reject warehouse without address', () => {
      const invalidWarehouse = {
        name: 'Test Warehouse',
        // Missing address
      };

      const { error } = warehouseSchema.validate(invalidWarehouse);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Address is required');
    });
  });

  describe('townSchema', () => {
    it('should validate valid town data', () => {
      const validTown = {
        name: 'Sukkur',
        region: 'Sindh',
      };

      const { error } = townSchema.validate(validTown);
      expect(error).toBeUndefined();
    });

    it('should reject town with short name', () => {
      const invalidTown = {
        name: 'A', // Too short
      };

      const { error } = townSchema.validate(invalidTown);
      expect(error).toBeDefined();
    });
  });

  describe('areaSchema', () => {
    it('should validate valid area data', () => {
      const validArea = {
        name: 'Civil Lines',
        townId: '507f1f77bcf86cd799439011',
      };

      const { error } = areaSchema.validate(validArea);
      expect(error).toBeUndefined();
    });

    it('should reject area without townId', () => {
      const invalidArea = {
        name: 'Test Area',
        // Missing townId
      };

      const { error } = areaSchema.validate(invalidArea);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Town is required');
    });
  });
});
