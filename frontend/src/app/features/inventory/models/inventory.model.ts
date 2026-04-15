export interface StockLevel {
  _id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId?: string;
  categoryName?: string;
  companyId?: string;
  companyName?: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumLevel?: number;
  reorderLevel?: number;
  batchNumber?: string;
  expiryDate?: string;
  lastUpdated: string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

export interface StockOverview {
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface StockTransfer {
  _id: string;
  transferNumber: string;
  transferDate: string;
  itemId: string;
  itemName: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantities: {
    qtyCtn: number;
    qtyBox: number;
    qtyUnit: number;
    totalUnitQty: number;
  };
  batchNumber?: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  _id: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  itemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  notes?: string;
  batchNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  itemId?: string;
  warehouseId?: string;
  categoryId?: string;
  companyId?: string;
  stockStatus?: 'all' | 'low_stock' | 'out_of_stock';
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
}
