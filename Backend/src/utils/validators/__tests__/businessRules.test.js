const {
  validateStockLevels,
  validateCreditLimit,
  checkCreditDaysExceeded,
  validateUnique,
  validateCompanyCanDelete,
  validateWarehouseCanDelete,
  validateTownCanDelete,
  validateCategoryCanDelete,
  validateBusinessTypeCanDelete,
  validateClaimAccountCanDelete,
  validateDateNotFuture,
  validateDateRange,
  validateAccountTypeFields,
  validateSubAccountHierarchy,
  validateCompanyActive,
} = require('../businessRules');
const { BusinessRuleError, DuplicateEntryError } = require('../../errors');

describe('Business Rule Validators', () => {
  describe('validateStockLevels', () => {
    it('should pass when min <= reorder <= max', () => {
      const inventory = {
        minStockLevel: 10,
        reorderPoint: 20,
        maxStockLevel: 50,
      };

      expect(() => validateStockLevels(inventory)).not.toThrow();
    });

    it('should throw error when min > max', () => {
      const inventory = {
        minStockLevel: 50,
        maxStockLevel: 10,
      };

      expect(() => validateStockLevels(inventory)).toThrow(BusinessRuleError);
      expect(() => validateStockLevels(inventory)).toThrow(
        'Minimum stock level cannot be greater than maximum stock level',
      );
    });

    it('should throw error when reorder < min', () => {
      const inventory = {
        minStockLevel: 20,
        reorderPoint: 10,
      };

      expect(() => validateStockLevels(inventory)).toThrow(BusinessRuleError);
      expect(() => validateStockLevels(inventory)).toThrow(
        'Reorder point cannot be less than minimum stock level',
      );
    });

    it('should throw error when reorder > max', () => {
      const inventory = {
        maxStockLevel: 50,
        reorderPoint: 60,
      };

      expect(() => validateStockLevels(inventory)).toThrow(BusinessRuleError);
      expect(() => validateStockLevels(inventory)).toThrow(
        'Reorder point cannot be greater than maximum stock level',
      );
    });

    it('should pass when inventory is undefined', () => {
      expect(() => validateStockLevels(undefined)).not.toThrow();
    });

    it('should pass when only some fields are defined', () => {
      const inventory = {
        minStockLevel: 10,
      };

      expect(() => validateStockLevels(inventory)).not.toThrow();
    });
  });

  describe('validateCreditLimit', () => {
    it('should pass when transaction is within credit limit', () => {
      const account = {
        businessDetails: {
          creditAmountLimit: 10000,
        },
        currentBalance: 3000,
      };

      expect(() => validateCreditLimit(account, 5000)).not.toThrow();
    });

    it('should throw error when transaction exceeds credit limit', () => {
      const account = {
        businessDetails: {
          creditAmountLimit: 10000,
        },
        currentBalance: 8000,
      };

      expect(() => validateCreditLimit(account, 5000)).toThrow(BusinessRuleError);
      expect(() => validateCreditLimit(account, 5000)).toThrow('exceeds credit limit');
    });

    it('should pass when no credit limit is set', () => {
      const account = {
        businessDetails: {},
        currentBalance: 5000,
      };

      expect(() => validateCreditLimit(account, 10000)).not.toThrow();
    });

    it('should pass when account has no business details', () => {
      const account = {
        currentBalance: 5000,
      };

      expect(() => validateCreditLimit(account, 10000)).not.toThrow();
    });

    it('should pass when account is undefined', () => {
      expect(() => validateCreditLimit(undefined, 5000)).not.toThrow();
    });
  });

  describe('checkCreditDaysExceeded', () => {
    it('should return exceeded true when credit days are exceeded', () => {
      const account = {
        businessDetails: {
          creditDaysLimit: 30,
        },
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

      const result = checkCreditDaysExceeded(account, oldDate);

      expect(result.exceeded).toBe(true);
      expect(result.daysPassed).toBeGreaterThan(30);
      expect(result.overdueBy).toBeGreaterThan(0);
    });

    it('should return exceeded false when within credit days', () => {
      const account = {
        businessDetails: {
          creditDaysLimit: 30,
        },
      };

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15); // 15 days ago

      const result = checkCreditDaysExceeded(account, recentDate);

      expect(result.exceeded).toBe(false);
    });

    it('should return exceeded false when no credit days limit', () => {
      const account = {
        businessDetails: {},
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const result = checkCreditDaysExceeded(account, oldDate);

      expect(result.exceeded).toBe(false);
    });
  });

  describe('validateUnique', () => {
    it('should pass when value is unique', async () => {
      const MockModel = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      await expect(
        validateUnique(MockModel, 'name', 'Unique Name'),
      ).resolves.toBe(true);

      expect(MockModel.findOne).toHaveBeenCalledWith({ name: 'Unique Name' });
    });

    it('should throw error when value already exists', async () => {
      const MockModel = {
        findOne: jest.fn().mockResolvedValue({ name: 'Existing Name' }),
      };

      await expect(
        validateUnique(MockModel, 'name', 'Existing Name'),
      ).rejects.toThrow(DuplicateEntryError);
    });

    it('should exclude current document when updating', async () => {
      const MockModel = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const currentId = '507f1f77bcf86cd799439011';

      await expect(
        validateUnique(MockModel, 'name', 'Name', currentId),
      ).resolves.toBe(true);

      expect(MockModel.findOne).toHaveBeenCalledWith({
        name: 'Name',
        _id: { $ne: currentId },
      });
    });
  });

  describe('validateCompanyCanDelete', () => {
    it('should pass when company has no active items', async () => {
      const MockItem = {
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      await expect(
        validateCompanyCanDelete('companyId', MockItem),
      ).resolves.toBe(true);
    });

    it('should throw error when company has active items', async () => {
      const MockItem = {
        countDocuments: jest.fn().mockResolvedValue(5),
      };

      await expect(
        validateCompanyCanDelete('companyId', MockItem),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateCompanyCanDelete('companyId', MockItem),
      ).rejects.toThrow('Cannot delete company');
    });
  });

  describe('validateDateNotFuture', () => {
    it('should pass when date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      expect(() => validateDateNotFuture(pastDate)).not.toThrow();
    });

    it('should pass when date is today', () => {
      const today = new Date();

      expect(() => validateDateNotFuture(today)).not.toThrow();
    });

    it('should throw error when date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      expect(() => validateDateNotFuture(futureDate)).toThrow(BusinessRuleError);
      expect(() => validateDateNotFuture(futureDate)).toThrow('cannot be in the future');
    });

    it('should pass when date is undefined', () => {
      expect(() => validateDateNotFuture(undefined)).not.toThrow();
    });
  });

  describe('validateDateRange', () => {
    it('should pass when start date is before end date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      expect(() => validateDateRange(startDate, endDate)).not.toThrow();
    });

    it('should pass when dates are the same', () => {
      const date = new Date('2024-01-01');

      expect(() => validateDateRange(date, date)).not.toThrow();
    });

    it('should throw error when start date is after end date', () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      expect(() => validateDateRange(startDate, endDate)).toThrow(BusinessRuleError);
      expect(() => validateDateRange(startDate, endDate)).toThrow('cannot be after');
    });

    it('should pass when dates are undefined', () => {
      expect(() => validateDateRange(undefined, undefined)).not.toThrow();
    });
  });

  describe('validateAccountTypeFields', () => {
    it('should pass for employee account with designation', () => {
      const data = {
        employeeBiodata: {
          designationId: '507f1f77bcf86cd799439011',
        },
      };

      expect(() => validateAccountTypeFields('employee', data)).not.toThrow();
    });

    it('should throw error for employee account without designation', () => {
      const data = {
        employeeBiodata: {},
      };

      expect(() => validateAccountTypeFields('employee', data)).toThrow(BusinessRuleError);
      expect(() => validateAccountTypeFields('employee', data)).toThrow(
        'Employee accounts must have designation',
      );
    });

    it('should pass for customer account with business details', () => {
      const data = {
        businessDetails: {
          customerType: 'retailer',
        },
      };

      expect(() => validateAccountTypeFields('customer', data)).not.toThrow();
    });

    it('should throw error for customer account without business details', () => {
      const data = {};

      expect(() => validateAccountTypeFields('customer', data)).toThrow(BusinessRuleError);
      expect(() => validateAccountTypeFields('customer', data)).toThrow(
        'Customer/Supplier accounts must have business details',
      );
    });
  });

  describe('validateSubAccountHierarchy', () => {
    it('should pass when parent account exists and is valid', async () => {
      const MockCustomer = {
        findById: jest.fn().mockResolvedValue({
          _id: 'parentId',
          name: 'Parent Account',
          parentAccountId: null,
        }),
      };

      await expect(
        validateSubAccountHierarchy('parentId', null, MockCustomer),
      ).resolves.toBe(true);
    });

    it('should throw error when parent account does not exist', async () => {
      const MockCustomer = {
        findById: jest.fn().mockResolvedValue(null),
      };

      await expect(
        validateSubAccountHierarchy('parentId', null, MockCustomer),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateSubAccountHierarchy('parentId', null, MockCustomer),
      ).rejects.toThrow('Parent account does not exist');
    });

    it('should throw error when account is its own parent', async () => {
      const MockCustomer = {
        findById: jest.fn().mockResolvedValue({
          _id: 'accountId',
          name: 'Account',
        }),
      };

      await expect(
        validateSubAccountHierarchy('accountId', 'accountId', MockCustomer),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateSubAccountHierarchy('accountId', 'accountId', MockCustomer),
      ).rejects.toThrow('Account cannot be its own parent');
    });

    it('should throw error when parent is already a sub-account', async () => {
      const MockCustomer = {
        findById: jest.fn().mockResolvedValue({
          _id: 'parentId',
          name: 'Parent Account',
          parentAccountId: 'grandparentId',
        }),
      };

      await expect(
        validateSubAccountHierarchy('parentId', null, MockCustomer),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateSubAccountHierarchy('parentId', null, MockCustomer),
      ).rejects.toThrow('Only one level of hierarchy is allowed');
    });

    it('should pass when parentAccountId is null', async () => {
      const MockCustomer = {
        findById: jest.fn(),
      };

      await expect(
        validateSubAccountHierarchy(null, null, MockCustomer),
      ).resolves.toBe(true);

      expect(MockCustomer.findById).not.toHaveBeenCalled();
    });
  });

  describe('validateCompanyActive', () => {
    it('should pass when company exists and is active', async () => {
      const MockCompany = {
        findById: jest.fn().mockResolvedValue({
          _id: 'companyId',
          name: 'Active Company',
          isActive: true,
        }),
      };

      await expect(
        validateCompanyActive('companyId', MockCompany),
      ).resolves.toBe(true);
    });

    it('should throw error when company does not exist', async () => {
      const MockCompany = {
        findById: jest.fn().mockResolvedValue(null),
      };

      await expect(
        validateCompanyActive('companyId', MockCompany),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateCompanyActive('companyId', MockCompany),
      ).rejects.toThrow('Company does not exist');
    });

    it('should throw error when company is inactive', async () => {
      const MockCompany = {
        findById: jest.fn().mockResolvedValue({
          _id: 'companyId',
          name: 'Inactive Company',
          isActive: false,
        }),
      };

      await expect(
        validateCompanyActive('companyId', MockCompany),
      ).rejects.toThrow(BusinessRuleError);

      await expect(
        validateCompanyActive('companyId', MockCompany),
      ).rejects.toThrow('Cannot assign items to inactive company');
    });
  });
});
