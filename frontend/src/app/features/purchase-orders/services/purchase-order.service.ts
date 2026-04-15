import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  poDate: string;
  supplierId: string;
  supplierName?: string;
  supplierTown?: string;
  billNo?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  fulfillmentStatus?: 'pending' | 'partial' | 'fulfilled';
  convertedInvoiceId?: string;
  convertedAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName?: string;
  boxPacking: number;
  boxQty: number;
  unitQty: number;
  boxTP: number;
  unitTP: number;
  discount: number;
  netAmount: number;
  receivedQuantity?: number;
  pendingQuantity?: number;
}

export interface PurchaseOrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
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

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
  private apiUrl = `${environment.apiUrl}/purchase-orders`;

  constructor(private http: HttpClient) { }

  getPurchaseOrders(params: PurchaseOrderQueryParams = {}): Observable<ApiResponse<PurchaseOrder[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<PurchaseOrder[]>>(this.apiUrl, { params: httpParams });
  }

  getPurchaseOrderById(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.get<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}`);
  }

  createPurchaseOrder(po: Partial<PurchaseOrder>): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(this.apiUrl, po);
  }

  updatePurchaseOrder(id: string, po: Partial<PurchaseOrder>): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.put<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}`, po);
  }

  deletePurchaseOrder(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  sendPurchaseOrder(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.patch<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/send`, {});
  }

  approvePurchaseOrder(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/approve`, {});
  }

  confirmPurchaseOrder(id: string): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.patch<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/confirm`, {});
  }

  convertToInvoice(id: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/convert`, {});
  }

  getOutstandingPOs(): Observable<ApiResponse<PurchaseOrder[]>> {
    return this.http.get<ApiResponse<PurchaseOrder[]>>(`${this.apiUrl}/outstanding`);
  }

  getSuppliers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/suppliers`);
  }

  getItems(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/items`);
  }
}
