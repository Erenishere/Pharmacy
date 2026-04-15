const townService = require('../../../src/services/townService');
const Town = require('../../../src/models/town');
const Area = require('../../../src/models/area');
const Customer = require('../../../src/models/Customer');

// Mock the models
jest.mock('../../../src/models/town');
jest.mock('../../../src/models/area');
jest.mock('../../../src/models/Customer');

describe('TownService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTown', () => {
    it('should create a new town successfully', async () => {
      const townData = {
        name: 'Test Town',
        region: 'Test Region'
      };

      const mockTown = {
        _id: 'town123',
        ...townData,
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      Town.findOne = jest.fn().mockResolvedValue(null);
      Town.mockImplementation(() => mockTown);
      Town.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTown)
      });

      const result = await townService.createTown(townData, 'user123');

      expect(result).toBeDefined();
      expect(mockTown.save).toHaveBeenCalled();
    });

    it('should throw error if town name is missing', async () => {
      const townData = { region: 'Test Region' };

      await expect(
        townService.createTown(townData, 'user123')
      ).rejects.toThrow('Town name is required');
    });

    it('should throw error if town name already exists', async () => {
      const townData = { name: 'Existing Town' };

      Town.findOne = jest.fn().mockResolvedValue({ name: 'Existing Town' });

      await expect(
        townService.createTown(townData, 'user123')
      ).rejects.toThrow('Town with this name already exists');
    });
  });

  describe('getTowns', () => {
    it('should return paginated towns', async () => {
      const mockTowns = [
        { _id: '1', name: 'Town 1', isActive: true },
        { _id: '2', name: 'Town 2', isActive: true }
      ];

      Town.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTowns)
            })
          })
        })
      });

      Town.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await townService.getTowns({}, { page: 1, limit: 10 });

      expect(result.towns).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe('getTownById', () => {
    it('should return town by ID', async () => {
      const mockTown = {
        _id: 'town123',
        name: 'Test Town',
        isActive: true
      };

      Town.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTown)
      });

      const result = await townService.getTownById('town123');

      expect(result).toEqual(mockTown);
    });

    it('should throw error if town not found', async () => {
      Town.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(
        townService.getTownById('nonexistent')
      ).rejects.toThrow('Town not found');
    });
  });

  describe('deleteTown', () => {
    it('should soft delete town when no dependencies exist', async () => {
      const mockTown = {
        _id: 'town123',
        name: 'Test Town',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      Town.findById = jest.fn()
        .mockResolvedValueOnce(mockTown)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({ ...mockTown, isActive: false })
        });
      Area.countDocuments = jest.fn().mockResolvedValue(0);
      Customer.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await townService.deleteTown('town123');

      expect(mockTown.save).toHaveBeenCalled();
      expect(mockTown.isActive).toBe(false);
    });

    it('should throw error if town has associated areas', async () => {
      const mockTown = {
        _id: 'town123',
        name: 'Test Town',
        isActive: true
      };

      Town.findById = jest.fn().mockResolvedValue(mockTown);
      Area.countDocuments = jest.fn().mockResolvedValue(3);

      await expect(
        townService.deleteTown('town123')
      ).rejects.toThrow('Cannot delete town with associated areas');
    });

    it('should throw error if town has associated accounts', async () => {
      const mockTown = {
        _id: 'town123',
        name: 'Test Town',
        isActive: true
      };

      Town.findById = jest.fn().mockResolvedValue(mockTown);
      Area.countDocuments = jest.fn().mockResolvedValue(0);
      Customer.countDocuments = jest.fn().mockResolvedValue(5);

      await expect(
        townService.deleteTown('town123')
      ).rejects.toThrow('Cannot delete town with associated accounts');
    });
  });
});
