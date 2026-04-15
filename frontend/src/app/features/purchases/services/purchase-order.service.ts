import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Purchase Order Interfaces
export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  invoiceNumber?: string;
  paymentTerms?: string;
  deliveryAddress?: string;
}

export interface PurchaseOrderQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
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
export class PurchaseOrderService {
  private baseUrl = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  // Purchase Order CRUD Operations
  getPurchaseOrders(params: PurchaseOrderQueryParams = {}): Observable<ApiResponse<PurchaseOrder[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<PurchaseOrder[]>>(`${this.baseUrl}/orders`, { params: httpParams });
  }

  getPurchaseOrderById(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.get<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}`);
  }

  createPurchaseOrder(order: Partial<PurchaseOrder>): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders`, order);
  }

  updatePurchaseOrder(id: string, order: Partial<PurchaseOrder>): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.put<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}`, order);
  }

  deletePurchaseOrder(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/orders/${id}`);
  }

  // Purchase Order Workflow Operations
  submitPurchaseOrder(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}/submit`, {});
  }

  approvePurchaseOrder(id: string, approvalData: { approvedBy: string; notes?: string }): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}/approve`, approvalData);
  }

  rejectPurchaseOrder(id: string, rejectionData: { rejectedBy: string; reason: string }): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}/reject`, rejectionData);
  }

  receivePurchaseOrder(id: string, receiptData: {
    receivedBy: string;
    receivedItems: Array<{
      itemId: string;
      receivedQuantity: number;
      batchNumber?: string;
      expiryDate?: string;
      notes?: string;
    }>;
    invoiceNumber?: string;
    notes?: string;
  }): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${id}/receive`, receiptData);
  }

  convertToInvoice(id: string, invoiceData: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/orders/${id}/convert-to-invoice`, invoiceData);
  }

  // Supplier Management
  getSuppliers(): Observable<ApiResponse<Supplier[]>> {
    return this.http.get<ApiResponse<Supplier[]>>(`${this.baseUrl}/suppliers`);
  }

  getSupplierById(id: string): Observable<ApiResponse<Supplier>> {
    return this.http.get<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers/${id}`);
  }

  createSupplier(supplier: Partial<Supplier>): Observable<ApiResponse<Supplier>> {
    return this.http.post<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers`, supplier);
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<ApiResponse<Supplier>> {
    return this.http.put<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers/${id}`, supplier);
  }

  // Purchase Analytics
  getPurchaseAnalytics(params: { startDate?: string; endDate?: string; supplierId?: string } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics`, { params: httpParams });
  }

  // Export Operations
  exportPurchaseOrders(params: PurchaseOrderQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
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
  calculateOrderTotal(items: PurchaseOrderItem[], taxRate: number = 0, discountAmount: number = 0): number {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    return subtotal + taxAmount - discountAmount;
  }

  validatePurchaseOrder(order: Partial<PurchaseOrder>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.supplierId) {
      errors.push('Supplier is required');
    }

    if (!order.items || order.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      order.items.forEach((item, index) => {
        if (!item.itemId) {
          errors.push(`Item ${index + 1}: Item ID is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
        }
      });
    }

    if (!order.expectedDate) {
      errors.push('Expected delivery date is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
