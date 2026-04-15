export interface Bilty {
  _id: string;
  invoiceId: any;
  biltyNumber: string;
  transporterId: any;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  totalNugs: number;
  nugBreakdown: NugBreakdown[];
  freightCharges: number;
  status: string;
  dispatchDate: string;
  receivedDate?: string;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NugBreakdown {
  description: string;
  quantity: number;
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
