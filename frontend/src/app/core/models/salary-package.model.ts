export interface SalaryPackage {
  _id?: string;
  packageId?: string;
  employeeId: string;
  employeeName: string;
  duration: {
    fromDate: Date | string;
    toDate: Date | string;
  };
  basicPay: {
    amount: number;
    source: 'biodata';
  };
  salesTarget: {
    targetAmount: number;
    incentiveType: IncentiveType;
    incentiveValue: number;
  };
  recoveryTarget: {
    targetAmount: number;
    incentiveType: IncentiveType;
    incentiveValue: number;
  };
  dailyAllowance: {
    type: IncentiveType;
    value: number;
  };
  petrolAllowance: {
    type: IncentiveType;
    value: number;
  };
  mobilePackage: {
    type: IncentiveType;
    value: number;
  };
  mobileOrderIncentive: {
    type: IncentiveType;
    value: number;
  };
  mobileCashRecoveryIncentive: {
    type: IncentiveType;
    value: number;
    verifyWithCashBook?: boolean;
  };
  partyVisitTarget: {
    numberOfOrders: number;
    type: IncentiveType;
    value: number;
  };
  eidFitrBonus: {
    month: string;
    type: IncentiveType;
    value: number;
  };
  eidAdhaBonus: {
    month: string;
    type: IncentiveType;
    value: number;
  };
  otherBonus: {
    detail: string;
    month: string;
    type: IncentiveType;
    value: number;
  };
  brandIncentives: BrandIncentive[];
  status?: string;
  createdBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BrandIncentive {
  _id?: string;
  itemId: string;
  itemName: string;
  quantityTarget: number;
  duration: {
    fromDate: Date | string;
    toDate: Date | string;
  };
  type: IncentiveType;
  value: number;
}

export type IncentiveType = 'Fix Amount' | 'Amount' | '%';

export interface Employee {
  _id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  basicPay: number;
  accountType: 'employee';
  isActive: boolean;
}

export interface Item {
  _id: string;
  code: string;
  name: string;
  category?: string;
}

export interface SalaryPackageCreateRequest {
  employeeId: string;
  duration: {
    fromDate: Date | string;
    toDate: Date | string;
  };
  salesTarget: {
    targetAmount: number;
    incentiveType: IncentiveType;
    incentiveValue: number;
  };
  recoveryTarget: {
    targetAmount: number;
    incentiveType: IncentiveType;
    incentiveValue: number;
  };
  dailyAllowance: {
    type: IncentiveType;
    value: number;
  };
  petrolAllowance: {
    type: IncentiveType;
    value: number;
  };
  mobilePackage: {
    type: IncentiveType;
    value: number;
  };
  mobileOrderIncentive: {
    type: IncentiveType;
    value: number;
  };
  mobileCashRecoveryIncentive: {
    type: IncentiveType;
    value: number;
  };
  partyVisitTarget: {
    numberOfOrders: number;
    type: IncentiveType;
    value: number;
  };
  eidFitrBonus: {
    month: string;
    type: IncentiveType;
    value: number;
  };
  eidAdhaBonus: {
    month: string;
    type: IncentiveType;
    value: number;
  };
  otherBonus: {
    detail: string;
    month: string;
    type: IncentiveType;
    value: number;
  };
  brandIncentives: BrandIncentive[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}
