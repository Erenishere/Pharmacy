import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EOrderItem {
  itemId: string;
  itemName?: string;
  formulaSize?: string;
  companyName?: string;
  boxPacking?: number;
  boxQuantity?: number;
  unitQuantity?: number;
  unitPrice: number;
  rateWithGST?: number;
  discount?: number;
  gstRate?: number;
  gstAmount?: number;
  scheme1Quantity?: number;
  scheme2Quantity?: number;
  lineTotal?: number;
}

export interface EOrder {
  _id: string;
  orderNumber: string;
  orderDate: string;
  customerId: { _id: string; name: string; town?: string };
  customerName?: string; // For backward compatibility
  customerTown?: string; // For backward compatibility
  salesmanId?: { _id: string; name: string };
  routeId?: { _id: string; name?: string };
  items: EOrderItem[];
  estimatedAmount?: number;
  subtotal: number;
  totalDiscount: number;
  totalGST: number;
  grandTotal: number;
  status: 'pending' | 'approved' | 'converted' | 'cancelled';
  convertedInvoiceId?: string;
  convertedAt?: string;
  approvedBy?: { username: string };
  cancellationReason?: string;
  notes?: string;
  createdBy?: { username: string };
  createdAt: string;
}

export interface EOrderSummary {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  convertedOrders: number;
  cancelledOrders: number;
  totalValue: number;
}

@Injectable({ providedIn: 'root' })
export class EOrderService {
  private base = `${environment.apiUrl}/e-orders`;

  constructor(private http: HttpClient) {}

  getOrders(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') {
        params = params.set(k, filters[k]);
      }
    });
    return this.http.get<any>(this.base, { params });
  }

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.base}/summary`);
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, data);
  }

  approve(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/approve`, {});
  }

  cancel(id: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/cancel`, { reason });
  }

  convertToInvoice(id: string, data: any = {}): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/convert-to-invoice`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }
}
