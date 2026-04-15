import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Sales Returns Interfaces
export interface ReturnItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  returnReason: 'damaged' | 'expired' | 'wrong_item' | 'customer_request' | 'quality_issue' | 'other';
  condition: 'good' | 'damaged' | 'expired';
  creditPercent: number; // Percentage of original price to credit (0-100)
  creditAmount: number;
  taxCreditAmount: number;
  totalCredit: number;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  returnDate: string;
  status: 'draft' | 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  items: ReturnItem[];
  subtotal: number;
  totalCredit: number;
  taxCredit: number;
  netCredit: number;
  processingFees: number;
  finalCreditAmount: number;
  notes?: string;
  referenceNumber?: string;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
  processedBy?: string;
  processedDate?: string;
  completedBy?: string;
  completedDate?: string;
  creditNoteId?: string;
  creditNoteNumber?: string;
  paymentMethod?: 'refund' | 'credit_note' | 'adjustment';
  refundAmount?: number;
  refundDate?: string;
}

export interface ReturnQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
  invoiceId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  returnId: string;
  customerId: string;
  customerName: string;
  amount: number;
  issuedDate: string;
  expiryDate?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  usedAmount: number;
  balanceAmount: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SalesReturnsService {
  private baseUrl = `${environment.apiUrl}/sales/returns`;

  constructor(private http: HttpClient) {}

  // Sales Returns CRUD Operations
  getReturns(params: ReturnQueryParams = {}): Observable<ApiResponse<SalesReturn[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<SalesReturn[]>>(`${this.baseUrl}`, { params: httpParams });
  }

  getReturnById(id: string): Observable<ApiResponse<SalesReturn>> {
    return this.http.get<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}`);
  }

  createReturn(returnData: Partial<SalesReturn>): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}`, returnData);
  }

  updateReturn(id: string, returnData: Partial<SalesReturn>): Observable<ApiResponse<SalesReturn>> {
    return this.http.put<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}`, returnData);
  }

  deleteReturn(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Return Workflow Operations
  submitReturn(id: string): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}/submit`, {});
  }

  approveReturn(id: string, approvalData: {
    approvedBy: string;
    notes?: string;
    items: Array<{
      itemId: string;
      approvedQuantity: number;
      creditPercent: number;
      returnReason: string;
    }>;
  }): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}/approve`, approvalData);
  }

  rejectReturn(id: string, rejectionData: {
    rejectedBy: string;
    reason: string;
  }): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}/reject`, rejectionData);
  }

  processReturn(id: string, processData: {
    processedBy: string;
    items: Array<{
      itemId: string;
      quantity: number;
      batchNumber: string;
      condition: 'good' | 'damaged' | 'expired';
      location: string;
    }>;
    notes?: string;
  }): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}/process`, processData);
  }

  completeReturn(id: string, completionData: {
    completedBy: string;
    paymentMethod: 'refund' | 'credit_note' | 'adjustment';
    refundAmount?: number;
    creditNoteAmount?: number;
    notes?: string;
  }): Observable<ApiResponse<{ return: SalesReturn; creditNote?: CreditNote }>> {
    return this.http.post<ApiResponse<{ return: SalesReturn; creditNote?: CreditNote }>>(`${this.baseUrl}/${id}/complete`, completionData);
  }

  cancelReturn(id: string, cancellationData: {
    cancelledBy: string;
    reason: string;
  }): Observable<ApiResponse<SalesReturn>> {
    return this.http.post<ApiResponse<SalesReturn>>(`${this.baseUrl}/${id}/cancel`, cancellationData);
  }

  // Credit Note Operations
  getCreditNotes(customerId?: string): Observable<ApiResponse<CreditNote[]>> {
    const params = customerId ? new HttpParams().set('customerId', customerId) : new HttpParams();
    return this.http.get<ApiResponse<CreditNote[]>>(`${this.baseUrl}/credit-notes`, { params });
  }

  getCreditNoteById(id: string): Observable<ApiResponse<CreditNote>> {
    return this.http.get<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}`);
  }

  applyCreditNote(creditNoteId: string, invoiceId: string, amount: number): Observable<ApiResponse<CreditNote>> {
    return this.http.post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${creditNoteId}/apply`, {
      invoiceId,
      amount
    });
  }

  // Recovery Operations
  createRecoveryRequest(returnId: string, recoveryData: {
    recoveryType: 'refund' | 'replacement' | 'credit';
    amount: number;
    reason: string;
    priority: 'normal' | 'urgent' | 'express';
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${returnId}/recovery`, recoveryData);
  }

  processRecovery(recoveryId: string, processData: {
    processedBy: string;
    action: 'approve' | 'reject' | 'partial';
    approvedAmount?: number;
    rejectionReason?: string;
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/recovery/${recoveryId}/process`, processData);
  }

  // Analytics and Reporting
  getReturnsAnalytics(params: { startDate?: string; endDate?: string; customerId?: string } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics`, { params: httpParams });
  }

  // Stock Operations
  returnItemsToStock(returnId: string, items: Array<{
    itemId: string;
    quantity: number;
    batchNumber: string;
    condition: 'good' | 'damaged' | 'expired';
    location: string;
  }>): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/${returnId}/return-to-stock`, { items });
  }

  // Export Operations
  exportReturns(params: ReturnQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get(`${this.baseUrl}/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  // Utility Methods
  calculateReturnCredit(items: ReturnItem[]): number {
    return items.reduce((sum, item) => sum + item.totalCredit, 0);
  }

  calculateItemCredit(quantity: number, unitPrice: number, creditPercent: number, taxRate: number = 0): ReturnItem {
    const subtotal = quantity * unitPrice;
    const creditAmount = subtotal * (creditPercent / 100);
    const taxCreditAmount = creditAmount * (taxRate / 100);
    const totalCredit = creditAmount + taxCreditAmount;

    return {
      itemId: '',
      itemName: '',
      quantity,
      unitPrice,
      returnReason: 'other',
      condition: 'good',
      creditPercent,
      creditAmount,
      taxCreditAmount,
      totalCredit
    };
  }

  validateReturn(returnData: Partial<SalesReturn>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!returnData.invoiceId) {
      errors.push('Invoice is required');
    }

    if (!returnData.customerId) {
      errors.push('Customer is required');
    }

    if (!returnData.items || returnData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      returnData.items.forEach((item, index) => {
        if (!item.itemId) {
          errors.push(`Item ${index + 1}: Item is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
        }
        if (item.creditPercent < 0 || item.creditPercent > 100) {
          errors.push(`Item ${index + 1}: Credit percentage must be between 0 and 100`);
        }
        if (!item.returnReason) {
          errors.push(`Item ${index + 1}: Return reason is required`);
        }
        if (!item.condition) {
          errors.push(`Item ${index + 1}: Item condition is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getReturnStatusColor(status: SalesReturn['status']): string {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'pending': return '#FF9800';
      case 'approved': return '#2196F3';
      case 'processing': return '#9C27B0';
      case 'completed': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#666';
      default: return '#666';
    }
  }

  getReturnStatusText(status: SalesReturn['status']): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getReturnReasonText(reason: ReturnItem['returnReason']): string {
    switch (reason) {
      case 'damaged': return 'Damaged';
      case 'expired': return 'Expired';
      case 'wrong_item': return 'Wrong Item';
      case 'customer_request': return 'Customer Request';
      case 'quality_issue': return 'Quality Issue';
      case 'other': return 'Other';
      default: return reason;
    }
  }

  getConditionText(condition: ReturnItem['condition']): string {
    switch (condition) {
      case 'good': return 'Good';
      case 'damaged': return 'Damaged';
      case 'expired': return 'Expired';
      default: return condition;
    }
  }

  isReturnEligible(invoiceDate: string, returnPolicyDays: number = 30): boolean {
    const invoiceDateObj = new Date(invoiceDate);
    const now = new Date();
    const diffTime = now.getTime() - invoiceDateObj.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= returnPolicyDays;
  }

  calculateProcessingFees(amount: number, feePercent: number = 5): number {
    return amount * (feePercent / 100);
  }
}
