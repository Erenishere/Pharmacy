import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TaxConfig {
  _id: string;
  taxName: string;
  taxType: string;
  rate: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaxConfigService {
  private baseUrl = `${environment.apiUrl}/tax`;

  constructor(private http: HttpClient) {}

  getTaxConfigs(): Observable<ApiResponse<TaxConfig[]>> {
    return this.http.get<ApiResponse<TaxConfig[]>>(this.baseUrl);
  }

  getTaxConfigById(id: string): Observable<ApiResponse<TaxConfig>> {
    return this.http.get<ApiResponse<TaxConfig>>(`${this.baseUrl}/${id}`);
  }

  createTaxConfig(data: Partial<TaxConfig>): Observable<ApiResponse<TaxConfig>> {
    return this.http.post<ApiResponse<TaxConfig>>(this.baseUrl, data);
  }

  updateTaxConfig(id: string, data: Partial<TaxConfig>): Observable<ApiResponse<TaxConfig>> {
    return this.http.put<ApiResponse<TaxConfig>>(`${this.baseUrl}/${id}`, data);
  }

  deleteTaxConfig(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }
}
