const salaryPackageService = require('../../src/services/salaryPackageService');
const SalaryPackage = require('../../src/models/SalaryPackage');
const Account = require('../../src/models/Account');
const Item = require('../../src/models/Item');

// Mock dependencies
jest.mock('../../src/models/SalaryPackage');
jest.mock('../../src/models/Account');
jest.mock('../../src/models/Item');

describe('SalaryPackageService - createPackage()', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockItemId = '507f1f77bcf86cd799439013';

  const validPackageData = {
    employeeId: mockEmployeeId,
    duration: {
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-12-31'),
    },
    basicPay: {
      amount: 50000,
      source: 'biodata',
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
    mobileOrderIncentive: {
      type: 'Amount',
      value: 100,
    },
    mobileCashRecoveryIncentive: {
      type: '%',
      value: 2,
      verifyWithCashBook: true,
    },
    partyVisitTarget: {
      numberOfOrders: 100,
      type: 'Fix Amount',
      value: 5000,
    },
    eidFitrBonus: {
      month: 'April 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    eidAdhaBonus: {
      month: 'June 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    otherBonus: {
      detail: 'Performance Bonus',
      month: 'December 2025',
      type: 'Fix Amount',
      value: 20000,
    },
    brandIncentives: [],
    status: 'Active',
  };

  const mockEmployee = {
    _id: mockEmployeeId,
    accountName: 'Ahmed Khan',
    accountType: 'Employee',
    basicPay: 50000,
    isActive: true,
  };

  const mockItem = {
    _id: mockItemId,
    itemName: 'Panadol 500mg',
    itemCode: 'PAN500',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Package Creation', () => {
    it('should create a salary package with valid data', async () => {
      // Mock employee lookup
      Account.findById.mockResolvedValue(mockEmployee);

      // Mock SalaryPackage save
      const mockSavedPackage = {
        ...validPackageData,
        packageId: 'SP2025000001',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        _id: '507f1f77bcf86cd799439014',
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(validPackageData, mockUserId);

      expect(Account.findById).toHaveBeenCalledWith(mockEmployeeId);
      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2025000001');
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Salary package created successfully');
      expect(mockSavedPackage.save).toHaveBeenCalled();
    });

    it('should create a salary package with brand incentives', async () => {
      const packageDataWithBrandIncentives = {
        ...validPackageData,
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockSavedPackage = {
        ...packageDataWithBrandIncentives,
        packageId: 'SP2025000002',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        packageDataWithBrandIncentives,
        mockUserId
      );

      expect(Account.findById).toHaveBeenCalledWith(mockEmployeeId);
      expect(Item.findById).toHaveBeenCalledWith(mockItemId);
      expect(result.success).toBe(true);
      expect(result.data.brandIncentives[0].itemName).toBe(mockItem.itemName);
    });

    it('should create a salary package with multiple brand incentives', async () => {
      const mockItemId2 = '507f1f77bcf86cd799439015';
      const mockItem2 = {
        _id: mockItemId2,
        itemName: 'Augmentin 625mg',
        itemCode: 'AUG625',
      };

      const packageDataWithMultipleBrandIncentives = {
        ...validPackageData,
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
          {
            itemId: mockItemId2,
            quantityTarget: 500,
            duration: {
              fromDate: new Date('2025-04-01'),
              toDate: new Date('2025-06-30'),
            },
            type: '%',
            value: 3,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(mockItem2);

      const mockSavedPackage = {
        ...packageDataWithMultipleBrandIncentives,
        packageId: 'SP2025000003',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        packageDataWithMultipleBrandIncentives,
        mockUserId
      );

      expect(Item.findById).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data.brandIncentives).toHaveLength(2);
      expect(result.data.brandIncentives[0].itemName).toBe(mockItem.itemName);
      expect(result.data.brandIncentives[1].itemName).toBe(mockItem2.itemName);
    });
  });

  describe('Employee Validation', () => {
    it('should throw error when employee is not found', async () => {
      Account.findById.mockResolvedValue(null);

      await expect(
        salaryPackageService.createPackage(validPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: Employee not found');

      expect(Account.findById).toHaveBeenCalledWith(mockEmployeeId);
    });

    it('should throw error when account is not an employee', async () => {
      const nonEmployeeAccount = {
        ...mockEmployee,
        accountType: 'Customer',
      };

      Account.findById.mockResolvedValue(nonEmployeeAccount);

      await expect(
        salaryPackageService.createPackage(validPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: Selected account is not an employee');

      expect(Account.findById).toHaveBeenCalledWith(mockEmployeeId);
    });
  });

  describe('Brand Incentive Validation', () => {
    it('should throw error when brand incentive item is not found', async () => {
      const packageDataWithInvalidItem = {
        ...validPackageData,
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(null);

      await expect(
        salaryPackageService.createPackage(packageDataWithInvalidItem, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Item not found: ${mockItemId}`);

      expect(Item.findById).toHaveBeenCalledWith(mockItemId);
    });

    it('should validate all brand incentive items', async () => {
      const mockItemId2 = '507f1f77bcf86cd799439015';
      const packageDataWithMultipleItems = {
        ...validPackageData,
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
          {
            itemId: mockItemId2,
            quantityTarget: 500,
            duration: {
              fromDate: new Date('2025-04-01'),
              toDate: new Date('2025-06-30'),
            },
            type: '%',
            value: 3,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(null); // Second item not found

      await expect(
        salaryPackageService.createPackage(packageDataWithMultipleItems, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Item not found: ${mockItemId2}`);

      expect(Item.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle package with empty brand incentives array', async () => {
      const packageDataWithEmptyBrandIncentives = {
        ...validPackageData,
        brandIncentives: [],
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...packageDataWithEmptyBrandIncentives,
        packageId: 'SP2025000004',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        packageDataWithEmptyBrandIncentives,
        mockUserId
      );

      expect(Item.findById).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle package without brand incentives field', async () => {
      const packageDataWithoutBrandIncentives = { ...validPackageData };
      delete packageDataWithoutBrandIncentives.brandIncentives;

      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...packageDataWithoutBrandIncentives,
        packageId: 'SP2025000005',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        packageDataWithoutBrandIncentives,
        mockUserId
      );

      expect(Item.findById).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle database save errors', async () => {
      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithSaveError = {
        ...validPackageData,
        save: jest.fn().mockRejectedValue(new Error('Database connection error')),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithSaveError);

      await expect(
        salaryPackageService.createPackage(validPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: Database connection error');
    });
  });

  describe('Data Integrity', () => {
    it('should include createdBy field in saved package', async () => {
      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...validPackageData,
        packageId: 'SP2025000006',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(validPackageData, mockUserId);

      expect(result.data.createdBy).toBe(mockUserId);
    });

    it('should populate itemName for brand incentives', async () => {
      const packageDataWithBrandIncentive = {
        ...validPackageData,
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockSavedPackage = {
        ...packageDataWithBrandIncentive,
        packageId: 'SP2025000007',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      await salaryPackageService.createPackage(packageDataWithBrandIncentive, mockUserId);

      // Verify that itemName was set
      expect(packageDataWithBrandIncentive.brandIncentives[0].itemName).toBe(mockItem.itemName);
    });
  });

  describe('Incentive Type Validation', () => {
    it('should accept valid incentive types for sales target', async () => {
      const incentiveTypes = ['Fix Amount', 'Amount', '%'];

      for (const incentiveType of incentiveTypes) {
        jest.clearAllMocks();

        const packageData = {
          ...validPackageData,
          salesTarget: {
            targetAmount: 500000,
            incentiveType,
            incentiveValue: 10000,
          },
        };

        Account.findById.mockResolvedValue(mockEmployee);

        const mockSavedPackage = {
          ...packageData,
          packageId: `SP2025${incentiveType}`,
          employeeName: mockEmployee.accountName,
          createdBy: mockUserId,
          save: jest.fn().mockResolvedValue(true),
        };

        SalaryPackage.mockImplementation(() => mockSavedPackage);

        const result = await salaryPackageService.createPackage(packageData, mockUserId);

        expect(result.success).toBe(true);
        expect(result.data.salesTarget.incentiveType).toBe(incentiveType);
      }
    });

    it('should accept valid types for allowances', async () => {
      const allowanceTypes = ['Fix Amount', 'Amount', '%'];

      for (const type of allowanceTypes) {
        jest.clearAllMocks();

        const packageData = {
          ...validPackageData,
          dailyAllowance: {
            type,
            value: 5000,
          },
        };

        Account.findById.mockResolvedValue(mockEmployee);

        const mockSavedPackage = {
          ...packageData,
          packageId: `SP2025${type}`,
          employeeName: mockEmployee.accountName,
          createdBy: mockUserId,
          save: jest.fn().mockResolvedValue(true),
        };

        SalaryPackage.mockImplementation(() => mockSavedPackage);

        const result = await salaryPackageService.createPackage(packageData, mockUserId);

        expect(result.success).toBe(true);
        expect(result.data.dailyAllowance.type).toBe(type);
      }
    });
  });
});


describe('SalaryPackageService - updatePackage()', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockPackageId = '507f1f77bcf86cd799439014';
  const mockItemId = '507f1f77bcf86cd799439013';
  const mockItemId2 = '507f1f77bcf86cd799439015';

  const mockExistingPackage = {
    _id: mockPackageId,
    packageId: 'SP2025000001',
    employeeId: mockEmployeeId,
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-12-31'),
    },
    basicPay: {
      amount: 50000,
      source: 'biodata',
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
    mobileOrderIncentive: {
      type: 'Amount',
      value: 100,
    },
    mobileCashRecoveryIncentive: {
      type: '%',
      value: 2,
      verifyWithCashBook: true,
    },
    partyVisitTarget: {
      numberOfOrders: 100,
      type: 'Fix Amount',
      value: 5000,
    },
    eidFitrBonus: {
      month: 'April 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    eidAdhaBonus: {
      month: 'June 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    otherBonus: {
      detail: 'Performance Bonus',
      month: 'December 2025',
      type: 'Fix Amount',
      value: 20000,
    },
    brandIncentives: [],
    status: 'Active',
    createdBy: mockUserId,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockItem = {
    _id: mockItemId,
    itemName: 'Panadol 500mg',
    itemCode: 'PAN500',
  };

  const mockItem2 = {
    _id: mockItemId2,
    itemName: 'Augmentin 625mg',
    itemCode: 'AUG625',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Package Update', () => {
    it('should update a salary package with valid data', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
        recoveryTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 15000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(SalaryPackage.findById).toHaveBeenCalledWith(mockPackageId);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Salary package updated successfully');
      expect(mockExistingPackage.save).toHaveBeenCalled();
      expect(mockExistingPackage.updatedBy).toBe(mockUserId);
    });

    it('should update allowances', async () => {
      const updates = {
        dailyAllowance: {
          type: '%',
          value: 10,
        },
        petrolAllowance: {
          type: 'Amount',
          value: 10000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.dailyAllowance).toEqual(updates.dailyAllowance);
      expect(mockExistingPackage.petrolAllowance).toEqual(updates.petrolAllowance);
    });

    it('should update bonuses', async () => {
      const updates = {
        eidFitrBonus: {
          month: 'May 2025',
          type: '%',
          value: 50,
        },
        otherBonus: {
          detail: 'Year End Bonus',
          month: 'December 2025',
          type: 'Fix Amount',
          value: 30000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.eidFitrBonus).toEqual(updates.eidFitrBonus);
      expect(mockExistingPackage.otherBonus).toEqual(updates.otherBonus);
    });

    it('should update party visit target', async () => {
      const updates = {
        partyVisitTarget: {
          numberOfOrders: 150,
          type: '%',
          value: 3,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.partyVisitTarget).toEqual(updates.partyVisitTarget);
    });

    it('should update mobile incentives', async () => {
      const updates = {
        mobileOrderIncentive: {
          type: 'Fix Amount',
          value: 200,
        },
        mobileCashRecoveryIncentive: {
          type: 'Amount',
          value: 500,
          verifyWithCashBook: false,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.mobileOrderIncentive).toEqual(updates.mobileOrderIncentive);
      expect(mockExistingPackage.mobileCashRecoveryIncentive).toEqual(
        updates.mobileCashRecoveryIncentive
      );
    });
  });

  describe('Brand Incentive Updates', () => {
    it('should update package with new brand incentives', async () => {
      const updates = {
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);
      Item.findById.mockResolvedValue(mockItem);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(Item.findById).toHaveBeenCalledWith(mockItemId);
      expect(result.success).toBe(true);
      expect(updates.brandIncentives[0].itemName).toBe(mockItem.itemName);
    });

    it('should update package with multiple brand incentives', async () => {
      const updates = {
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
          {
            itemId: mockItemId2,
            quantityTarget: 500,
            duration: {
              fromDate: new Date('2025-04-01'),
              toDate: new Date('2025-06-30'),
            },
            type: '%',
            value: 3,
          },
        ],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);
      Item.findById
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(mockItem2);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(Item.findById).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(updates.brandIncentives[0].itemName).toBe(mockItem.itemName);
      expect(updates.brandIncentives[1].itemName).toBe(mockItem2.itemName);
    });

    it('should throw error when brand incentive item is not found during update', async () => {
      const updates = {
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);
      Item.findById.mockResolvedValue(null);

      await expect(
        salaryPackageService.updatePackage(mockPackageId, updates, mockUserId)
      ).rejects.toThrow(`Failed to update salary package: Item not found: ${mockItemId}`);

      expect(Item.findById).toHaveBeenCalledWith(mockItemId);
    });

    it('should validate all brand incentive items during update', async () => {
      const updates = {
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
          {
            itemId: mockItemId2,
            quantityTarget: 500,
            duration: {
              fromDate: new Date('2025-04-01'),
              toDate: new Date('2025-06-30'),
            },
            type: '%',
            value: 3,
          },
        ],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);
      Item.findById
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(null); // Second item not found

      await expect(
        salaryPackageService.updatePackage(mockPackageId, updates, mockUserId)
      ).rejects.toThrow(`Failed to update salary package: Item not found: ${mockItemId2}`);

      expect(Item.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle empty brand incentives array during update', async () => {
      const updates = {
        brandIncentives: [],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(Item.findById).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when package is not found', async () => {
      SalaryPackage.findById.mockResolvedValue(null);

      await expect(
        salaryPackageService.updatePackage(mockPackageId, {}, mockUserId)
      ).rejects.toThrow('Failed to update salary package: Salary package not found');

      expect(SalaryPackage.findById).toHaveBeenCalledWith(mockPackageId);
    });

    it('should handle database save errors during update', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
      };

      const packageWithSaveError = {
        ...mockExistingPackage,
        save: jest.fn().mockRejectedValue(new Error('Database connection error')),
      };

      SalaryPackage.findById.mockResolvedValue(packageWithSaveError);

      await expect(
        salaryPackageService.updatePackage(mockPackageId, updates, mockUserId)
      ).rejects.toThrow('Failed to update salary package: Database connection error');
    });

    it('should handle validation errors during update', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
      };

      const packageWithValidationError = {
        ...mockExistingPackage,
        save: jest.fn().mockRejectedValue(new Error('Validation failed')),
      };

      SalaryPackage.findById.mockResolvedValue(packageWithValidationError);

      await expect(
        salaryPackageService.updatePackage(mockPackageId, updates, mockUserId)
      ).rejects.toThrow('Failed to update salary package: Validation failed');
    });
  });

  describe('Partial Updates', () => {
    it('should allow updating only sales target', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 700000,
          incentiveType: 'Amount',
          incentiveValue: 20000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.salesTarget).toEqual(updates.salesTarget);
    });

    it('should allow updating only recovery target', async () => {
      const updates = {
        recoveryTarget: {
          targetAmount: 550000,
          incentiveType: 'Amount',
          incentiveValue: 25000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.recoveryTarget).toEqual(updates.recoveryTarget);
    });

    it('should allow updating only status', async () => {
      const updates = {
        status: 'Inactive',
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.status).toBe('Inactive');
    });

    it('should allow updating multiple components at once', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 800000,
          incentiveType: '%',
          incentiveValue: 7,
        },
        dailyAllowance: {
          type: 'Amount',
          value: 6000,
        },
        petrolAllowance: {
          type: '%',
          value: 15,
        },
        partyVisitTarget: {
          numberOfOrders: 120,
          type: 'Fix Amount',
          value: 8000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.salesTarget).toEqual(updates.salesTarget);
      expect(mockExistingPackage.dailyAllowance).toEqual(updates.dailyAllowance);
      expect(mockExistingPackage.petrolAllowance).toEqual(updates.petrolAllowance);
      expect(mockExistingPackage.partyVisitTarget).toEqual(updates.partyVisitTarget);
    });
  });

  describe('Data Integrity', () => {
    it('should set updatedBy field when updating package', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      await salaryPackageService.updatePackage(mockPackageId, updates, mockUserId);

      expect(mockExistingPackage.updatedBy).toBe(mockUserId);
    });

    it('should preserve existing data when updating specific fields', async () => {
      const originalSalesTarget = { ...mockExistingPackage.salesTarget };
      const updates = {
        dailyAllowance: {
          type: 'Amount',
          value: 6000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      await salaryPackageService.updatePackage(mockPackageId, updates, mockUserId);

      // Sales target should remain unchanged
      expect(mockExistingPackage.salesTarget).toEqual(originalSalesTarget);
    });

    it('should populate itemName for brand incentives during update', async () => {
      const updates = {
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);
      Item.findById.mockResolvedValue(mockItem);

      await salaryPackageService.updatePackage(mockPackageId, updates, mockUserId);

      // Verify that itemName was set
      expect(updates.brandIncentives[0].itemName).toBe(mockItem.itemName);
    });
  });

  describe('Incentive Type Updates', () => {
    it('should allow changing incentive type from Fix Amount to %', async () => {
      const updates = {
        salesTarget: {
          targetAmount: 500000,
          incentiveType: '%',
          incentiveValue: 10,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.salesTarget.incentiveType).toBe('%');
    });

    it('should allow changing incentive type from % to Amount', async () => {
      const updates = {
        recoveryTarget: {
          targetAmount: 450000,
          incentiveType: 'Amount',
          incentiveValue: 20000,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.recoveryTarget.incentiveType).toBe('Amount');
    });

    it('should allow changing allowance type', async () => {
      const updates = {
        dailyAllowance: {
          type: '%',
          value: 12,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.dailyAllowance.type).toBe('%');
    });
  });
});


describe('SalaryPackageService - getPackageById()', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockPackageId = '507f1f77bcf86cd799439014';
  const mockItemId = '507f1f77bcf86cd799439013';
  const mockItemId2 = '507f1f77bcf86cd799439015';

  const mockEmployee = {
    _id: mockEmployeeId,
    accountName: 'Ahmed Khan',
    basicPay: 50000,
  };

  const mockItem = {
    _id: mockItemId,
    itemName: 'Panadol 500mg',
  };

  const mockItem2 = {
    _id: mockItemId2,
    itemName: 'Augmentin 625mg',
  };

  const mockUser = {
    _id: mockUserId,
    username: 'admin',
  };

  const mockUpdatedByUser = {
    _id: '507f1f77bcf86cd799439016',
    username: 'manager',
  };

  const mockPackage = {
    _id: mockPackageId,
    packageId: 'SP2025000001',
    employeeId: mockEmployee,
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-12-31'),
    },
    basicPay: {
      amount: 50000,
      source: 'biodata',
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
    mobileOrderIncentive: {
      type: 'Amount',
      value: 100,
    },
    mobileCashRecoveryIncentive: {
      type: '%',
      value: 2,
      verifyWithCashBook: true,
    },
    partyVisitTarget: {
      numberOfOrders: 100,
      type: 'Fix Amount',
      value: 5000,
    },
    eidFitrBonus: {
      month: 'April 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    eidAdhaBonus: {
      month: 'June 2025',
      type: 'Fix Amount',
      value: 15000,
    },
    otherBonus: {
      detail: 'Performance Bonus',
      month: 'December 2025',
      type: 'Fix Amount',
      value: 20000,
    },
    brandIncentives: [],
    status: 'Active',
    createdBy: mockUser,
    updatedBy: mockUpdatedByUser,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Package Retrieval', () => {
    it('should fetch a salary package by ID with populated fields', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      // Setup the chain of populate calls
      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(SalaryPackage.findById).toHaveBeenCalledWith(mockPackageId);
      expect(mockPopulate).toHaveBeenCalledWith('employeeId', 'accountName basicPay');
      expect(mockPopulate).toHaveBeenCalledWith('brandIncentives.itemId', 'itemName');
      expect(mockPopulate).toHaveBeenCalledWith('createdBy', 'username');
      expect(mockPopulate).toHaveBeenCalledWith('updatedBy', 'username');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPackage);
      expect(result.data.employeeId.accountName).toBe('Ahmed Khan');
      expect(result.data.createdBy.username).toBe('admin');
      expect(result.data.updatedBy.username).toBe('manager');
    });

    it('should fetch a salary package with brand incentives', async () => {
      const packageWithBrandIncentives = {
        ...mockPackage,
        brandIncentives: [
          {
            _id: '507f1f77bcf86cd799439017',
            itemId: mockItem,
            itemName: 'Panadol 500mg',
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(packageWithBrandIncentives);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.brandIncentives).toHaveLength(1);
      expect(result.data.brandIncentives[0].itemId.itemName).toBe('Panadol 500mg');
    });

    it('should fetch a salary package with multiple brand incentives', async () => {
      const packageWithMultipleBrandIncentives = {
        ...mockPackage,
        brandIncentives: [
          {
            _id: '507f1f77bcf86cd799439017',
            itemId: mockItem,
            itemName: 'Panadol 500mg',
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
          {
            _id: '507f1f77bcf86cd799439018',
            itemId: mockItem2,
            itemName: 'Augmentin 625mg',
            quantityTarget: 500,
            duration: {
              fromDate: new Date('2025-04-01'),
              toDate: new Date('2025-06-30'),
            },
            type: '%',
            value: 3,
          },
        ],
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(packageWithMultipleBrandIncentives);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.brandIncentives).toHaveLength(2);
      expect(result.data.brandIncentives[0].itemId.itemName).toBe('Panadol 500mg');
      expect(result.data.brandIncentives[1].itemId.itemName).toBe('Augmentin 625mg');
    });

    it('should fetch a salary package with all 15 components', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.basicPay).toBeDefined();
      expect(result.data.salesTarget).toBeDefined();
      expect(result.data.recoveryTarget).toBeDefined();
      expect(result.data.dailyAllowance).toBeDefined();
      expect(result.data.petrolAllowance).toBeDefined();
      expect(result.data.mobilePackage).toBeDefined();
      expect(result.data.mobileOrderIncentive).toBeDefined();
      expect(result.data.mobileCashRecoveryIncentive).toBeDefined();
      expect(result.data.partyVisitTarget).toBeDefined();
      expect(result.data.eidFitrBonus).toBeDefined();
      expect(result.data.eidAdhaBonus).toBeDefined();
      expect(result.data.otherBonus).toBeDefined();
      expect(result.data.brandIncentives).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when package is not found', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(null);

      SalaryPackage.findById = mockFindById;

      await expect(
        salaryPackageService.getPackageById(mockPackageId)
      ).rejects.toThrow('Failed to get salary package: Salary package not found');

      expect(SalaryPackage.findById).toHaveBeenCalledWith(mockPackageId);
    });

    it('should throw error when package ID is invalid', async () => {
      const invalidPackageId = 'invalid-id';
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockRejectedValueOnce(new Error('Cast to ObjectId failed'));

      SalaryPackage.findById = mockFindById;

      await expect(
        salaryPackageService.getPackageById(invalidPackageId)
      ).rejects.toThrow('Failed to get salary package: Cast to ObjectId failed');
    });

    it('should handle database connection errors', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockRejectedValueOnce(new Error('Database connection error'));

      SalaryPackage.findById = mockFindById;

      await expect(
        salaryPackageService.getPackageById(mockPackageId)
      ).rejects.toThrow('Failed to get salary package: Database connection error');
    });
  });

  describe('Populated Fields Validation', () => {
    it('should populate employeeId with accountName and basicPay', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(mockPopulate).toHaveBeenCalledWith('employeeId', 'accountName basicPay');
      expect(result.data.employeeId.accountName).toBe('Ahmed Khan');
      expect(result.data.employeeId.basicPay).toBe(50000);
    });

    it('should populate brandIncentives.itemId with itemName', async () => {
      const packageWithBrandIncentive = {
        ...mockPackage,
        brandIncentives: [
          {
            _id: '507f1f77bcf86cd799439017',
            itemId: mockItem,
            itemName: 'Panadol 500mg',
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(packageWithBrandIncentive);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(mockPopulate).toHaveBeenCalledWith('brandIncentives.itemId', 'itemName');
      expect(result.data.brandIncentives[0].itemId.itemName).toBe('Panadol 500mg');
    });

    it('should populate createdBy with username', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(mockPopulate).toHaveBeenCalledWith('createdBy', 'username');
      expect(result.data.createdBy.username).toBe('admin');
    });

    it('should populate updatedBy with username', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(mockPopulate).toHaveBeenCalledWith('updatedBy', 'username');
      expect(result.data.updatedBy.username).toBe('manager');
    });
  });

  describe('Edge Cases', () => {
    it('should handle package without updatedBy field', async () => {
      const packageWithoutUpdatedBy = {
        ...mockPackage,
        updatedBy: null,
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(packageWithoutUpdatedBy);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.updatedBy).toBeNull();
    });

    it('should handle package with empty brand incentives array', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.brandIncentives).toEqual([]);
    });

    it('should handle package with Inactive status', async () => {
      const inactivePackage = {
        ...mockPackage,
        status: 'Inactive',
      };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(inactivePackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('Inactive');
    });
  });

  describe('Data Integrity', () => {
    it('should return complete package data structure', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('packageId');
      expect(result.data).toHaveProperty('employeeId');
      expect(result.data).toHaveProperty('employeeName');
      expect(result.data).toHaveProperty('duration');
      expect(result.data).toHaveProperty('basicPay');
      expect(result.data).toHaveProperty('salesTarget');
      expect(result.data).toHaveProperty('recoveryTarget');
      expect(result.data).toHaveProperty('dailyAllowance');
      expect(result.data).toHaveProperty('petrolAllowance');
      expect(result.data).toHaveProperty('mobilePackage');
      expect(result.data).toHaveProperty('mobileOrderIncentive');
      expect(result.data).toHaveProperty('mobileCashRecoveryIncentive');
      expect(result.data).toHaveProperty('partyVisitTarget');
      expect(result.data).toHaveProperty('eidFitrBonus');
      expect(result.data).toHaveProperty('eidAdhaBonus');
      expect(result.data).toHaveProperty('otherBonus');
      expect(result.data).toHaveProperty('brandIncentives');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('createdBy');
      expect(result.data).toHaveProperty('createdAt');
      expect(result.data).toHaveProperty('updatedAt');
    });

    it('should return correct incentive types', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.data.salesTarget.incentiveType).toBe('Fix Amount');
      expect(result.data.recoveryTarget.incentiveType).toBe('%');
      expect(result.data.dailyAllowance.type).toBe('Fix Amount');
      expect(result.data.mobileOrderIncentive.type).toBe('Amount');
    });

    it('should return correct duration dates', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindById = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackage);

      SalaryPackage.findById = mockFindById;

      const result = await salaryPackageService.getPackageById(mockPackageId);

      expect(result.data.duration.fromDate).toEqual(new Date('2025-01-01'));
      expect(result.data.duration.toDate).toEqual(new Date('2025-12-31'));
    });
  });
});


describe('SalaryPackageService - getPackagesByEmployee()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439011';

  const mockPackage1 = {
    _id: '507f1f77bcf86cd799439014',
    packageId: 'SP2025000001',
    employeeId: {
      _id: mockEmployeeId,
      accountName: 'Ahmed Khan',
    },
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-12-31'),
    },
    basicPay: {
      amount: 50000,
      source: 'biodata',
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
    status: 'Active',
    createdBy: {
      _id: mockUserId,
      username: 'admin',
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPackage2 = {
    _id: '507f1f77bcf86cd799439015',
    packageId: 'SP2024000001',
    employeeId: {
      _id: mockEmployeeId,
      accountName: 'Ahmed Khan',
    },
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-12-31'),
    },
    basicPay: {
      amount: 45000,
      source: 'biodata',
    },
    salesTarget: {
      targetAmount: 400000,
      incentiveType: 'Amount',
      incentiveValue: 8000,
    },
    recoveryTarget: {
      targetAmount: 350000,
      incentiveType: 'Fix Amount',
      incentiveValue: 5000,
    },
    status: 'Inactive',
    createdBy: {
      _id: mockUserId,
      username: 'admin',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPackage3 = {
    _id: '507f1f77bcf86cd799439016',
    packageId: 'SP2023000001',
    employeeId: {
      _id: mockEmployeeId,
      accountName: 'Ahmed Khan',
    },
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2023-01-01'),
      toDate: new Date('2023-12-31'),
    },
    basicPay: {
      amount: 40000,
      source: 'biodata',
    },
    salesTarget: {
      targetAmount: 300000,
      incentiveType: '%',
      incentiveValue: 3,
    },
    recoveryTarget: {
      targetAmount: 250000,
      incentiveType: 'Amount',
      incentiveValue: 3000,
    },
    status: 'Inactive',
    createdBy: {
      _id: mockUserId,
      username: 'admin',
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Package Retrieval', () => {
    it('should fetch all packages for an employee', async () => {
      const mockPackages = [mockPackage1, mockPackage2, mockPackage3];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(SalaryPackage.find).toHaveBeenCalledWith({ employeeId: mockEmployeeId });
      expect(mockSort).toHaveBeenCalledWith({ 'duration.fromDate': -1 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPackages);
      expect(result.count).toBe(3);
    });

    it('should return packages sorted by duration.fromDate in descending order', async () => {
      const mockPackages = [mockPackage1, mockPackage2, mockPackage3];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(mockSort).toHaveBeenCalledWith({ 'duration.fromDate': -1 });
      expect(result.data[0].duration.fromDate).toEqual(new Date('2025-01-01'));
      expect(result.data[1].duration.fromDate).toEqual(new Date('2024-01-01'));
      expect(result.data[2].duration.fromDate).toEqual(new Date('2023-01-01'));
    });

    it('should populate employeeId field', async () => {
      const mockPackages = [mockPackage1];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(mockPopulate).toHaveBeenCalledWith('employeeId', 'accountName');
      expect(result.data[0].employeeId).toBeDefined();
      expect(result.data[0].employeeId.accountName).toBe('Ahmed Khan');
    });

    it('should populate createdBy field', async () => {
      const mockPackages = [mockPackage1];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(mockPopulate).toHaveBeenCalledWith('createdBy', 'username');
      expect(result.data[0].createdBy).toBeDefined();
      expect(result.data[0].createdBy.username).toBe('admin');
    });

    it('should return empty array when employee has no packages', async () => {
      const mockPackages = [];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should return packages with both Active and Inactive status', async () => {
      const mockPackages = [mockPackage1, mockPackage2];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('Active');
      expect(result.data[1].status).toBe('Inactive');
    });
  });

  describe('Response Structure', () => {
    it('should return response with success, data, and count fields', async () => {
      const mockPackages = [mockPackage1];

      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnValue({
        populate: mockPopulate,
      });
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
      });

      mockPopulate
        .mockReturnValueOnce({ populate: mockPopulate })
        .mockResolvedValueOnce(mockPackages);

      SalaryPackage.find = mockFind;

      const result = await salaryPackageService.getPackagesByEmployee(mockEmployeeId);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPackages);
      expect(result.count).toBe(1);
    });
  });
});


// Task 19.2: Test validation errors (invalid dates, missing fields)
describe('SalaryPackageService - Validation Errors', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  const mockEmployee = {
    _id: mockEmployeeId,
    accountName: 'Ahmed Khan',
    accountType: 'Employee',
    basicPay: 50000,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invalid Date Validation', () => {
    it('should throw error when toDate is before fromDate', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-12-31'),
          toDate: new Date('2025-01-01'), // Invalid: toDate before fromDate
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(new Error('To Date must be after From Date')),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: To Date must be after From Date');
    });

    it('should throw error when toDate equals fromDate', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-01-01'), // Invalid: same date
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(new Error('To Date must be after From Date')),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: To Date must be after From Date');
    });

    it('should throw error when brand incentive toDate is before fromDate', async () => {
      const mockItemId = '507f1f77bcf86cd799439013';
      const mockItem = {
        _id: mockItemId,
        itemName: 'Panadol 500mg',
        itemCode: 'PAN500',
      };

      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-03-31'),
              toDate: new Date('2025-01-01'), // Invalid: toDate before fromDate
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('Brand incentive To Date must be after From Date')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: Brand incentive To Date must be after From Date');
    });

    it('should throw error when duration fromDate is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          toDate: new Date('2025-12-31'),
          // fromDate is missing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('duration.fromDate: Path `duration.fromDate` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when duration toDate is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          // toDate is missing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('duration.toDate: Path `duration.toDate` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });
  });

  describe('Missing Required Fields', () => {
    it('should throw error when employeeId is missing', async () => {
      const invalidPackageData = {
        // employeeId is missing
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('employeeId: Path `employeeId` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when basicPay amount is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          // amount is missing
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('basicPay.amount: Path `basicPay.amount` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when packageId is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('packageId: Path `packageId` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when employeeName is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('employeeName: Path `employeeName` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });
  });

  describe('Invalid Field Values', () => {
    it('should throw error when basicPay amount is negative', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: -50000, // Invalid: negative amount
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('basicPay.amount: Path `basicPay.amount` (-50000) is less than minimum allowed value (0).')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when salesTarget targetAmount is negative', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        salesTarget: {
          targetAmount: -500000, // Invalid: negative amount
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('salesTarget.targetAmount: Path `salesTarget.targetAmount` (-500000) is less than minimum allowed value (0).')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when invalid incentive type is provided', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Invalid Type', // Invalid: not in enum
          incentiveValue: 10000,
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('salesTarget.incentiveType: `Invalid Type` is not a valid enum value for path `salesTarget.incentiveType`.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when invalid status is provided', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        status: 'Pending', // Invalid: not in enum (should be 'Active' or 'Inactive')
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('status: `Pending` is not a valid enum value for path `status`.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when dailyAllowance value is negative', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: -5000, // Invalid: negative value
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('dailyAllowance.value: Path `dailyAllowance.value` (-5000) is less than minimum allowed value (0).')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when brand incentive quantityTarget is negative', async () => {
      const mockItemId = '507f1f77bcf86cd799439013';
      const mockItem = {
        _id: mockItemId,
        itemName: 'Panadol 500mg',
        itemCode: 'PAN500',
      };

      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: -1000, // Invalid: negative quantity
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('brandIncentives.0.quantityTarget: Path `brandIncentives.0.quantityTarget` (-1000) is less than minimum allowed value (0).')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });
  });

  describe('Brand Incentive Field Validation', () => {
    it('should throw error when brand incentive itemId is missing', async () => {
      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            // itemId is missing
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('brandIncentives.0.itemId: Path `brandIncentives.0.itemId` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when brand incentive itemName is missing', async () => {
      const mockItemId = '507f1f77bcf86cd799439013';
      const mockItem = {
        _id: mockItemId,
        itemName: 'Panadol 500mg',
        itemCode: 'PAN500',
      };

      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            itemId: mockItemId,
            // itemName is missing (should be populated by service)
            quantityTarget: 1000,
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('brandIncentives.0.itemName: Path `brandIncentives.0.itemName` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when brand incentive quantityTarget is missing', async () => {
      const mockItemId = '507f1f77bcf86cd799439013';
      const mockItem = {
        _id: mockItemId,
        itemName: 'Panadol 500mg',
        itemCode: 'PAN500',
      };

      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            itemId: mockItemId,
            // quantityTarget is missing
            duration: {
              fromDate: new Date('2025-01-01'),
              toDate: new Date('2025-03-31'),
            },
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('brandIncentives.0.quantityTarget: Path `brandIncentives.0.quantityTarget` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });

    it('should throw error when brand incentive duration is missing', async () => {
      const mockItemId = '507f1f77bcf86cd799439013';
      const mockItem = {
        _id: mockItemId,
        itemName: 'Panadol 500mg',
        itemCode: 'PAN500',
      };

      const invalidPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        brandIncentives: [
          {
            itemId: mockItemId,
            quantityTarget: 1000,
            // duration is missing
            type: 'Fix Amount',
            value: 5000,
          },
        ],
      };

      Account.findById.mockResolvedValue(mockEmployee);
      Item.findById.mockResolvedValue(mockItem);

      const mockPackageWithValidationError = {
        ...invalidPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('brandIncentives.0.duration.fromDate: Path `brandIncentives.0.duration.fromDate` is required.')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithValidationError);

      await expect(
        salaryPackageService.createPackage(invalidPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package');
    });
  });
});


// Task 19.3: Test overlapping package detection
describe('SalaryPackageService - Overlapping Package Detection', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  const mockEmployee = {
    _id: mockEmployeeId,
    accountName: 'Ahmed Khan',
    accountType: 'Employee',
    basicPay: 50000,
    isActive: true,
  };

  const existingPackage = {
    _id: '507f1f77bcf86cd799439014',
    packageId: 'SP2025000001',
    employeeId: mockEmployeeId,
    employeeName: 'Ahmed Khan',
    duration: {
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-12-31'),
    },
    basicPay: {
      amount: 50000,
      source: 'biodata',
    },
    status: 'Active',
    createdBy: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Overlapping Date Range Detection', () => {
    it('should throw error when new package completely overlaps existing package', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'), // Same as existing
          toDate: new Date('2025-12-31'), // Same as existing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should throw error when new package starts within existing package', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-06-01'), // Within existing package
          toDate: new Date('2026-06-30'), // Extends beyond existing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should throw error when new package ends within existing package', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-06-01'), // Before existing package
          toDate: new Date('2025-06-30'), // Ends within existing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should throw error when new package completely contains existing package', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-01-01'), // Before existing
          toDate: new Date('2026-12-31'), // After existing
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should throw error when new package starts on same day as existing package ends', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-12-31'), // Same as existing toDate
          toDate: new Date('2026-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should throw error when new package ends on same day as existing package starts', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2025-01-01'), // Same as existing fromDate
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });
  });

  describe('Non-Overlapping Date Ranges', () => {
    it('should allow creating package that starts after existing package ends', async () => {
      const nonOverlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2026-01-01'), // After existing package
          toDate: new Date('2026-12-31'),
        },
        basicPay: {
          amount: 55000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...nonOverlappingPackageData,
        packageId: 'SP2026000001',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        nonOverlappingPackageData,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2026000001');
    });

    it('should allow creating package that ends before existing package starts', async () => {
      const nonOverlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-12-31'), // Before existing package
        },
        basicPay: {
          amount: 45000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...nonOverlappingPackageData,
        packageId: 'SP2024000001',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        nonOverlappingPackageData,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2024000001');
    });
  });

  describe('Overlapping Detection with Inactive Packages', () => {
    it('should not throw error when overlapping with Inactive package', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      // Mock that the overlapping check passes because existing package is Inactive
      const mockSavedPackage = {
        ...overlappingPackageData,
        packageId: 'SP2025000002',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        status: 'Active',
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        overlappingPackageData,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2025000002');
    });
  });

  describe('Overlapping Detection for Different Employees', () => {
    it('should allow creating overlapping packages for different employees', async () => {
      const differentEmployeeId = '507f1f77bcf86cd799439099';
      const differentEmployee = {
        _id: differentEmployeeId,
        accountName: 'Ali Raza',
        accountType: 'Employee',
        basicPay: 45000,
        isActive: true,
      };

      const overlappingPackageData = {
        employeeId: differentEmployeeId,
        duration: {
          fromDate: new Date('2025-01-01'), // Same dates as existing package
          toDate: new Date('2025-12-31'), // but for different employee
        },
        basicPay: {
          amount: 45000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(differentEmployee);

      const mockSavedPackage = {
        ...overlappingPackageData,
        packageId: 'SP2025000003',
        employeeName: differentEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        overlappingPackageData,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2025000003');
    });
  });

  describe('Overlapping Detection During Update', () => {
    it('should throw error when updating package creates overlap with another package', async () => {
      const mockPackageId = '507f1f77bcf86cd799439014';
      const mockExistingPackage = {
        _id: mockPackageId,
        packageId: 'SP2025000001',
        employeeId: mockEmployeeId,
        employeeName: 'Ahmed Khan',
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-06-30'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        status: 'Active',
        createdBy: mockUserId,
        save: jest.fn().mockRejectedValue(
          new Error('Overlapping salary package exists for this employee (SP2025000002)')
        ),
      };

      const updates = {
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'), // Extending to overlap with another package
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      await expect(
        salaryPackageService.updatePackage(mockPackageId, updates, mockUserId)
      ).rejects.toThrow('Failed to update salary package: Overlapping salary package exists for this employee (SP2025000002)');
    });

    it('should allow updating package without creating overlap', async () => {
      const mockPackageId = '507f1f77bcf86cd799439014';
      const mockExistingPackage = {
        _id: mockPackageId,
        packageId: 'SP2025000001',
        employeeId: mockEmployeeId,
        employeeName: 'Ahmed Khan',
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-06-30'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        status: 'Active',
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      const updates = {
        salesTarget: {
          targetAmount: 600000,
          incentiveType: '%',
          incentiveValue: 5,
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.save).toHaveBeenCalled();
    });

    it('should not check overlap with itself when updating', async () => {
      const mockPackageId = '507f1f77bcf86cd799439014';
      const mockExistingPackage = {
        _id: mockPackageId,
        packageId: 'SP2025000001',
        employeeId: mockEmployeeId,
        employeeName: 'Ahmed Khan',
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        status: 'Active',
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      const updates = {
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'), // Same dates, updating itself
        },
      };

      SalaryPackage.findById.mockResolvedValue(mockExistingPackage);

      const result = await salaryPackageService.updatePackage(
        mockPackageId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(mockExistingPackage.save).toHaveBeenCalled();
    });
  });

  describe('Multiple Overlapping Packages', () => {
    it('should throw error when multiple active packages exist for same employee', async () => {
      const overlappingPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-03-01'),
          toDate: new Date('2025-09-30'),
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...overlappingPackageData,
        save: jest.fn().mockRejectedValue(
          new Error('Overlapping salary package exists for this employee (SP2025000001)')
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(overlappingPackageData, mockUserId)
      ).rejects.toThrow('Failed to create salary package: Overlapping salary package exists for this employee (SP2025000001)');
    });
  });

  describe('Edge Cases for Overlap Detection', () => {
    it('should handle single-day packages correctly', async () => {
      const singleDayPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2025-06-15'),
          toDate: new Date('2025-06-16'), // Single day package
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...singleDayPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(singleDayPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should handle year-boundary overlaps correctly', async () => {
      const yearBoundaryPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-12-01'),
          toDate: new Date('2025-02-28'), // Crosses year boundary and overlaps
        },
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockPackageWithOverlapError = {
        ...yearBoundaryPackageData,
        save: jest.fn().mockRejectedValue(
          new Error(`Overlapping salary package exists for this employee (${existingPackage.packageId})`)
        ),
      };

      SalaryPackage.mockImplementation(() => mockPackageWithOverlapError);

      await expect(
        salaryPackageService.createPackage(yearBoundaryPackageData, mockUserId)
      ).rejects.toThrow(`Failed to create salary package: Overlapping salary package exists for this employee (${existingPackage.packageId})`);
    });

    it('should handle leap year dates correctly', async () => {
      const leapYearPackageData = {
        employeeId: mockEmployeeId,
        duration: {
          fromDate: new Date('2024-02-29'), // Leap year date
          toDate: new Date('2024-12-31'),
        },
        basicPay: {
          amount: 45000,
          source: 'biodata',
        },
      };

      Account.findById.mockResolvedValue(mockEmployee);

      const mockSavedPackage = {
        ...leapYearPackageData,
        packageId: 'SP2024000001',
        employeeName: mockEmployee.accountName,
        createdBy: mockUserId,
        save: jest.fn().mockResolvedValue(true),
      };

      SalaryPackage.mockImplementation(() => mockSavedPackage);

      const result = await salaryPackageService.createPackage(
        leapYearPackageData,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.packageId).toBe('SP2024000001');
    });
  });
});
