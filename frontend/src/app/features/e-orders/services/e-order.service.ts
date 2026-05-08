import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

// E-Order Interfaces
export interface EOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  schemeId?: string;
  schemeName?: string;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
}

export interface EOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  salesmanId: string;
  salesmanName: string;
  orderDate: string;
  deliveryDate?: string;
  priority: 'normal' | 'urgent' | 'express';
  status: 'draft' | 'pending' | 'approved' | 'processing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: EOrderItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  deliveryCharges: number;
  totalAmount: number;
  notes?: string;
  deliveryAddress?: string;
  paymentTerms?: string;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
  processedBy?: string;
  processedDate?: string;
  deliveredBy?: string;
  deliveredDate?: string;
  convertedToInvoice?: boolean;
  invoiceId?: string;
  commissionAmount?: number;
  commissionRate?: number;
}

export interface EOrderQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
  salesmanId?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Salesman {
  id: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  isActive: boolean;
  commissionRate: number;
  targetAmount: number;
  currentMonthSales: number;
}

export interface Scheme {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  minimumQuantity: number;
  applicableItems: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
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
export class EOrderService {
  private baseUrl = `${environment.apiUrl}/e-orders`;
  private salesmenUrl = `${environment.apiUrl}/salesmen`;
  private schemesUrl = `${environment.apiUrl}/schemes`;

  constructor(private http: HttpClient) {}

  // E-Order CRUD Operations
  getEOrders(params: EOrderQueryParams = {}): Observable<ApiResponse<EOrder[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<EOrder[]>>(`${this.baseUrl}`, { params: httpParams });
  }

  getEOrderById(id: string): Observable<ApiResponse<EOrder>> {
    return this.http.get<ApiResponse<EOrder>>(`${this.baseUrl}/${id}`);
  }

  createEOrder(order: Partial<EOrder>): Observable<ApiResponse<EOrder>> {
    return this.http.post<ApiResponse<EOrder>>(`${this.baseUrl}`, order);
  }

  updateEOrder(id: string, order: Partial<EOrder>): Observable<ApiResponse<EOrder>> {
    return this.http.put<ApiResponse<EOrder>>(`${this.baseUrl}/${id}`, order);
  }

  deleteEOrder(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // E-Order Workflow Operations
  submitEOrder(id: string): Observable<ApiResponse<EOrder>> {
    return throwError(() => new Error('Submit is not a mounted e-order workflow. Create or update orders directly as pending.'));
  }

  approveEOrder(id: string, approvalData: { approvedBy: string; notes?: string }): Observable<ApiResponse<EOrder>> {
    return this.http.post<ApiResponse<EOrder>>(`${this.baseUrl}/${id}/approve`, approvalData);
  }

  cancelEOrder(id: string, cancellationData: { reason: string }): Observable<ApiResponse<EOrder>> {
    return this.http.post<ApiResponse<EOrder>>(`${this.baseUrl}/${id}/cancel`, cancellationData);
  }

  rejectEOrder(id: string, rejectionData: { rejectedBy: string; reason: string }): Observable<ApiResponse<EOrder>> {
    return this.cancelEOrder(id, { reason: rejectionData.reason });
  }

  processEOrder(id: string, processData: {
    processedBy: string;
    items: Array<{
      itemId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
    }>;
    notes?: string;
  }): Observable<ApiResponse<EOrder>> {
    return throwError(() => new Error('Process is not a mounted e-order workflow. Use approve, cancel, or convert-to-invoice.'));
  }

  markReadyForDelivery(id: string, readyData: { notes?: string }): Observable<ApiResponse<EOrder>> {
    return throwError(() => new Error('Ready-for-delivery is not a mounted e-order workflow.'));
  }

  assignDelivery(id: string, deliveryData: {
    deliveredBy: string;
    deliveryDate: string;
    notes?: string;
  }): Observable<ApiResponse<EOrder>> {
    return throwError(() => new Error('Delivery assignment is not a mounted e-order workflow.'));
  }

  markDelivered(id: string, deliveryData: {
    deliveredBy: string;
    deliveryDate: string;
    customerSignature?: string;
    notes?: string;
  }): Observable<ApiResponse<EOrder>> {
    return throwError(() => new Error('Mark-delivered is not a mounted e-order workflow.'));
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

  // Salesman Management
  getSalesmen(): Observable<ApiResponse<Salesman[]>> {
    return this.http.get<ApiResponse<Salesman[]>>(this.salesmenUrl);
  }

  getSalesmanById(id: string): Observable<ApiResponse<Salesman>> {
    return this.http.get<ApiResponse<Salesman>>(`${this.salesmenUrl}/${id}`);
  }

  // Scheme Management
  getSchemes(): Observable<ApiResponse<Scheme[]>> {
    return this.http.get<ApiResponse<Scheme[]>>(this.schemesUrl);
  }

  getApplicableSchemes(itemId: string, quantity: number, customerId?: string, companyId?: string): Observable<ApiResponse<Scheme[]>> {
    if (!customerId) {
      return throwError(() => new Error('customerId is required for the mounted /schemes/applicable endpoint.'));
    }

    return this.http.post<ApiResponse<Scheme[]>>(`${this.schemesUrl}/applicable`, {
      itemId,
      customerId,
      companyId,
      quantity
    });
  }

  // E-Order Analytics
  getEOrderAnalytics(params: { startDate?: string; endDate?: string; salesmanId?: string } = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/summary`, {
      params: this.toHttpParams(params)
    });
  }

  // Batch and Inventory Operations
  getAvailableBatches(itemId: string, requiredQuantity: number): Observable<ApiResponse<any[]>> {
    return throwError(() => new Error('Available batch lookup is not exposed by the mounted e-order API.'));
  }

  reserveStock(orderId: string, items: Array<{
    itemId: string;
    quantity: number;
    batchNumber?: string;
  }>): Observable<ApiResponse<null>> {
    return throwError(() => new Error('Stock reservation is not exposed by the mounted e-order API.'));
  }

  // Export Operations
  exportEOrders(params: EOrderQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
    return throwError(() => new Error('E-order export is not exposed by the mounted e-order API.'));
  }

  private toHttpParams(params: Record<string, string | number | undefined>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  // Utility Methods
  calculateEOrderTotal(items: EOrderItem[], taxRate: number = 0, deliveryCharges: number = 0): number {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    return subtotal + taxAmount + deliveryCharges;
  }

  calculateCommission(orderTotal: number, commissionRate: number): number {
    return orderTotal * (commissionRate / 100);
  }

  validateEOrder(order: Partial<EOrder>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.customerId) {
      errors.push('Customer is required');
    }

    if (!order.salesmanId) {
      errors.push('Salesman is required');
    }

    if (!order.deliveryDate) {
      errors.push('Delivery date is required');
    } else {
      const deliveryDate = new Date(order.deliveryDate);
      const orderDate = new Date(order.orderDate || new Date());
      if (deliveryDate < orderDate) {
        errors.push('Delivery date cannot be before order date');
      }
    }

    if (!order.items || order.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      order.items.forEach((item, index) => {
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

  getOrderStatusColor(status: EOrder['status']): string {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'pending': return '#FF9800';
      case 'approved': return '#2196F3';
      case 'processing': return '#9C27B0';
      case 'ready': return '#FF5722';
      case 'out_for_delivery': return '#795548';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  }

  getOrderStatusText(status: EOrder['status']): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'processing': return 'Processing';
      case 'ready': return 'Ready for Delivery';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getPriorityColor(priority: EOrder['priority']): string {
    switch (priority) {
      case 'normal': return '#4CAF50';
      case 'urgent': return '#FF9800';
      case 'express': return '#F44336';
      default: return '#666';
    }
  }

  getPriorityText(priority: EOrder['priority']): string {
    switch (priority) {
      case 'normal': return 'Normal';
      case 'urgent': return 'Urgent';
      case 'express': return 'Express';
      default: return priority;
    }
  }
}
