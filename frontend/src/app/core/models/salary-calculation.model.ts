export interface SalaryCalculation {
  _id?: string;
  calculationId?: string;
  packageId: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  
  // Fixed Components
  basicPay: number;
  dailyAllowance: number;
  petrolAllowance: number;
  mobilePackage: number;
  
  // Target-Based Incentives
  salesIncentive: {
    target: number;
    achieved: number;
    percentage: number;
    amount: number;
  };
  recoveryIncentive: {
    target: number;
    achieved: number;
    percentage: number;
    amount: number;
  };
  partyVisitIncentive: {
    target: number;
    achieved: number;
    amount: number;
  };
  
  // Mobile Incentives
  mobileOrderIncentive: {
    ordersCreated: number;
    amount: number;
  };
  mobileCashRecoveryIncentive: {
    amountRecovered: number;
    amount: number;
  };
  
  // Brand Incentives
  brandIncentives: BrandIncentiveCalculation[];
  
  // Bonuses
  bonuses: BonusCalculation[];
  
  // Totals
  grossSalary: number;
  deductions: {
    tax: number;
    advance: number;
    loan: number;
    other: number;
  };
  netSalary: number;
  
  calculatedAt?: Date | string;
  calculatedBy?: string;
}

export interface BrandIncentiveCalculation {
  itemName: string;
  target: number;
  achieved: number;
  amount: number;
}

export interface BonusCalculation {
  type: string; // 'Eid Fitr', 'Eid Adha', 'Other'
  detail: string;
  amount: number;
}

export interface SalaryCalculationRequest {
  employeeId: string;
  month: string;
  year: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}
