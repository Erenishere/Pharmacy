const targetTrackingService = require('../../src/services/targetTrackingService');
const SalaryPackage = require('../../src/models/SalaryPackage');
const Invoice = require('../../src/models/Invoice');
const CashReceipt = require('../../src/models/CashReceipt');

// Mock dependencies
jest.mock('../../src/models/SalaryPackage');
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/CashReceipt');

// Task 21.1: Test trackSalesTarget() with Invoice data
describe('TargetTrackingService - trackSalesTarget()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const month = 'January';
  const year = 2025;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sales Target Achievement', () => {
    it('should track sales target when target is achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockInvoices = [
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: { grandTotal: 300000 },
        },
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-20'),
          totals: { grandTotal: 250000 },
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(500000);
      expect(result.data.achieved).toBe(550000);
      expect(result.data.percentage).toBe(110);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });

    it('should track sales target when target is not achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockInvoices = [
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: { grandTotal: 200000 },
        },
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-20'),
          totals: { grandTotal: 150000 },
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(500000);
      expect(result.data.achieved).toBe(350000);
      expect(result.data.percentage).toBe(70);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(150000);
    });

    it('should track sales target when target is exactly achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockInvoices = [
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: { grandTotal: 500000 },
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(500000);
      expect(result.data.achieved).toBe(500000);
      expect(result.data.percentage).toBe(100);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no active salary package', async () => {
      SalaryPackage.findOne = jest.fn().mockResolvedValue(null);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active salary package found for employee');
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_package');
    });

    it('should handle zero target amount', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 0,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_target');
    });

    it('should handle empty invoice list', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue([]);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(500000);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(500000);
    });

    it('should exclude cancelled invoices from calculation', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      // Mock Invoice.find to verify it's called with correct query
      Invoice.find = jest.fn().mockResolvedValue([
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: { grandTotal: 400000 },
        },
      ]);

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      // Verify Invoice.find was called with query excluding cancelled invoices
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: { $ne: 'cancelled' },
        })
      );

      expect(result.data.achieved).toBe(400000);
    });

    it('should handle missing totals in invoices', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockInvoices = [
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: {},
        },
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-20'),
          totals: { grandTotal: 300000 },
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.achieved).toBe(300000);
      expect(result.data.status).toBe('pending');
    });

    it('should handle large sales amounts', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 5000000,
          incentiveType: 'Fix Amount',
          incentiveValue: 50000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockInvoices = [
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-15'),
          totals: { grandTotal: 3000000 },
        },
        {
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: 'completed',
          invoiceDate: new Date('2025-01-20'),
          totals: { grandTotal: 2500000 },
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await targetTrackingService.trackSalesTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.target).toBe(5000000);
      expect(result.data.achieved).toBe(5500000);
      expect(result.data.percentage).toBe(110);
      expect(result.data.status).toBe('achieved');
    });
  });

  describe('Date Range Filtering', () => {
    it('should only include invoices within the specified month', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = jest.fn().mockResolvedValue([]);

      await targetTrackingService.trackSalesTarget(mockEmployeeId, month, year);

      // Verify Invoice.find was called with date range for January 2025
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );

      const callArgs = Invoice.find.mock.calls[0][0];
      const startDate = callArgs.invoiceDate.$gte;
      const endDate = callArgs.invoiceDate.$lte;

      expect(startDate.getMonth()).toBe(0); // January is month 0
      expect(startDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getFullYear()).toBe(2025);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when database query fails', async () => {
      SalaryPackage.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        targetTrackingService.trackSalesTarget(mockEmployeeId, month, year)
      ).rejects.toThrow('Failed to track sales target: Database error');
    });

    it('should throw error for invalid month name', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        salesTarget: {
          targetAmount: 500000,
          incentiveType: 'Fix Amount',
          incentiveValue: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      await expect(
        targetTrackingService.trackSalesTarget(mockEmployeeId, 'InvalidMonth', year)
      ).rejects.toThrow('Failed to track sales target: Invalid month name: InvalidMonth');
    });
  });
});


// Task 21.2: Test trackRecoveryTarget() with CashReceipt data
describe('TargetTrackingService - trackRecoveryTarget()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const month = 'January';
  const year = 2025;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recovery Target Achievement', () => {
    it('should track recovery target when target is achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockCashReceipts = [
        {
          salesmanId: mockEmployeeId,
          status: 'cleared',
          receiptDate: new Date('2025-01-10'),
          amount: 250000,
        },
        {
          salesmanId: mockEmployeeId,
          status: 'pending',
          receiptDate: new Date('2025-01-25'),
          amount: 200000,
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue(mockCashReceipts);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(400000);
      expect(result.data.achieved).toBe(450000);
      expect(result.data.percentage).toBe(112.5);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });

    it('should track recovery target when target is not achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockCashReceipts = [
        {
          salesmanId: mockEmployeeId,
          status: 'cleared',
          receiptDate: new Date('2025-01-10'),
          amount: 150000,
        },
        {
          salesmanId: mockEmployeeId,
          status: 'pending',
          receiptDate: new Date('2025-01-25'),
          amount: 100000,
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue(mockCashReceipts);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(400000);
      expect(result.data.achieved).toBe(250000);
      expect(result.data.percentage).toBe(62.5);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(150000);
    });

    it('should track recovery target when target is exactly achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockCashReceipts = [
        {
          salesmanId: mockEmployeeId,
          status: 'cleared',
          receiptDate: new Date('2025-01-10'),
          amount: 400000,
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue(mockCashReceipts);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(400000);
      expect(result.data.achieved).toBe(400000);
      expect(result.data.percentage).toBe(100);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no active salary package', async () => {
      SalaryPackage.findOne = jest.fn().mockResolvedValue(null);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active salary package found for employee');
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_package');
    });

    it('should handle zero target amount', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 0,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_target');
    });

    it('should handle empty cash receipt list', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue([]);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(400000);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(400000);
    });

    it('should include both cleared and pending receipts', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue([]);

      await targetTrackingService.trackRecoveryTarget(mockEmployeeId, month, year);

      // Verify CashReceipt.find was called with query including both cleared and pending
      expect(CashReceipt.find).toHaveBeenCalledWith(
        expect.objectContaining({
          salesmanId: mockEmployeeId,
          status: { $in: ['cleared', 'pending'] },
        })
      );
    });

    it('should handle missing amount in cash receipts', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockCashReceipts = [
        {
          salesmanId: mockEmployeeId,
          status: 'cleared',
          receiptDate: new Date('2025-01-10'),
          amount: undefined,
        },
        {
          salesmanId: mockEmployeeId,
          status: 'pending',
          receiptDate: new Date('2025-01-25'),
          amount: 200000,
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue(mockCashReceipts);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.achieved).toBe(200000);
      expect(result.data.status).toBe('pending');
    });

    it('should handle large recovery amounts', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 3000000,
          incentiveType: 'Fix Amount',
          incentiveValue: 30000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockCashReceipts = [
        {
          salesmanId: mockEmployeeId,
          status: 'cleared',
          receiptDate: new Date('2025-01-10'),
          amount: 2000000,
        },
        {
          salesmanId: mockEmployeeId,
          status: 'pending',
          receiptDate: new Date('2025-01-25'),
          amount: 1500000,
        },
      ];

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue(mockCashReceipts);

      const result = await targetTrackingService.trackRecoveryTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.target).toBe(3000000);
      expect(result.data.achieved).toBe(3500000);
      expect(result.data.percentage).toBe(116.67);
      expect(result.data.status).toBe('achieved');
    });
  });

  describe('Date Range Filtering', () => {
    it('should only include receipts within the specified month', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      CashReceipt.find = jest.fn().mockResolvedValue([]);

      await targetTrackingService.trackRecoveryTarget(mockEmployeeId, month, year);

      // Verify CashReceipt.find was called with date range for January 2025
      expect(CashReceipt.find).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );

      const callArgs = CashReceipt.find.mock.calls[0][0];
      const startDate = callArgs.receiptDate.$gte;
      const endDate = callArgs.receiptDate.$lte;

      expect(startDate.getMonth()).toBe(0); // January is month 0
      expect(startDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getFullYear()).toBe(2025);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when database query fails', async () => {
      SalaryPackage.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        targetTrackingService.trackRecoveryTarget(mockEmployeeId, month, year)
      ).rejects.toThrow('Failed to track recovery target: Database error');
    });

    it('should throw error for invalid month name', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        recoveryTarget: {
          targetAmount: 400000,
          incentiveType: 'Fix Amount',
          incentiveValue: 8000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      await expect(
        targetTrackingService.trackRecoveryTarget(mockEmployeeId, 'InvalidMonth', year)
      ).rejects.toThrow('Failed to track recovery target: Invalid month name: InvalidMonth');
    });
  });
});


// Task 21.3: Test trackPartyVisitTarget() with unique customer count
describe('TargetTrackingService - trackPartyVisitTarget()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const month = 'January';
  const year = 2025;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Party Visit Target Achievement', () => {
    it('should track party visit target when target is achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      // Create array of 55 unique customer IDs
      const mockUniqueCustomers = Array.from({ length: 55 }, (_, i) => 
        `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`
      );

      // Create mock Invoice.find with distinct method
      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockUniqueCustomers),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(50);
      expect(result.data.achieved).toBe(55);
      expect(result.data.percentage).toBe(110);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });

    it('should track party visit target when target is not achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockUniqueCustomers = [
        '507f1f77bcf86cd799439013',
        '507f1f77bcf86cd799439014',
        '507f1f77bcf86cd799439015',
      ];

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockUniqueCustomers), // 3 unique customers
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(50);
      expect(result.data.achieved).toBe(3);
      expect(result.data.percentage).toBe(6);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(47);
    });

    it('should track party visit target when target is exactly achieved', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      // Create array of 50 unique customer IDs
      const mockUniqueCustomers = Array.from({ length: 50 }, (_, i) => 
        `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`
      );

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockUniqueCustomers),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(50);
      expect(result.data.achieved).toBe(50);
      expect(result.data.percentage).toBe(100);
      expect(result.data.status).toBe('achieved');
      expect(result.data.remaining).toBe(0);
    });

    it('should count unique customers only once', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 10,
          type: 'Fix Amount',
          value: 2000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      // Even if same customer has multiple orders, they should be counted once
      const mockUniqueCustomers = [
        '507f1f77bcf86cd799439013',
        '507f1f77bcf86cd799439014',
        '507f1f77bcf86cd799439015',
      ];

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockUniqueCustomers),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.achieved).toBe(3);
      
      // Verify distinct was called on customerId
      expect(mockFind().distinct).toHaveBeenCalledWith('customerId');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no active salary package', async () => {
      SalaryPackage.findOne = jest.fn().mockResolvedValue(null);

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active salary package found for employee');
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_package');
    });

    it('should handle zero target', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 0,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(0);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('no_target');
    });

    it('should handle no unique customers', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue([]),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.success).toBe(true);
      expect(result.data.target).toBe(50);
      expect(result.data.achieved).toBe(0);
      expect(result.data.percentage).toBe(0);
      expect(result.data.status).toBe('pending');
      expect(result.data.remaining).toBe(50);
    });

    it('should exclude cancelled invoices from customer count', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue([]),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      await targetTrackingService.trackPartyVisitTarget(mockEmployeeId, month, year);

      // Verify Invoice.find was called with query excluding cancelled invoices
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          salesmanId: mockEmployeeId,
          type: 'sales',
          status: { $ne: 'cancelled' },
        })
      );
    });

    it('should handle large number of unique customers', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 100,
          type: 'Fix Amount',
          value: 10000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      // Create array of 150 unique customer IDs
      const mockUniqueCustomers = Array.from({ length: 150 }, (_, i) => 
        `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`
      );

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockUniqueCustomers),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      const result = await targetTrackingService.trackPartyVisitTarget(
        mockEmployeeId,
        month,
        year
      );

      expect(result.data.target).toBe(100);
      expect(result.data.achieved).toBe(150);
      expect(result.data.percentage).toBe(150);
      expect(result.data.status).toBe('achieved');
    });
  });

  describe('Date Range Filtering', () => {
    it('should only include invoices within the specified month', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      const mockFind = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue([]),
      });

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);
      Invoice.find = mockFind;

      await targetTrackingService.trackPartyVisitTarget(mockEmployeeId, month, year);

      // Verify Invoice.find was called with date range for January 2025
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );

      const callArgs = Invoice.find.mock.calls[0][0];
      const startDate = callArgs.invoiceDate.$gte;
      const endDate = callArgs.invoiceDate.$lte;

      expect(startDate.getMonth()).toBe(0); // January is month 0
      expect(startDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getFullYear()).toBe(2025);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when database query fails', async () => {
      SalaryPackage.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        targetTrackingService.trackPartyVisitTarget(mockEmployeeId, month, year)
      ).rejects.toThrow('Failed to track party visit target: Database error');
    });

    it('should throw error for invalid month name', async () => {
      const mockSalaryPackage = {
        employeeId: mockEmployeeId,
        partyVisitTarget: {
          numberOfOrders: 50,
          type: 'Fix Amount',
          value: 5000,
        },
        duration: {
          fromDate: new Date('2025-01-01'),
          toDate: new Date('2025-12-31'),
        },
      };

      SalaryPackage.findOne = jest.fn().mockResolvedValue(mockSalaryPackage);

      await expect(
        targetTrackingService.trackPartyVisitTarget(mockEmployeeId, 'InvalidMonth', year)
      ).rejects.toThrow('Failed to track party visit target: Invalid month name: InvalidMonth');
    });
  });
});
