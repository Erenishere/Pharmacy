export interface TargetData {
  target: number;
  achieved: number;
  percentage: number;
  status: 'achieved' | 'pending' | 'no_package' | 'no_target';
  remaining?: number;
}

export interface MobileOrdersData {
  ordersCreated: number;
  incentiveConfigured: boolean;
  incentiveType?: string;
  incentiveValue?: number;
}

export interface MobileCashRecoveryData {
  amountRecovered: number;
  incentiveConfigured: boolean;
  incentiveType?: string;
  incentiveValue?: number;
}

export interface BrandIncentiveData {
  itemName: string;
  target: number;
  achieved: number;
  percentage: number;
  status: 'achieved' | 'pending';
}

export interface EmployeeTargetData {
  employeeId: string;
  employeeName: string;
  packageId: string;
  salesTarget: TargetData;
  recoveryTarget: TargetData;
  partyVisitTarget: TargetData;
  mobileOrders: MobileOrdersData;
  mobileCashRecovery: MobileCashRecoveryData;
  brandIncentives: BrandIncentiveData[];
}

export interface DashboardSummary {
  totalEmployees: number;
  salesTargetAchievers: number;
  recoveryTargetAchievers: number;
  partyVisitTargetAchievers: number;
}

export interface TargetDashboardData {
  month: string;
  year: number;
  employees: EmployeeTargetData[];
  summary: DashboardSummary;
}

export interface TargetDashboardResponse {
  success: boolean;
  message: string;
  data: TargetDashboardData;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    recordsPerPage: number;
  };
}

export interface EmployeeTargetResponse {
  success: boolean;
  message: string;
  data: {
    employeeId: string;
    employeeName: string;
    month: string;
    year: number;
    salesTarget: TargetData;
    recoveryTarget: TargetData;
    partyVisitTarget: TargetData;
    mobileOrders: MobileOrdersData;
    mobileCashRecovery: MobileCashRecoveryData;
    brandIncentives: BrandIncentiveData[];
  };
}
