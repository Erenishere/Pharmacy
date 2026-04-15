const accountService = require('../../src/services/accountService');
const Customer = require('../../src/models/Customer');
const LedgerEntry = require('../../src/models/LedgerEntry');
const customerRepository = require('../../src/repositories/customerRepository');

// Mock dependencies
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/LedgerEntry');
jest.mock('../../src/repositories/customerRepository');

describe('AccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should create a customer account with valid data', async () => {
      const accountData = {
        name: 'Test Customer',
        accountType: 'customer',
        contactInfo: {
          email: 'test@example.com',
          phone1: '1234567890',
        },
        businessDetails: {
          customerType: 'retailer',
          creditAmountLimit: 50000,
          creditDaysLimit: 30,
        },
      };

      const createdAccount = {
        _id: '507f1f77bcf86cd799439012',
        ...accountData,
        code: 'CUST000001',
        isActive: true,
      };

      customerRepository.create.mockResolvedValue(createdAccount);

      const result = await accountService.createAccount(accountData, userId);

      expect(customerRepository.create).toHaveBeenCalledWith(accountData);
      expect(result).toEqual(createdAccount);
    });

    it('should create an employee account with biodata', async () => {
      const accountData = {
        name: 'John Doe',
        accountType: 'employee',
        contactInfo: {
          email: 'john@example.com',
          nicNumber: '12345-1234567-1',
        },
        employeeBiodata: {
          fatherName: 'Father Name',
          dateOfAppointment: new Date('2024-01-01'),
          basicPay: 50000,
          bloodGroup: 'O+',
        },
      };

      const createdAccount = {
        _id: '507f1f77bcf86cd799439013',
        ...accountData,
        code: 'EMP000001',
        isActive: true,
      };

      customerRepository.create.mockResolvedValue(createdAccount);

      const result = await accountService.createAccount(accountData, userId);

      expect(customerRepository.create).toHaveBeenCalledWith(accountData);
      expect(result).toEqual(createdAccount);
    });

    it('should create account with opening balance and ledger entry', async () => {
      const accountData = {
        name: 'Test Account',
        accountType: 'customer',
        businessDetails: {
          openingBalance: 10000,
          balanceType: 'debit',
        },
      };

      const createdAccount = {
        _id: '507f1f77bcf86cd799439014',
        ...accountData,
        currentBalance: 10000,
        code: 'CUST000002',
      };

      customerRepository.create.mockResolvedValue(createdAccount);
      LedgerEntry.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439015',
        accountId: createdAccount._id,
        transactionType: 'debit',
        amount: 10000,
      });

      const result = await accountService.createAccount(accountData, userId);

      expect(customerRepository.create).toHaveBeenCalled();
      expect(LedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: createdAccount._id,
          transactionType: 'debit',
          amount: 10000,
          referenceType: 'opening_balance',
        })
      );
      expect(result).toEqual(createdAccount);
    });

    it('should throw error if account name is missing', async () => {
      const accountData = {
        accountType: 'customer',
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Account name is required'
      );
    });

    it('should throw error if account type is missing', async () => {
      const accountData = {
        name: 'Test Account',
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Account type is required'
      );
    });

    it('should throw error for invalid account type', async () => {
      const accountData = {
        name: 'Test Account',
        accountType: 'invalid_type',
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Invalid account type'
      );
    });

    it('should throw error if parent account not found', async () => {
      const accountData = {
        name: 'Sub Account',
        accountType: 'customer',
        parentAccountId: '507f1f77bcf86cd799439016',
      };

      customerRepository.findById.mockResolvedValue(null);

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Parent account not found'
      );
    });

    it('should throw error if parent account is inactive', async () => {
      const accountData = {
        name: 'Sub Account',
        accountType: 'customer',
        parentAccountId: '507f1f77bcf86cd799439016',
      };

      customerRepository.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439016',
        isActive: false,
      });

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Parent account is not active'
      );
    });

    it('should throw error for invalid email format', async () => {
      const accountData = {
        name: 'Test Account',
        accountType: 'customer',
        contactInfo: {
          email: 'invalid-email',
        },
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Invalid email format'
      );
    });

    it('should throw error for negative credit amount limit', async () => {
      const accountData = {
        name: 'Test Account',
        accountType: 'customer',
        businessDetails: {
          creditAmountLimit: -1000,
        },
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Credit amount limit cannot be negative'
      );
    });

    it('should throw error for invalid credit days limit', async () => {
      const accountData = {
        name: 'Test Account',
        accountType: 'customer',
        businessDetails: {
          creditDaysLimit: 400,
        },
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Credit days limit must be between 0 and 365'
      );
    });

    it('should throw error for invalid blood group', async () => {
      const accountData = {
        name: 'Employee',
        accountType: 'employee',
        employeeBiodata: {
          bloodGroup: 'Invalid',
        },
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Invalid blood group'
      );
    });

    it('should throw error for negative basic pay', async () => {
      const accountData = {
        name: 'Employee',
        accountType: 'employee',
        employeeBiodata: {
          basicPay: -5000,
        },
      };

      await expect(accountService.createAccount(accountData, userId)).rejects.toThrow(
        'Basic pay cannot be negative'
      );
    });
  });

  describe('getAccounts', () => {
    it('should get accounts with pagination', async () => {
      const filters = { accountType: 'customer' };
      const options = { page: 1, limit: 10 };

      const mockAccounts = [
        { _id: '1', name: 'Account 1', accountType: 'customer' },
        { _id: '2', name: 'Account 2', accountType: 'customer' },
      ];

      customerRepository.search.mockResolvedValue(mockAccounts);
      customerRepository.count.mockResolvedValue(2);

      const result = await accountService.getAccounts(filters, options);

      expect(result.accounts).toEqual(mockAccounts);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
    });
  });

  describe('getAccountById', () => {
    it('should get account by ID with populated references', async () => {
      const accountId = '507f1f77bcf86cd799439011';
      const mockAccount = {
        _id: accountId,
        name: 'Test Account',
        accountType: 'customer',
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue(mockAccount);

      Customer.findById.mockReturnValue({
        populate: mockPopulate,
        lean: mockLean,
      });

      const result = await accountService.getAccountById(accountId);

      expect(Customer.findById).toHaveBeenCalledWith(accountId);
      expect(mockPopulate).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it('should throw error if account not found', async () => {
      const accountId = '507f1f77bcf86cd799439011';

      const mockPopulate = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue(null);

      Customer.findById.mockReturnValue({
        populate: mockPopulate,
        lean: mockLean,
      });

      await expect(accountService.getAccountById(accountId)).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('updateAccount', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should update account successfully', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const updateData = {
        name: 'Updated Name',
        contactInfo: {
          email: 'updated@example.com',
        },
      };

      const existingAccount = {
        _id: accountId,
        name: 'Old Name',
        accountType: 'customer',
      };

      const updatedAccount = {
        ...existingAccount,
        ...updateData,
      };

      customerRepository.findById.mockResolvedValue(existingAccount);
      customerRepository.update.mockResolvedValue(updatedAccount);

      const result = await accountService.updateAccount(accountId, updateData, userId);

      expect(customerRepository.update).toHaveBeenCalledWith(accountId, updateData);
      expect(result).toEqual(updatedAccount);
    });

    it('should throw error if account not found', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const updateData = { name: 'Updated Name' };

      customerRepository.findById.mockResolvedValue(null);

      await expect(
        accountService.updateAccount(accountId, updateData, userId)
      ).rejects.toThrow('Account not found');
    });

    it('should throw error for circular parent reference', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const updateData = {
        parentAccountId: accountId,
      };

      const existingAccount = {
        _id: accountId,
        name: 'Account',
        accountType: 'customer',
      };

      customerRepository.findById.mockResolvedValue(existingAccount);

      await expect(
        accountService.updateAccount(accountId, updateData, userId)
      ).rejects.toThrow('Account cannot be its own parent');
    });

    it('should throw error for circular hierarchy', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const parentId = '507f1f77bcf86cd799439013';
      const updateData = {
        parentAccountId: parentId,
      };

      const existingAccount = {
        _id: accountId,
        name: 'Account',
        accountType: 'customer',
      };

      const parentAccount = {
        _id: parentId,
        name: 'Parent',
        parentAccountId: accountId,
        isActive: true,
      };

      customerRepository.findById
        .mockResolvedValueOnce(existingAccount)
        .mockResolvedValueOnce(parentAccount);

      await expect(
        accountService.updateAccount(accountId, updateData, userId)
      ).rejects.toThrow('Cannot create circular account hierarchy');
    });
  });

  describe('deleteAccount', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should delete account with no transactions', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        name: 'Test Account',
      };

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.countDocuments.mockResolvedValue(0);
      Customer.countDocuments.mockResolvedValue(0);
      customerRepository.softDelete.mockResolvedValue({ ...account, isActive: false });

      const result = await accountService.deleteAccount(accountId, userId);

      expect(customerRepository.softDelete).toHaveBeenCalledWith(accountId);
      expect(result.isActive).toBe(false);
    });

    it('should throw error if account has transactions', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        name: 'Test Account',
      };

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.countDocuments.mockResolvedValue(5);

      await expect(accountService.deleteAccount(accountId, userId)).rejects.toThrow(
        'Cannot delete account with existing transactions'
      );
    });

    it('should throw error if account has sub-accounts', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        name: 'Test Account',
      };

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.countDocuments.mockResolvedValue(0);
      Customer.countDocuments.mockResolvedValue(2);

      await expect(accountService.deleteAccount(accountId, userId)).rejects.toThrow(
        'Cannot delete account with sub-accounts'
      );
    });
  });

  describe('checkCreditLimit', () => {
    it('should return credit limit status for account with limit', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        currentBalance: 30000,
        businessDetails: {
          creditAmountLimit: 50000,
        },
      };

      customerRepository.findById.mockResolvedValue(account);

      const result = await accountService.checkCreditLimit(accountId, 15000);

      expect(result.hasLimit).toBe(true);
      expect(result.limitExceeded).toBe(false);
      expect(result.creditLimit).toBe(50000);
      expect(result.availableCredit).toBe(20000);
    });

    it('should detect credit limit exceeded', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        currentBalance: 45000,
        businessDetails: {
          creditAmountLimit: 50000,
        },
      };

      customerRepository.findById.mockResolvedValue(account);

      const result = await accountService.checkCreditLimit(accountId, 10000);

      expect(result.limitExceeded).toBe(true);
      expect(result.totalAmount).toBe(55000);
    });

    it('should return no limit for account without credit limit', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        currentBalance: 10000,
        businessDetails: {},
      };

      customerRepository.findById.mockResolvedValue(account);

      const result = await accountService.checkCreditLimit(accountId);

      expect(result.hasLimit).toBe(false);
      expect(result.limitExceeded).toBe(false);
    });
  });

  describe('updateAccountBalance', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should update account balance with debit transaction', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        currentBalance: 10000,
        isActive: true,
      };

      const ledgerEntry = {
        _id: '507f1f77bcf86cd799439013',
        accountId,
        transactionType: 'debit',
        amount: 5000,
      };

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.create.mockResolvedValue(ledgerEntry);
      customerRepository.update.mockResolvedValue({ ...account, currentBalance: 15000 });

      const result = await accountService.updateAccountBalance(
        accountId,
        5000,
        'debit',
        'Test transaction',
        'adjustment',
        null,
        userId
      );

      expect(result.newBalance).toBe(15000);
      expect(LedgerEntry.create).toHaveBeenCalled();
    });

    it('should update account balance with credit transaction', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        currentBalance: 10000,
        isActive: true,
      };

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.create.mockResolvedValue({});
      customerRepository.update.mockResolvedValue({ ...account, currentBalance: 5000 });

      const result = await accountService.updateAccountBalance(
        accountId,
        5000,
        'credit',
        'Test transaction',
        'adjustment',
        null,
        userId
      );

      expect(result.newBalance).toBe(5000);
    });

    it('should throw error for inactive account', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        isActive: false,
      };

      customerRepository.findById.mockResolvedValue(account);

      await expect(
        accountService.updateAccountBalance(
          accountId,
          5000,
          'debit',
          'Test',
          'adjustment',
          null,
          userId
        )
      ).rejects.toThrow('Cannot update balance for inactive account');
    });

    it('should throw error for invalid amount', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        isActive: true,
      };

      customerRepository.findById.mockResolvedValue(account);

      await expect(
        accountService.updateAccountBalance(
          accountId,
          -100,
          'debit',
          'Test',
          'adjustment',
          null,
          userId
        )
      ).rejects.toThrow('Amount must be greater than zero');
    });
  });

  describe('getAccountLedger', () => {
    it('should get account ledger with pagination', async () => {
      const accountId = '507f1f77bcf86cd799439012';
      const account = {
        _id: accountId,
        name: 'Test Account',
        code: 'ACC001',
        accountType: 'customer',
      };

      const mockEntries = [
        {
          _id: '1',
          transactionType: 'debit',
          amount: 1000,
          transactionDate: new Date(),
        },
        {
          _id: '2',
          transactionType: 'credit',
          amount: 500,
          transactionDate: new Date(),
        },
      ];

      customerRepository.findById.mockResolvedValue(account);
      LedgerEntry.calculateAccountBalance.mockResolvedValue(0);
      
      const mockFind = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockSkip = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockPopulate = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue(mockEntries);

      LedgerEntry.find.mockReturnValue({
        sort: mockSort,
        skip: mockSkip,
        limit: mockLimit,
        populate: mockPopulate,
        lean: mockLean,
      });

      LedgerEntry.countDocuments.mockResolvedValue(2);

      const result = await accountService.getAccountLedger(accountId, null, null, 1, 50);

      expect(result.account.name).toBe('Test Account');
      expect(result.entries).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe('getAccountsByType', () => {
    it('should get accounts by type', async () => {
      const mockAccounts = [
        { _id: '1', name: 'Account 1', accountType: 'customer' },
        { _id: '2', name: 'Account 2', accountType: 'customer' },
      ];

      const mockFind = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue(mockAccounts);

      Customer.find.mockReturnValue({
        sort: mockSort,
        lean: mockLean,
      });

      const result = await accountService.getAccountsByType('customer');

      expect(Customer.find).toHaveBeenCalledWith({ accountType: 'customer', isActive: true });
      expect(result).toEqual(mockAccounts);
    });

    it('should throw error for invalid account type', async () => {
      await expect(accountService.getAccountsByType('invalid')).rejects.toThrow(
        'Invalid account type'
      );
    });
  });

  describe('getSubAccounts', () => {
    it('should get sub-accounts of parent account', async () => {
      const parentId = '507f1f77bcf86cd799439012';
      const parentAccount = {
        _id: parentId,
        name: 'Parent Account',
      };

      const mockSubAccounts = [
        { _id: '1', name: 'Sub Account 1', parentAccountId: parentId },
        { _id: '2', name: 'Sub Account 2', parentAccountId: parentId },
      ];

      customerRepository.findById.mockResolvedValue(parentAccount);

      const mockFind = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue(mockSubAccounts);

      Customer.find.mockReturnValue({
        sort: mockSort,
        lean: mockLean,
      });

      const result = await accountService.getSubAccounts(parentId);

      expect(Customer.find).toHaveBeenCalledWith({ parentAccountId: parentId, isActive: true });
      expect(result).toEqual(mockSubAccounts);
    });

    it('should throw error if parent account not found', async () => {
      const parentId = '507f1f77bcf86cd799439012';

      customerRepository.findById.mockResolvedValue(null);

      await expect(accountService.getSubAccounts(parentId)).rejects.toThrow(
        'Parent account not found'
      );
    });
  });
});
