import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RecoveryCustomerDetail {
  customerId: string | null;
  customerName: string;
  customerCode: string;
  dimensionId?: string | null;
  dimensionName?: string;
  invoiceCount: number;
  totalSales: number;
  totalRecovery: number;
  totalOutstanding: number;
  overdueAmount: number;
  recoveryPercentage: number;
  lastInvoiceDate?: string | null;
  lastDueDate?: string | null;
}

export interface RecoverySummaryRow {
  salesmanId: string | null;
  salesmanName: string;
  totalSales: number;
  totalRecovery: number;
  totalOutstanding: number;
  overdueAmount: number;
  recoveryPercentage: number;
  customerCount: number;
  invoiceCount: number;
  details: RecoveryCustomerDetail[];
}

export interface RecoverySummaryStats {
  totalSales: number;
  totalRecovery: number;
  totalOutstanding: number;
  totalOverdue: number;
  recoveryRate: number;
  activeSalesmen: number;
  totalCustomers: number;
  agingAnalysis: Record<string, { count: number; amount: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RecoverySummaryService {
  private readonly baseUrl = `${environment.apiUrl}/recovery-summary`;

  constructor(private http: HttpClient) {}

  private buildParams(params: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  getRecoverySummary(filters: Record<string, unknown>): Observable<ApiResponse<RecoverySummaryRow[]>> {
    return this.http.get<ApiResponse<RecoverySummaryRow[]>>(this.baseUrl, {
      params: this.buildParams(filters)
    });
  }

  getRecoveryStatistics(filters: Record<string, unknown>): Observable<ApiResponse<RecoverySummaryStats>> {
    return this.http.get<ApiResponse<RecoverySummaryStats>>(`${this.baseUrl}/statistics`, {
      params: this.buildParams(filters)
    });
  }
}
