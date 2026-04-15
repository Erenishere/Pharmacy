import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Sales Invoice Interfaces
export interface InvoiceItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  deliveryCharges: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  referenceNumber?: string;
  createdBy: string;
  sentBy?: string;
  sentDate?: string;
  paidBy?: string;
  paidDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  convertedFrom?: 'quotation' | 'e-order';
  sourceId?: string;
}

export interface InvoiceQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card';
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  processedBy: string;
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
export class SalesInvoiceService {
  private baseUrl = `${environment.apiUrl}/sales`;

  constructor(private http: HttpClient) {}

  // Sales Invoice CRUD Operations
  getInvoices(params: InvoiceQueryParams = {}): Observable<ApiResponse<SalesInvoice[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<SalesInvoice[]>>(`${this.baseUrl}/invoices`, { params: httpParams });
  }

  getInvoiceById(id: string): Observable<ApiResponse<SalesInvoice>> {
    return this.http.get<ApiResponse<SalesInvoice>>(`${this.baseUrl}/invoices/${id}`);
  }

  createInvoice(invoice: Partial<SalesInvoice>): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/invoices`, invoice);
  }

  updateInvoice(id: string, invoice: Partial<SalesInvoice>): Observable<ApiResponse<SalesInvoice>> {
    return this.http.put<ApiResponse<SalesInvoice>>(`${this.baseUrl}/invoices/${id}`, invoice);
  }

  deleteInvoice(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/invoices/${id}`);
  }

  // Invoice Workflow Operations
  sendInvoice(id: string, sendData: { sentBy: string; emailSubject?: string; emailMessage?: string }): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/invoices/${id}/send`, sendData);
  }

  processPayment(id: string, paymentData: {
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card';
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
    processedBy: string;
  }): Observable<ApiResponse<{ invoice: SalesInvoice; transaction: PaymentTransaction }>> {
    return this.http.post<ApiResponse<{ invoice: SalesInvoice; transaction: PaymentTransaction }>>(`${this.baseUrl}/invoices/${id}/pay`, paymentData);
  }

  cancelInvoice(id: string, cancellationData: { cancelledBy: string; reason: string }): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/invoices/${id}/cancel`, cancellationData);
  }

  // Payment Operations
  getInvoicePayments(invoiceId: string): Observable<ApiResponse<PaymentTransaction[]>> {
    return this.http.get<ApiResponse<PaymentTransaction[]>>(`${this.baseUrl}/invoices/${invoiceId}/payments`);
  }

  refundPayment(invoiceId: string, paymentId: string, refundData: {
    refundAmount: number;
    refundReason: string;
    processedBy: string;
  }): Observable<ApiResponse<PaymentTransaction>> {
    return this.http.post<ApiResponse<PaymentTransaction>>(`${this.baseUrl}/invoices/${invoiceId}/payments/${paymentId}/refund`, refundData);
  }

  // Invoice Conversion Operations
  convertQuotationToInvoice(quotationId: string, invoiceData: Partial<SalesInvoice>): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/quotations/${quotationId}/convert-to-invoice`, invoiceData);
  }

  convertEOrderToInvoice(eOrderId: string, invoiceData: Partial<SalesInvoice>): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/e-orders/${eOrderId}/convert-to-invoice`, invoiceData);
  }

  // Receipt Generation
  generateReceipt(invoiceId: string, receiptData: {
    receiptNumber: string;
    receiptDate: string;
    receivedBy: string;
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/invoices/${invoiceId}/generate-receipt`, receiptData);
  }

  // Customer Operations
  getCustomers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/customers`);
  }

  getCustomerById(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/customers/${id}`);
  }

  // Analytics and Reporting
  getSalesAnalytics(params: { startDate?: string; endDate?: string; customerId?: string } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics`, { params: httpParams });
  }

  // Export Operations
  exportInvoices(params: InvoiceQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
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
  calculateInvoiceTotal(items: InvoiceItem[], deliveryCharges: number = 0): number {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return subtotal + deliveryCharges;
  }

  calculateItemTotal(quantity: number, unitPrice: number, discountPercent: number, taxPercent: number): InvoiceItem {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxPercent / 100);
    const totalPrice = taxableAmount + taxAmount;

    return {
      itemId: '',
      itemName: '',
      quantity,
      unitPrice,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      totalPrice
    };
  }

  validateInvoice(invoice: Partial<SalesInvoice>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!invoice.customerId) {
      errors.push('Customer is required');
    }

    if (!invoice.dueDate) {
      errors.push('Due date is required');
    } else {
      const dueDate = new Date(invoice.dueDate);
      const invoiceDate = new Date(invoice.invoiceDate || new Date());
      if (dueDate <= invoiceDate) {
        errors.push('Due date must be after invoice date');
      }
    }

    if (!invoice.items || invoice.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      invoice.items.forEach((item, index) => {
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
        if (item.taxPercent < 0 || item.taxPercent > 100) {
          errors.push(`Item ${index + 1}: Tax percentage must be between 0 and 100`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isInvoiceOverdue(invoice: SalesInvoice): boolean {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return false;
    }
    const dueDate = new Date(invoice.dueDate);
    const now = new Date();
    return now > dueDate;
  }

  getInvoiceStatusColor(status: SalesInvoice['status']): string {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'sent': return '#2196F3';
      case 'paid': return '#4CAF50';
      case 'overdue': return '#F44336';
      case 'cancelled': return '#666';
      default: return '#666';
    }
  }

  getInvoiceStatusText(status: SalesInvoice['status']): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getPaymentStatus(invoice: SalesInvoice): 'unpaid' | 'partial' | 'paid' {
    if (invoice.paidAmount === 0) {
      return 'unpaid';
    } else if (invoice.paidAmount >= invoice.totalAmount) {
      return 'paid';
    } else {
      return 'partial';
    }
  }

  calculateBalance(invoice: SalesInvoice): number {
    return invoice.totalAmount - invoice.paidAmount;
  }
}
