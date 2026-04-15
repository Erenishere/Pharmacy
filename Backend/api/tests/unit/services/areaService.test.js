const areaService = require('../../../src/services/areaService');
const Area = require('../../../src/models/area');
const Town = require('../../../src/models/town');
const Customer = require('../../../src/models/Customer');

jest.mock('../../../src/models/area');
jest.mock('../../../src/models/town');
jest.mock('../../../src/models/Customer');

describe('AreaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createArea', () => {
    it('should create a new area successfully', async () => {
      const areaData = {
        name: 'Test Area',
        townId: 'town123'
      };

      const mockArea = {
        _id: 'area123',
        ...areaData,
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      Town.findById = jest.fn().mockResolvedValue({ _id: 'town123', name: 'Test Town' });
      Area.findOne = jest.fn().mockResolvedValue(null);
      Area.mockImplementation(() => mockArea);
      Area.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockArea)
        })
      });

      const result = await areaService.createArea(areaData, 'user123');

      expect(result).toBeDefined();
      expect(mockArea.save).toHaveBeenCalled();
    });

    it('should throw error if area name is missing', async () => {
      await expect(
        areaService.createArea({ townId: 'town123' }, 'user123')
      ).rejects.toThrow('Area name is required');
    });

    it('should throw error if town reference is missing', async () => {
      await expect(
        areaService.createArea({ name: 'Test Area' }, 'user123')
      ).rejects.toThrow('Town reference is required');
    });
  });

  describe('getAreasByTown', () => {
    it('should return areas for a specific town', async () => {
      const mockAreas = [
        { _id: '1', name: 'Area 1', townId: 'town123' },
        { _id: '2', name: 'Area 2', townId: 'town123' }
      ];

      Area.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockAreas)
        })
      });

      const result = await areaService.getAreasByTown('town123');

      expect(result).toHaveLength(2);
    });
  });

  describe('deleteArea', () => {
    it('should throw error if area has associated accounts', async () => {
      const mockArea = {
        _id: 'area123',
        name: 'Test Area',
        isActive: true
      };

      Area.findById = jest.fn().mockResolvedValue(mockArea);
      Customer.countDocuments = jest.fn().mockResolvedValue(3);

      await expect(
        areaService.deleteArea('area123')
      ).rejects.toThrow('Cannot delete area with associated accounts');
    });
  });
});
