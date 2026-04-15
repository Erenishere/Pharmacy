export interface InvoiceItem {
  itemId: string;
  itemName?: string;
  itemCode?: string;
  companyName?: string;
  quantity: number;
  boxQuantity?: number;
  unitQuantity?: number;
  totalUnitQty?: number;
  boxRate?: number;
  unitRate?: number;
  unitPrice: number;
  packSize?: number;
  // Discounts
  discount: number;
  discount1Percent?: number;
  discount1Amount?: number;
  discount2Percent?: number;
  discount2Amount?: number;
  totalAmountBeforeDiscount?: number;
  // Tax
  taxAmount: number;
  gstRate?: number;
  gstAmount?: number;
  gstBoxAmount?: number;
  gstUnitAmount?: number;
  gstTotal?: number;
  gst18Percent?: number;
  gst18Amount?: number;
  gst4Percent?: number;
  gst4Amount?: number;
  advanceTaxPercent?: number;
  advanceTaxAmount?: number;
  // Totals
  lineTotal: number;
  netAmount?: number;
  // Batch
  batchInfo?: {
    batchNumber: string;
    expiryDate: string;
    manufacturingDate?: string;
  };
  batchNumber?: string;
  expiryDate?: string;
  warehouseId?: string;
  // Schemes
  scheme1Qty?: number;
  scheme2Qty?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  grossTotal?: number;
  totalDiscount: number;
  discountTotal?: number;
  totalTax: number;
  gstTotal?: number;
  gst18Total?: number;
  gst4Total?: number;
  advanceTaxTotal?: number;
  nonFilerGst?: number;
  grandTotal: number;
  netBillTotal?: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase' | 'return_sales' | 'return_purchase';
  salesType?: 'new' | 'return';
  taxInvoiceType?: 'normal' | 'sales_tax' | 'sale_tax' | 'advance_tax';
  customerId?: string | {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    ntn?: string;
  };
  customerName?: string;
  customerTown?: string;
  supplierId?: string;
  supplierName?: string;
  salesmanId?: string | { _id: string; name: string };
  dimensionId?: string;
  claimAccountId?: string;
  invoiceDate: string;
  dueDate: string;
  creditDays?: number;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount?: number;
  remainingAmount?: number;
  previousBalance?: number;
  totalBalance?: number;
  creditLimitExceeded?: boolean;
  notes?: string;
  detailNote?: string;
  supplierBillNo?: string;
  memoNo?: string;
  poReference?: string;
  otherTitle?: string;
  warehouseId?: string;
  printFormat?: string;
  // Bilty / Transport
  biltyNo?: string;
  biltyDate?: string;
  transportCompany?: string;
  transportCharges?: number;
  biltyStatus?: 'pending' | 'in_transit' | 'received';
  // Return info
  originalInvoiceId?: string;
  returnReason?: string;
  // Warranty
  warrantyInfo?: string;
  // Advance Tax
  advanceTaxRate?: number;
  claimPercentage?: number;
  overallDiscountPercent?: number;
  overallDiscountAmount?: number;
  // Source: 'admin' = created via admin form, 'pos' = created via POS terminal
  invoiceSource?: 'admin' | 'pos' | 'import';

  createdBy: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  supplierId?: string;
  customerId?: string;
  salesmanId?: string;
  createdBy?: string;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  draftCount: number;
  confirmedCount: number;
  paidCount: number;
  cancelledCount: number;
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
