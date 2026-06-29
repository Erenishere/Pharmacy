import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface TaxConfig {
  _id: string;
  taxName: string;
  taxType: string;
  rate: number;
  name?: string;
  code?: string;
  type?: string;
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
  private baseUrl = `${environment.apiUrl}/tax/config`;

  constructor(private http: HttpClient) {}

  getTaxConfigs(): Observable<ApiResponse<TaxConfig[]>> {
    return this.http.get<ApiResponse<any[]>>(this.baseUrl).pipe(
      map((res) => ({ ...res, data: (res.data || []).map((item) => this.fromApi(item)) }))
    );
  }

  getTaxConfigById(id: string): Observable<ApiResponse<TaxConfig>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${id}`).pipe(
      map((res) => ({ ...res, data: this.fromApi(res.data) }))
    );
  }

  createTaxConfig(data: Partial<TaxConfig>): Observable<ApiResponse<TaxConfig>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, this.toApi(data)).pipe(
      map((res) => ({ ...res, data: this.fromApi(res.data) }))
    );
  }

  updateTaxConfig(id: string, data: Partial<TaxConfig>): Observable<ApiResponse<TaxConfig>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, this.toApi(data, true)).pipe(
      map((res) => ({ ...res, data: this.fromApi(res.data) }))
    );
  }

  activateTaxConfig(id: string): Observable<ApiResponse<TaxConfig>> {
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/${id}/activate`, {}).pipe(
      map((res) => ({ ...res, data: this.fromApi(res.data) }))
    );
  }

  deactivateTaxConfig(id: string): Observable<ApiResponse<TaxConfig>> {
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/${id}/deactivate`, {}).pipe(
      map((res) => ({ ...res, data: this.fromApi(res.data) }))
    );
  }

  deleteTaxConfig(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  private fromApi(item: any): TaxConfig {
    if (!item) return item;
    return {
      ...item,
      taxName: item.taxName || item.name || '',
      taxType: item.taxType || item.type || '',
      rate: item.rate > 1 ? item.rate : Number(((item.rate || 0) * 100).toFixed(4))
    };
  }

  private toApi(data: Partial<TaxConfig>, partial = false): any {
    const payload: any = {};

    if (!partial || data.taxName !== undefined || data.name !== undefined) {
      payload.name = (data.taxName || data.name || '').trim();
    }

    if (!partial || data.taxType !== undefined || data.type !== undefined) {
      payload.type = (data.taxType || data.type || 'GST').trim().toUpperCase();
    }

    if (!partial || data.rate !== undefined) {
      payload.rate = Number(data.rate || 0) / 100;
    }

    if (!partial || data.code !== undefined) {
      const taxType = payload.type || (data.taxType || data.type || 'GST').trim().toUpperCase();
      const taxName = payload.name || (data.taxName || data.name || Date.now()).toString();
      payload.code = (data.code || `${taxType}_${taxName}`).replace(/[^a-z0-9]/gi, '_').slice(0, 20).toUpperCase();
    }

    if (!partial || data.description !== undefined) {
      payload.description = data.description || '';
    }

    if (!partial || data.isActive !== undefined) {
      payload.isActive = data.isActive ?? true;
    }

    if (!partial) {
      payload.applicableOn = 'both';
      payload.effectiveFrom = new Date().toISOString();
    }

    return payload;
  }
}
