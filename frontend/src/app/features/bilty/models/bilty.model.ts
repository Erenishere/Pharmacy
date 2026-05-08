export type BiltyReceiptType = 'receive' | 'send';
export type BiltyReceiptStatus = 'pending' | 'received' | 'sent';

export interface BiltyNugDetail {
  nugType: string;
  qtyNug: number;
  totalLooseNug: number;
}

export interface BiltyReceipt {
  _id: string;
  biltyType: BiltyReceiptType;
  biltyDate: string;
  partyId?: {
    _id: string;
    name?: string;
    town?: string;
  } | string;
  partyName?: string;
  partyTown?: string;
  claimAccountId?: {
    _id: string;
    name?: string;
  } | string;
  claimAccountName?: string;
  transporterName?: string;
  agentName?: string;
  agentAmount?: number;
  biltyNo?: string;
  totalNug: number;
  nugDetail: BiltyNugDetail[];
  biltyAmount?: number;
  status: BiltyReceiptStatus;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface BiltyReceiptFilters {
  page?: number;
  limit?: number;
  biltyType?: BiltyReceiptType;
  status?: BiltyReceiptStatus;
  partyId?: string;
  fromDate?: string;
  toDate?: string;
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
