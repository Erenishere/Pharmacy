import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QuotationItem {
  itemId: string;
  itemName?: string;
  companyName?: string;
  boxPacking?: number;
  unitRetail?: number;
  unitTP?: number;
  quantity: number;
  unitPrice: number;
  unitRateOffered?: number;
  discount?: number;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
}

export interface Quotation {
  _id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  validityPeriod?: string;
  customerId: { _id: string; name: string; town?: string };
  salesmanId?: { _id: string; name: string };
  referenceNumber?: string;
  tenderNumber?: string;
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  totalGST: number;
  grandTotal: number;
  termsAndConditions?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'approved' | 'converted' | 'expired' | 'cancelled';
  convertedInvoiceId?: string;
  convertedOrderId?: string;
  createdBy?: { username: string };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private base = `${environment.apiUrl}/quotations`;

  constructor(private http: HttpClient) {}

  getQuotations(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') {
        params = params.set(k, filters[k]);
      }
    });
    return this.http.get<any>(this.base, { params });
  }

  getSummary(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    return this.http.get<any>(`${this.base}/summary`, { params });
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

  markAsSent(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/send`, {});
  }

  approve(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/approve`, {});
  }

  cancel(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/cancel`, {});
  }

  convertToInvoice(id: string, data: { warehouseId: string; autoConfirm?: boolean }): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/convert-to-invoice`, data);
  }

  convertToOrder(id: string, data: any = {}): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/convert-to-order`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }
}
