const investorService = require('../../src/services/investorService');
const Account = require('../../src/models/Account');
const Capital = require('../../src/models/Capital');

jest.mock('../../src/models/Account');
jest.mock('../../src/models/Capital');

describe('InvestorService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvestor', () => {
    it('should create investor account successfully', async () => {
      const investorData = {
        name: 'John Investor',
        code: 'INV001',
        contactPerson: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        openingBalance: 100000,
      };

      const mockAccount = {
        _id: 'investor1',
        ...investorData,
        type: 'equity',
        category: 'capital',
        balance: 100000,
        save: jest.fn().mockResolvedValue(true),
      };

      Account.mockImplementation(() => mockAccount);

      const result = await investorService.createInvestor(investorData);

      expect(result.name).toBe('John Investor');
      expect(result.type).toBe('equity');
      expect(result.category).toBe('capital');
      expect(result.balance).toBe(100000);
      expect(mockAccount.save).toHaveBeenCalled();
    });
  });

  describe('getAllInvestors', () => {
    it('should return all investor accounts', async () => {
      const mockInvestors = [
        {
          _id: 'investor1',
          code: 'INV001',
          name: 'Investor 1',
          type: 'equity',
          category: 'capital',
          metadata: { accountType: 'investor' },
        },
        {
          _id: 'investor2',
          code: 'INV002',
          name: 'Investor 2',
          type: 'equity',
          category: 'capital',
          metadata: { accountType: 'investor' },
        },
      ];

      Account.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInvestors),
      });

      const result = await investorService.getAllInvestors();

      expect(result).toHaveLength(2);
      expect(Account.find).toHaveBeenCalledWith({
        type: 'equity',
        category: 'capital',
        'metadata.accountType': 'investor',
      });
    });
  });

  describe('getInvestorById', () => {
    it('should return investor by ID', async () => {
      const mockInvestor = {
        _id: 'investor1',
        name: 'Investor 1',
        type: 'equity',
        metadata: { accountType: 'investor' },
      };

      Account.findById = jest.fn().mockResolvedValue(mockInvestor);

      const result = await investorService.getInvestorById('investor1');

      expect(result.name).toBe('Investor 1');
      expect(Account.findById).toHaveBeenCalledWith('investor1');
    });

    it('should throw error if investor not found', async () => {
      Account.findById = jest.fn().mockResolvedValue(null);

      await expect(investorService.getInvestorById('invalid')).rejects.toThrow('Investor not found');
    });
  });

  describe('deleteInvestor', () => {
    it('should deactivate investor if no transactions exist', async () => {
      const mockInvestor = {
        _id: 'investor1',
        isActive: true,
        metadata: { accountType: 'investor' },
        save: jest.fn().mockResolvedValue(true),
      };

      Account.findById = jest.fn().mockResolvedValue(mockInvestor);
      Capital.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await investorService.deleteInvestor('investor1');

      expect(result.message).toContain('deactivated');
      expect(mockInvestor.isActive).toBe(false);
      expect(mockInvestor.save).toHaveBeenCalled();
    });

    it('should throw error if investor has transactions', async () => {
      const mockInvestor = {
        _id: 'investor1',
        metadata: { accountType: 'investor' },
      };

      Account.findById = jest.fn().mockResolvedValue(mockInvestor);
      Capital.countDocuments = jest.fn().mockResolvedValue(5);

      await expect(investorService.deleteInvestor('investor1')).rejects.toThrow(
        'Cannot delete investor with existing capital transactions'
      );
    });
  });
});
