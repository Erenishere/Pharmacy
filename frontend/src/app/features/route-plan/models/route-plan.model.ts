export interface RoutePlan {
  _id: string;
  monthYear: string;
  salesmanId: any;
  dimensionId?: any;
  salesTarget: number;
  recoveryTarget: number;
  visitTarget: number;
  days: DayPlan[];
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface DayPlan {
  _id?: string;
  dayOfWeek: string;
  areaId: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
