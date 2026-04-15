export interface Batch {
  _id: string;
  batchNumber: string;
  item: {
    _id: string;
    name: string;
    code: string;
    unit?: string;
  };
  warehouse: {
    _id: string;
    name: string;
    code?: string;
  };
  location?: {
    _id: string;
    name: string;
    code?: string;
  };
  supplier?: {
    _id: string;
    name: string;
  };
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  totalCost: number;
  status: 'active' | 'expired' | 'depleted' | 'quarantined';
  notes?: string;
  referenceNumber?: string;
  referenceType?: 'PURCHASE_ORDER' | 'TRANSFER' | 'ADJUSTMENT' | 'OTHER';
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  expiredBatches: number;
  nearExpiryBatches: number;
  depletedBatches: number;
  totalValue: number;
  totalQuantity: number;
  totalRemainingQuantity: number;
}

export interface BatchQueryParams {
  page?: number;
  limit?: number;
  itemSearch?: string;
  locationIds?: string[];
  supplierIds?: string[];
  statuses?: string[];
  expiryStart?: string;
  expiryEnd?: string;
  quantityMin?: number;
  quantityMax?: number;
  includeExpired?: boolean;
  includeDepleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp?: string;
}
