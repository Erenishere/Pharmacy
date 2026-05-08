import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, BiltyReceipt, BiltyReceiptFilters, BiltyReceiptStatus } from '../models/bilty.model';

@Injectable({
  providedIn: 'root'
})
export class BiltyService {
  private baseUrl = `${environment.apiUrl}/bilty-receipts`;

  constructor(private http: HttpClient) {}

  getReceipts(filters: BiltyReceiptFilters = {}): Observable<ApiResponse<BiltyReceipt[]>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<BiltyReceipt[]>>(this.baseUrl, { params });
  }

  getReceiptById(id: string): Observable<ApiResponse<BiltyReceipt>> {
    return this.http.get<ApiResponse<BiltyReceipt>>(`${this.baseUrl}/${id}`);
  }

  createReceipt(data: Partial<BiltyReceipt>): Observable<ApiResponse<BiltyReceipt>> {
    return this.http.post<ApiResponse<BiltyReceipt>>(this.baseUrl, data);
  }

  updateReceipt(id: string, data: Partial<BiltyReceipt>): Observable<ApiResponse<BiltyReceipt>> {
    return this.http.put<ApiResponse<BiltyReceipt>>(`${this.baseUrl}/${id}`, data);
  }

  updateReceiptStatus(id: string, status: BiltyReceiptStatus): Observable<ApiResponse<BiltyReceipt>> {
    return this.http.patch<ApiResponse<BiltyReceipt>>(`${this.baseUrl}/${id}/status`, { status });
  }

  deleteReceipt(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
