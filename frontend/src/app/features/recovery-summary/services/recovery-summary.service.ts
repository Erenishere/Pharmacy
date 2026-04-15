import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RecoverySummary {
  salesmanId: any;
  salesmanName: string;
  dimensionId?: any;
  dimensionName?: string;
  totalSales: number;
  totalRecovery: number;
  totalOutstanding: number;
  recoveryPercentage: number;
  details: RecoveryDetail[];
}

export interface RecoveryDetail {
  customerId: string;
  customerName: string;
  invoiceAmount: number;
  recoveredAmount: number;
  outstanding: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecoverySummaryService {
  private baseUrl = `${environment.apiUrl}/recovery-summary`;

  constructor(private http: HttpClient) {}

  private buildParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, (value as any).toString());
      }
    });
    return httpParams;
  }

  getRecoverySummary(filters: any): Observable<ApiResponse<RecoverySummary[]>> {
    return this.http.get<ApiResponse<RecoverySummary[]>>(this.baseUrl, {
      params: this.buildParams(filters)
    });
  }
}
