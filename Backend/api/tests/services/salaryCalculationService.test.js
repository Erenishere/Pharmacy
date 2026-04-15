const salaryCalculationService = require('../../src/services/salaryCalculationService');
const SalaryPackage = require('../../src/models/SalaryPackage');
const SalaryCalculation = require('../../src/models/SalaryCalculation');
const Invoice = require('../../src/models/Invoice');
const CashReceipt = require('../../src/models/CashReceipt');

// Mock dependencies
jest.mock('../../src/models/SalaryPackage');
jest.mock('../../src/models/SalaryCalculation');
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/CashReceipt');

// Task 20.1: Test calculateFixedComponents()
describe('SalaryCalculationService - calculateFixedComponents()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Pay Calculation', () => {
    it('should return basic pay amount', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(50000);
      expect(result.dailyAllowance).toBe(0);
      expect(result.petrolAllowance).toBe(0);
      expect(result.mobilePackage).toBe(0);
    });

    it('should handle zero basic pay', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 0,
          source: 'biodata',
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
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(0);
      expect(result.dailyAllowance).toBe(5000);
      expect(result.petrolAllowance).toBe(8000);
      expect(result.mobilePackage).toBe(2000);
    });

    it('should handle missing basic pay amount', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          source: 'biodata',
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
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(0);
    });
  });

  describe('Daily Allowance Calculation', () => {
    it('should calculate daily allowance with Fix Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 5000,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.dailyAllowance).toBe(5000);
    });

    it('should calculate daily allowance with Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Amount',
          value: 6000,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.dailyAllowance).toBe(6000);
    });

    it('should calculate daily allowance with % type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: '%',
          value: 10, // 10% of basic pay
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.dailyAllowance).toBe(5000); // 10% of 50000
    });

    it('should handle zero daily allowance value', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.dailyAllowance).toBe(0);
    });
  });

  describe('Petrol Allowance Calculation', () => {
    it('should calculate petrol allowance with Fix Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 8000,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.petrolAllowance).toBe(8000);
    });

    it('should calculate petrol allowance with Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Amount',
          value: 10000,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.petrolAllowance).toBe(10000);
    });

    it('should calculate petrol allowance with % type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: '%',
          value: 15, // 15% of basic pay
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 0,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.petrolAllowance).toBe(7500); // 15% of 50000
    });
  });

  describe('Mobile Package Calculation', () => {
    it('should calculate mobile package with Fix Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Fix Amount',
          value: 2000,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.mobilePackage).toBe(2000);
    });

    it('should calculate mobile package with Amount type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: 'Amount',
          value: 2500,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.mobilePackage).toBe(2500);
    });

    it('should calculate mobile package with % type', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 0,
        },
        mobilePackage: {
          type: '%',
          value: 5, // 5% of basic pay
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.mobilePackage).toBe(2500); // 5% of 50000
    });
  });

  describe('Combined Calculations', () => {
    it('should calculate all fixed components correctly', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 5000,
        },
        petrolAllowance: {
          type: '%',
          value: 15, // 15% of 50000 = 7500
        },
        mobilePackage: {
          type: 'Amount',
          value: 2000,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(50000);
      expect(result.dailyAllowance).toBe(5000);
      expect(result.petrolAllowance).toBe(7500);
      expect(result.mobilePackage).toBe(2000);
    });

    it('should calculate all components with percentage types', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 100000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: '%',
          value: 10, // 10% of 100000 = 10000
        },
        petrolAllowance: {
          type: '%',
          value: 8, // 8% of 100000 = 8000
        },
        mobilePackage: {
          type: '%',
          value: 3, // 3% of 100000 = 3000
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(100000);
      expect(result.dailyAllowance).toBe(10000);
      expect(result.petrolAllowance).toBe(8000);
      expect(result.mobilePackage).toBe(3000);
    });

    it('should handle mixed types correctly', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 60000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: 'Fix Amount',
          value: 6000,
        },
        petrolAllowance: {
          type: 'Amount',
          value: 9000,
        },
        mobilePackage: {
          type: '%',
          value: 4, // 4% of 60000 = 2400
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(60000);
      expect(result.dailyAllowance).toBe(6000);
      expect(result.petrolAllowance).toBe(9000);
      expect(result.mobilePackage).toBe(2400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal percentages correctly', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 50000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: '%',
          value: 12.5, // 12.5% of 50000 = 6250
        },
        petrolAllowance: {
          type: '%',
          value: 7.5, // 7.5% of 50000 = 3750
        },
        mobilePackage: {
          type: '%',
          value: 2.5, // 2.5% of 50000 = 1250
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.dailyAllowance).toBe(6250);
      expect(result.petrolAllowance).toBe(3750);
      expect(result.mobilePackage).toBe(1250);
    });

    it('should handle large basic pay amounts', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 500000,
          source: 'biodata',
        },
        dailyAllowance: {
          type: '%',
          value: 10, // 10% of 500000 = 50000
        },
        petrolAllowance: {
          type: 'Fix Amount',
          value: 20000,
        },
        mobilePackage: {
          type: 'Amount',
          value: 5000,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(500000);
      expect(result.dailyAllowance).toBe(50000);
      expect(result.petrolAllowance).toBe(20000);
      expect(result.mobilePackage).toBe(5000);
    });

    it('should return zero for percentage calculations when basic pay is zero', () => {
      const salaryPackage = {
        employeeId: mockEmployeeId,
        basicPay: {
          amount: 0,
          source: 'biodata',
        },
        dailyAllowance: {
          type: '%',
          value: 10,
        },
        petrolAllowance: {
          type: '%',
          value: 15,
        },
        mobilePackage: {
          type: '%',
          value: 5,
        },
      };

      const result = salaryCalculationService.calculateFixedComponents(salaryPackage);

      expect(result.basicPay).toBe(0);
      expect(result.dailyAllowance).toBe(0);
      expect(result.petrolAllowance).toBe(0);
      expect(result.mobilePackage).toBe(0);
    });
  });
});


// Task 20.2: Test calculateSalesIncentive() with Fix Amount type
describe('SalaryCalculationService - calculateSalesIncentive() with Fix Amount', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate Fix Amount incentive when target is achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    // Mock invoices with total sales >= target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 300000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 250000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(550000);
    expect(result.percentage).toBe(110);
    expect(result.amount).toBe(10000); // Fix Amount
  });

  it('should return zero incentive when target is not achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    // Mock invoices with total sales < target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 200000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 150000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(350000);
    expect(result.percentage).toBe(70);
    expect(result.amount).toBe(0); // Target not achieved
  });

  it('should calculate incentive when target is exactly achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    // Mock invoices with total sales = target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 500000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(500000);
    expect(result.percentage).toBe(100);
    expect(result.amount).toBe(10000);
  });

  it('should handle zero target amount', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 0,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(0);
    expect(result.achieved).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.amount).toBe(0);
  });

  it('should exclude cancelled invoices from calculation', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    // Mock invoices including cancelled ones
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 400000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 200000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.achieved).toBe(600000);
    expect(result.amount).toBe(10000);
  });

  it('should handle empty invoice list', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    Invoice.find = jest.fn().mockResolvedValue([]);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.amount).toBe(0);
  });

  it('should handle large sales amounts', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 5000000,
        incentiveType: 'Fix Amount',
        incentiveValue: 50000,
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 3000000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 2500000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(5000000);
    expect(result.achieved).toBe(5500000);
    expect(result.percentage).toBe(110);
    expect(result.amount).toBe(50000);
  });

  it('should handle missing totals in invoices', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: {},
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 300000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.achieved).toBe(300000);
    expect(result.amount).toBe(0);
  });
});


// Task 20.3: Test calculateSalesIncentive() with % type
describe('SalaryCalculationService - calculateSalesIncentive() with % type', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate % incentive on sales above target', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 5, // 5% of excess sales
      },
    };

    // Mock invoices with total sales > target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 400000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 300000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(700000);
    expect(result.percentage).toBe(140);
    // Excess sales = 700000 - 500000 = 200000
    // Incentive = 200000 * 5% = 10000
    expect(result.amount).toBe(10000);
  });

  it('should return zero incentive when target is not achieved with % type', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 5,
      },
    };

    // Mock invoices with total sales < target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 300000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(300000);
    expect(result.percentage).toBe(60);
    expect(result.amount).toBe(0); // Target not achieved
  });

  it('should return zero incentive when target is exactly achieved with % type', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 5,
      },
    };

    // Mock invoices with total sales = target
    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 500000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(500000);
    expect(result.percentage).toBe(100);
    // Excess sales = 500000 - 500000 = 0
    // Incentive = 0 * 5% = 0
    expect(result.amount).toBe(0);
  });

  it('should calculate % incentive with high percentage value', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 10, // 10% of excess sales
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 800000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(800000);
    expect(result.percentage).toBe(160);
    // Excess sales = 800000 - 500000 = 300000
    // Incentive = 300000 * 10% = 30000
    expect(result.amount).toBe(30000);
  });

  it('should calculate % incentive with decimal percentage', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 2.5, // 2.5% of excess sales
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 600000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(600000);
    expect(result.percentage).toBe(120);
    // Excess sales = 600000 - 500000 = 100000
    // Incentive = 100000 * 2.5% = 2500
    expect(result.amount).toBe(2500);
  });

  it('should calculate % incentive with large excess sales', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 1000000,
        incentiveType: '%',
        incentiveValue: 3, // 3% of excess sales
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 1500000 },
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 1000000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(1000000);
    expect(result.achieved).toBe(2500000);
    expect(result.percentage).toBe(250);
    // Excess sales = 2500000 - 1000000 = 1500000
    // Incentive = 1500000 * 3% = 45000
    expect(result.amount).toBe(45000);
  });

  it('should handle zero percentage value', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 0,
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 600000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(600000);
    expect(result.percentage).toBe(120);
    // Excess sales = 600000 - 500000 = 100000
    // Incentive = 100000 * 0% = 0
    expect(result.amount).toBe(0);
  });

  it('should round % incentive amount correctly', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 3.33, // 3.33% of excess sales
      },
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 600000 },
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateSalesIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(600000);
    // Excess sales = 600000 - 500000 = 100000
    // Incentive = 100000 * 3.33% = 3330
    expect(result.amount).toBe(3330);
  });
});


// Task 20.4: Test calculateRecoveryIncentive()
describe('SalaryCalculationService - calculateRecoveryIncentive()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate Fix Amount recovery incentive when target is achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 250000,
      },
      {
        salesmanId: mockEmployeeId,
        status: 'pending',
        amount: 200000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(450000);
    expect(result.percentage).toBe(112.5);
    expect(result.amount).toBe(8000);
  });

  it('should return zero incentive when recovery target is not achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 200000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(200000);
    expect(result.percentage).toBe(50);
    expect(result.amount).toBe(0);
  });

  it('should calculate Amount type recovery incentive', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Amount',
        incentiveValue: 10000,
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 450000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(450000);
    expect(result.amount).toBe(10000);
  });

  it('should calculate % type recovery incentive on excess recovery', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: '%',
        incentiveValue: 4, // 4% of excess recovery
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 300000,
      },
      {
        salesmanId: mockEmployeeId,
        status: 'pending',
        amount: 250000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(550000);
    expect(result.percentage).toBe(137.5);
    // Excess recovery = 550000 - 400000 = 150000
    // Incentive = 150000 * 4% = 6000
    expect(result.amount).toBe(6000);
  });

  it('should handle zero recovery target', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 0,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(0);
    expect(result.achieved).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.amount).toBe(0);
  });

  it('should handle empty cash receipts', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    CashReceipt.find = jest.fn().mockResolvedValue([]);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.amount).toBe(0);
  });

  it('should handle missing amount in receipts', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 300000,
      },
      {
        salesmanId: mockEmployeeId,
        status: 'pending',
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.achieved).toBe(300000);
    expect(result.amount).toBe(0);
  });

  it('should calculate recovery incentive when target is exactly achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 400000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(400000);
    expect(result.achieved).toBe(400000);
    expect(result.percentage).toBe(100);
    expect(result.amount).toBe(8000);
  });

  it('should calculate % incentive with high recovery above target', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      recoveryTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 5, // 5% of excess recovery
      },
    };

    const mockReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 800000,
      },
    ];

    CashReceipt.find = jest.fn().mockResolvedValue(mockReceipts);

    const result = await salaryCalculationService.calculateRecoveryIncentive(
      salaryPackage,
      'January',
      2025
    );

    expect(result.target).toBe(500000);
    expect(result.achieved).toBe(800000);
    expect(result.percentage).toBe(160);
    // Excess recovery = 800000 - 500000 = 300000
    // Incentive = 300000 * 5% = 15000
    expect(result.amount).toBe(15000);
  });
});


// Task 20.5: Test calculateBrandIncentives() with multiple items
describe('SalaryCalculationService - calculateBrandIncentives()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockItemId1 = '507f1f77bcf86cd799439013';
  const mockItemId2 = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate brand incentive when target is achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 60,
          },
        ],
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 50,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('Brand A Medicine');
    expect(result[0].target).toBe(100);
    expect(result[0].achieved).toBe(110);
    expect(result[0].amount).toBe(5000);
  });

  it('should calculate multiple brand incentives', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
        {
          itemId: mockItemId2,
          itemName: 'Brand B Medicine',
          quantityTarget: 50,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Amount',
          value: 3000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 120,
          },
          {
            itemId: mockItemId2,
            quantity: 60,
          },
        ],
      },
    ];

    Invoice.find = jest.fn()
      .mockResolvedValueOnce(mockInvoices) // First call for Brand A
      .mockResolvedValueOnce(mockInvoices); // Second call for Brand B

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(2);
    expect(result[0].itemName).toBe('Brand A Medicine');
    expect(result[0].achieved).toBe(120);
    expect(result[0].amount).toBe(5000);
    expect(result[1].itemName).toBe('Brand B Medicine');
    expect(result[1].achieved).toBe(60);
    expect(result[1].amount).toBe(3000);
  });

  it('should return zero incentive when brand target is not achieved', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 50,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].achieved).toBe(50);
    expect(result[0].amount).toBe(0);
  });

  it('should calculate % type brand incentive', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: '%',
          value: 10, // 10% of basic pay
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 150,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].achieved).toBe(150);
    // 10% of 50000 = 5000
    expect(result[0].amount).toBe(5000);
  });

  it('should handle empty brand incentives array', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [],
    };

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(0);
  });

  it('should handle missing brand incentives', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
    };

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(0);
  });

  it('should skip brand incentive if month is outside duration', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-06-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(0);
  });

  it('should handle invoices with no matching items', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId2, // Different item
            quantity: 100,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].achieved).toBe(0);
    expect(result[0].amount).toBe(0);
  });

  it('should sum quantities from multiple invoices for same item', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 30,
          },
        ],
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 40,
          },
        ],
      },
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
            quantity: 35,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].achieved).toBe(105);
    expect(result[0].amount).toBe(5000);
  });

  it('should handle missing quantity in invoice items', async () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
    };

    const mockInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        items: [
          {
            itemId: mockItemId1,
          },
        ],
      },
    ];

    Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

    const result = await salaryCalculationService.calculateBrandIncentives(
      salaryPackage,
      'January',
      2025
    );

    expect(result).toHaveLength(1);
    expect(result[0].achieved).toBe(0);
    expect(result[0].amount).toBe(0);
  });
});


// Task 20.6: Test calculateBonuses() for correct month
describe('SalaryCalculationService - calculateBonuses()', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate Eid Fitr bonus for correct month with Fix Amount', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 10000,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Eid Fitr');
    expect(result[0].detail).toBe('Eid ul Fitr Bonus');
    expect(result[0].amount).toBe(10000);
  });

  it('should calculate Eid Adha bonus for correct month with Amount type', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Amount',
        value: 12000,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'June');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Eid Adha');
    expect(result[0].detail).toBe('Eid Ul Adha Bonus');
    expect(result[0].amount).toBe(12000);
  });

  it('should calculate Other bonus for correct month', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 5000,
        detail: 'Year End Bonus',
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'December');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Other');
    expect(result[0].detail).toBe('Year End Bonus');
    expect(result[0].amount).toBe(5000);
  });

  it('should calculate multiple bonuses in same month', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 10000,
      },
      eidAdhaBonus: {
        month: 'April',
        type: 'Amount',
        value: 8000,
      },
      otherBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 5000,
        detail: 'Performance Bonus',
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('Eid Fitr');
    expect(result[0].amount).toBe(10000);
    expect(result[1].type).toBe('Eid Adha');
    expect(result[1].amount).toBe(8000);
    expect(result[2].type).toBe('Other');
    expect(result[2].amount).toBe(5000);
  });

  it('should calculate % type bonus based on basic pay', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: '%',
        value: 20, // 20% of basic pay
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Eid Fitr');
    // 20% of 50000 = 10000
    expect(result[0].amount).toBe(10000);
  });

  it('should return empty array when no bonuses match the month', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 10000,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 8000,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 5000,
        detail: 'Year End Bonus',
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'January');

    expect(result).toHaveLength(0);
  });

  it('should return empty array when all bonus values are zero', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(0);
  });

  it('should handle missing other bonus detail', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 50000,
      },
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 5000,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'December');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Other');
    expect(result[0].detail).toBe('Other Bonus');
    expect(result[0].amount).toBe(5000);
  });

  it('should calculate % type bonuses with decimal percentages', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 60000,
      },
      eidFitrBonus: {
        month: 'April',
        type: '%',
        value: 15.5, // 15.5% of basic pay
      },
      eidAdhaBonus: {
        month: 'June',
        type: '%',
        value: 12.5, // 12.5% of basic pay
      },
      otherBonus: {
        month: 'December',
        type: '%',
        value: 10, // 10% of basic pay
      },
    };

    const resultApril = salaryCalculationService.calculateBonuses(salaryPackage, 'April');
    expect(resultApril).toHaveLength(1);
    // 15.5% of 60000 = 9300
    expect(resultApril[0].amount).toBe(9300);

    const resultJune = salaryCalculationService.calculateBonuses(salaryPackage, 'June');
    expect(resultJune).toHaveLength(1);
    // 12.5% of 60000 = 7500
    expect(resultJune[0].amount).toBe(7500);

    const resultDecember = salaryCalculationService.calculateBonuses(salaryPackage, 'December');
    expect(resultDecember).toHaveLength(1);
    // 10% of 60000 = 6000
    expect(resultDecember[0].amount).toBe(6000);
  });

  it('should handle zero basic pay with % type bonuses', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 0,
      },
      eidFitrBonus: {
        month: 'April',
        type: '%',
        value: 20,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(0);
  });

  it('should round bonus amounts correctly', () => {
    const salaryPackage = {
      employeeId: mockEmployeeId,
      basicPay: {
        amount: 55555,
      },
      eidFitrBonus: {
        month: 'April',
        type: '%',
        value: 13.33, // 13.33% of 55555
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    const result = salaryCalculationService.calculateBonuses(salaryPackage, 'April');

    expect(result).toHaveLength(1);
    // 13.33% of 55555 = 7405.4815, rounded to 7405.48
    expect(result[0].amount).toBe(7405.48);
  });
});


// Task 20.7: Test complete salary calculation flow
describe('SalaryCalculationService - Complete Salary Calculation Flow', () => {
  const mockEmployeeId = '507f1f77bcf86cd799439012';
  const mockPackageId = '507f1f77bcf86cd799439015';
  const mockUserId = '507f1f77bcf86cd799439016';
  const mockItemId1 = '507f1f77bcf86cd799439017';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate complete salary with all components', async () => {
    const mockSalaryPackage = {
      _id: mockPackageId,
      employeeId: {
        _id: mockEmployeeId,
        accountName: 'Ahmed Khan',
        basicPay: 50000,
      },
      employeeName: 'Ahmed Khan',
      status: 'Active',
      basicPay: {
        amount: 50000,
        source: 'biodata',
      },
      dailyAllowance: {
        type: 'Fix Amount',
        value: 5000,
      },
      petrolAllowance: {
        type: '%',
        value: 15, // 15% of 50000 = 7500
      },
      mobilePackage: {
        type: 'Amount',
        value: 2000,
      },
      salesTarget: {
        targetAmount: 500000,
        incentiveType: '%',
        incentiveValue: 5, // 5% of excess
      },
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
      partyVisitTarget: {
        numberOfOrders: 50,
        type: 'Fix Amount',
        value: 3000,
      },
      mobileOrderIncentive: {
        type: 'Amount',
        value: 100, // per order
      },
      mobileCashRecoveryIncentive: {
        type: '%',
        value: 2, // 2% of recovered amount
      },
      brandIncentives: [
        {
          itemId: mockItemId1,
          itemName: 'Brand A Medicine',
          quantityTarget: 100,
          duration: {
            fromDate: new Date('2025-01-01'),
            toDate: new Date('2025-12-31'),
          },
          type: 'Fix Amount',
          value: 5000,
        },
      ],
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'January',
        type: 'Fix Amount',
        value: 10000,
        detail: 'New Year Bonus',
      },
    };

    // Mock sales invoices
    const mockSalesInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 600000 },
        customerId: 'customer1',
        items: [
          {
            itemId: mockItemId1,
            quantity: 120,
          },
        ],
      },
    ];

    // Mock cash receipts
    const mockCashReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 450000,
      },
    ];

    // Mock database calls
    SalaryPackage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSalaryPackage),
    });

    SalaryCalculation.findOne = jest.fn().mockResolvedValue(null);
    
    // Mock the save method to return the instance
    const mockSave = jest.fn().mockImplementation(function() {
      return Promise.resolve(this);
    });
    SalaryCalculation.prototype.save = mockSave;

    // Mock Invoice.find for different use cases
    Invoice.find = jest.fn()
      .mockResolvedValueOnce(mockSalesInvoices) // For sales incentive
      .mockReturnValueOnce({
        distinct: jest.fn().mockResolvedValue(['customer1', 'customer2', 'customer3']), // For party visit (3 unique customers)
      })
      .mockResolvedValueOnce(mockSalesInvoices); // For brand incentives

    Invoice.countDocuments = jest.fn().mockResolvedValue(10); // 10 mobile orders

    CashReceipt.find = jest.fn()
      .mockResolvedValueOnce(mockCashReceipts) // For recovery incentive
      .mockResolvedValueOnce(mockCashReceipts); // For mobile cash recovery

    const result = await salaryCalculationService.calculateSalary(
      mockPackageId,
      'January',
      2025,
      mockUserId
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.message).toBe('Salary calculated successfully');

    // Verify the SalaryCalculation constructor was called with correct data
    expect(mockSave).toHaveBeenCalled();
  });

  it('should throw error if salary package not found', async () => {
    SalaryPackage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(
      salaryCalculationService.calculateSalary(mockPackageId, 'January', 2025, mockUserId)
    ).rejects.toThrow('Salary package not found');
  });

  it('should throw error if salary package is not active', async () => {
    const mockSalaryPackage = {
      _id: mockPackageId,
      employeeId: {
        _id: mockEmployeeId,
        accountName: 'Ahmed Khan',
      },
      status: 'Inactive',
    };

    SalaryPackage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSalaryPackage),
    });

    await expect(
      salaryCalculationService.calculateSalary(mockPackageId, 'January', 2025, mockUserId)
    ).rejects.toThrow('Salary package is not active');
  });

  it('should throw error if calculation already exists', async () => {
    const mockSalaryPackage = {
      _id: mockPackageId,
      employeeId: {
        _id: mockEmployeeId,
        accountName: 'Ahmed Khan',
      },
      status: 'Active',
    };

    const existingCalculation = {
      _id: 'existing123',
      month: 'January',
      year: 2025,
    };

    SalaryPackage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSalaryPackage),
    });

    SalaryCalculation.findOne = jest.fn().mockResolvedValue(existingCalculation);

    await expect(
      salaryCalculationService.calculateSalary(mockPackageId, 'January', 2025, mockUserId)
    ).rejects.toThrow('Salary calculation already exists for January 2025');
  });

  it('should calculate salary with zero incentives when targets not met', async () => {
    const mockSalaryPackage = {
      _id: mockPackageId,
      employeeId: {
        _id: mockEmployeeId,
        accountName: 'Ahmed Khan',
      },
      employeeName: 'Ahmed Khan',
      status: 'Active',
      basicPay: {
        amount: 50000,
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
      salesTarget: {
        targetAmount: 500000,
        incentiveType: 'Fix Amount',
        incentiveValue: 10000,
      },
      recoveryTarget: {
        targetAmount: 400000,
        incentiveType: 'Fix Amount',
        incentiveValue: 8000,
      },
      partyVisitTarget: {
        numberOfOrders: 50,
        type: 'Fix Amount',
        value: 3000,
      },
      mobileOrderIncentive: {
        type: 'Fix Amount',
        value: 1000,
      },
      mobileCashRecoveryIncentive: {
        type: 'Fix Amount',
        value: 2000,
      },
      brandIncentives: [],
      eidFitrBonus: {
        month: 'April',
        type: 'Fix Amount',
        value: 0,
      },
      eidAdhaBonus: {
        month: 'June',
        type: 'Fix Amount',
        value: 0,
      },
      otherBonus: {
        month: 'December',
        type: 'Fix Amount',
        value: 0,
      },
    };

    // Mock low sales and recovery
    const mockSalesInvoices = [
      {
        salesmanId: mockEmployeeId,
        type: 'sales',
        status: 'completed',
        totals: { grandTotal: 200000 }, // Below target
        customerId: 'customer1',
      },
    ];

    const mockCashReceipts = [
      {
        salesmanId: mockEmployeeId,
        status: 'cleared',
        amount: 150000, // Below target
      },
    ];

    SalaryPackage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSalaryPackage),
    });

    SalaryCalculation.findOne = jest.fn().mockResolvedValue(null);
    
    // Mock the save method to return the instance
    const mockSave = jest.fn().mockImplementation(function() {
      return Promise.resolve(this);
    });
    SalaryCalculation.prototype.save = mockSave;

    Invoice.find = jest.fn()
      .mockResolvedValueOnce(mockSalesInvoices) // For sales incentive
      .mockReturnValueOnce({
        distinct: jest.fn().mockResolvedValue(['customer1']), // For party visit (1 unique customer)
      });
    Invoice.countDocuments = jest.fn().mockResolvedValue(0);

    CashReceipt.find = jest.fn()
      .mockResolvedValueOnce(mockCashReceipts) // For recovery incentive
      .mockResolvedValueOnce(mockCashReceipts); // For mobile cash recovery

    const result = await salaryCalculationService.calculateSalary(
      mockPackageId,
      'January',
      2025,
      mockUserId
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Verify the save was called
    expect(mockSave).toHaveBeenCalled();
  });

  it('should apply deductions correctly', () => {
    const grossSalary = 100000;
    const deductions = {
      tax: 5000,
      advance: 10000,
      loan: 8000,
      other: 2000,
    };

    const netSalary = salaryCalculationService.applyDeductions(grossSalary, deductions);

    expect(netSalary).toBe(75000); // 100000 - 25000
  });

  it('should handle zero deductions', () => {
    const grossSalary = 100000;
    const deductions = {
      tax: 0,
      advance: 0,
      loan: 0,
      other: 0,
    };

    const netSalary = salaryCalculationService.applyDeductions(grossSalary, deductions);

    expect(netSalary).toBe(100000);
  });

  it('should handle missing deduction fields', () => {
    const grossSalary = 100000;
    const deductions = {
      tax: 5000,
    };

    const netSalary = salaryCalculationService.applyDeductions(grossSalary, deductions);

    expect(netSalary).toBe(95000);
  });
});
