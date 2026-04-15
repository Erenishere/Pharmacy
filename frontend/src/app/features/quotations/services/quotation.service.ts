import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Quotation Interfaces
export interface QuotationItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  quotationDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  sentBy?: string;
  sentDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  convertedTo?: 'invoice' | 'e-order';
  convertedId?: string;
  convertedDate?: string;
}

export interface QuotationQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
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
export class QuotationService {
  private baseUrl = `${environment.apiUrl}/quotations`;

  constructor(private http: HttpClient) {}

  // Quotation CRUD Operations
  getQuotations(params: QuotationQueryParams = {}): Observable<ApiResponse<Quotation[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Quotation[]>>(`${this.baseUrl}`, { params: httpParams });
  }

  getQuotationById(id: string): Observable<ApiResponse<Quotation>> {
    return this.http.get<ApiResponse<Quotation>>(`${this.baseUrl}/${id}`);
  }

  createQuotation(quotation: Partial<Quotation>): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.baseUrl}`, quotation);
  }

  updateQuotation(id: string, quotation: Partial<Quotation>): Observable<ApiResponse<Quotation>> {
    return this.http.put<ApiResponse<Quotation>>(`${this.baseUrl}/${id}`, quotation);
  }

  deleteQuotation(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Quotation Workflow Operations
  sendQuotation(id: string, sendData: { sentBy: string; emailSubject?: string; emailMessage?: string }): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.baseUrl}/${id}/send`, sendData);
  }

  approveQuotation(id: string, approvalData: { approvedBy: string; notes?: string }): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.baseUrl}/${id}/approve`, approvalData);
  }

  rejectQuotation(id: string, rejectionData: { rejectedBy: string; reason: string }): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.baseUrl}/${id}/reject`, rejectionData);
  }

  convertToInvoice(id: string, invoiceData: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    paymentTerms: string;
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/convert-to-invoice`, invoiceData);
  }

  convertToEOrder(id: string, eOrderData: {
    salesmanId: string;
    deliveryDate?: string;
    priority: 'normal' | 'urgent' | 'express';
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/convert-to-eorder`, eOrderData);
  }

  duplicateQuotation(id: string): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  // Customer Management
  getCustomers(): Observable<ApiResponse<Customer[]>> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}/customers`);
  }

  getCustomerById(id: string): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}/customers/${id}`);
  }

  createCustomer(customer: Partial<Customer>): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}/customers`, customer);
  }

  // Quotation Analytics
  getQuotationAnalytics(params: { startDate?: string; endDate?: string; customerId?: string } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics`, { params: httpParams });
  }

  // Email Operations
  resendQuotationEmail(id: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/${id}/resend-email`, {});
  }

  // Export Operations
  exportQuotations(params: QuotationQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
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
  calculateQuotationTotal(items: QuotationItem[], taxRate: number = 0): number {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxableAmount = subtotal - totalDiscount;
    const taxAmount = taxableAmount * (taxRate / 100);
    return taxableAmount + taxAmount;
  }

  calculateItemTotal(quantity: number, unitPrice: number, discountPercent: number): { discountAmount: number; totalPrice: number } {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalPrice = subtotal - discountAmount;
    return { discountAmount, totalPrice };
  }

  validateQuotation(quotation: Partial<Quotation>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!quotation.customerId) {
      errors.push('Customer is required');
    }

    if (!quotation.validUntil) {
      errors.push('Validity date is required');
    } else {
      const validUntil = new Date(quotation.validUntil);
      const quotationDate = new Date(quotation.quotationDate || new Date());
      if (validUntil <= quotationDate) {
        errors.push('Validity date must be after quotation date');
      }
    }

    if (!quotation.items || quotation.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      quotation.items.forEach((item, index) => {
        if (!item.itemId) {
          errors.push(`Item ${index + 1}: Item is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
        }
        if (item.discountPercent < 0 || item.discountPercent > 100) {
          errors.push(`Item ${index + 1}: Discount percentage must be between 0 and 100`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isQuotationExpired(quotation: Quotation): boolean {
    const now = new Date();
    const validUntil = new Date(quotation.validUntil);
    return now > validUntil && quotation.status !== 'converted';
  }

  getQuotationStatusColor(status: Quotation['status']): string {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'sent': return '#2196F3';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'expired': return '#FF9800';
      case 'converted': return '#9C27B0';
      default: return '#666';
    }
  }

  getQuotationStatusText(status: Quotation['status']): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      case 'converted': return 'Converted';
      default: return status;
    }
  }
}
