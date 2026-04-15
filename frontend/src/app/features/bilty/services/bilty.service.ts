import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Bilty, ApiResponse } from '../models/bilty.model';

@Injectable({
  providedIn: 'root'
})
export class BiltyService {
  private baseUrl = `${environment.apiUrl}/bilty`;

  constructor(private http: HttpClient) {}

  getAllBilties(): Observable<ApiResponse<Bilty[]>> {
    return this.http.get<ApiResponse<Bilty[]>>(this.baseUrl);
  }

  getPendingBilties(): Observable<ApiResponse<Bilty[]>> {
    return this.http.get<ApiResponse<Bilty[]>>(`${this.baseUrl}/pending`);
  }

  getBiltyDetails(invoiceId: string): Observable<ApiResponse<Bilty>> {
    return this.http.get<ApiResponse<Bilty>>(`${this.baseUrl}/${invoiceId}`);
  }

  recordBilty(data: Partial<Bilty>): Observable<ApiResponse<Bilty>> {
    return this.http.post<ApiResponse<Bilty>>(this.baseUrl, data);
  }

  updateBiltyStatus(invoiceId: string, status: string): Observable<ApiResponse<Bilty>> {
    return this.http.patch<ApiResponse<Bilty>>(`${this.baseUrl}/${invoiceId}/status`, { status });
  }

  markAsReceived(invoiceId: string, data: any): Observable<ApiResponse<Bilty>> {
    return this.http.patch<ApiResponse<Bilty>>(`${this.baseUrl}/${invoiceId}/received`, data);
  }
}
