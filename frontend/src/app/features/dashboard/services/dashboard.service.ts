import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface KPIData {
  period: { startDate: string; endDate: string };
  sales: {
    totalSales: number;
    totalInvoices: number;
    averageInvoiceValue: number;
  };
  purchases: {
    totalPurchases: number;
    totalInvoices: number;
    averageInvoiceValue: number;
  };
  inventory: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
  };
  customers: {
    totalCustomers: number;
  };
  suppliers: {
    totalSuppliers: number;
  };
  cash: {
    totalCash: number;
  };
}

export interface SalesTrendData {
  reportType: string;
  months: number;
  trends: Array<{
    month: string;
    totalSales: number;
    totalInvoices: number;
    averageInvoiceValue: number;
  }>;
}

export interface TopItemsData {
  reportType: string;
  period: { startDate: string; endDate: string };
  items: Array<{
    item: { _id: string; code: string; name: string };
    quantity: number;
    revenue: number;
  }>;
}

export interface TopCustomersData {
  reportType: string;
  period: { startDate: string; endDate: string };
  customers: Array<{
    customer: { _id: string; code: string; name: string };
    totalSales: number;
    invoiceCount: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = `${environment.apiUrl}/dashboard`;

  // Caches in-flight + recently-resolved observables by param key
  private cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  /** Call after any invoice/sales mutation to force fresh data next load */
  invalidateCache(): void {
    this.cache.clear();
  }

  private buildParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  getKPIs(startDate?: string, endDate?: string): Observable<ApiResponse<KPIData>> {
    const key = `kpis:${startDate ?? ''}:${endDate ?? ''}`;
    if (!this.cache.has(key)) {
      const params: Record<string, any> = {};
      if (startDate) params['startDate'] = startDate;
      if (endDate) params['endDate'] = endDate;
      this.cache.set(
        key,
        this.http.get<ApiResponse<KPIData>>(`${this.baseUrl}/kpis`, { params: this.buildParams(params) })
          .pipe(shareReplay(1))
      );
    }
    return this.cache.get(key)!;
  }

  getSalesTrend(months: number = 12): Observable<ApiResponse<SalesTrendData>> {
    const key = `trend:${months}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        this.http.get<ApiResponse<SalesTrendData>>(`${this.baseUrl}/sales-trend`, {
          params: this.buildParams({ months }),
        }).pipe(shareReplay(1))
      );
    }
    return this.cache.get(key)!;
  }

  getTopItems(startDate?: string, endDate?: string, limit: number = 10): Observable<ApiResponse<TopItemsData>> {
    const key = `top-items:${startDate ?? ''}:${endDate ?? ''}:${limit}`;
    if (!this.cache.has(key)) {
      const params: Record<string, any> = { limit };
      if (startDate) params['startDate'] = startDate;
      if (endDate) params['endDate'] = endDate;
      this.cache.set(
        key,
        this.http.get<ApiResponse<TopItemsData>>(`${this.baseUrl}/top-items`, { params: this.buildParams(params) })
          .pipe(shareReplay(1))
      );
    }
    return this.cache.get(key)!;
  }

  getTopCustomers(startDate?: string, endDate?: string, limit: number = 10): Observable<ApiResponse<TopCustomersData>> {
    const key = `top-customers:${startDate ?? ''}:${endDate ?? ''}:${limit}`;
    if (!this.cache.has(key)) {
      const params: Record<string, any> = { limit };
      if (startDate) params['startDate'] = startDate;
      if (endDate) params['endDate'] = endDate;
      this.cache.set(
        key,
        this.http.get<ApiResponse<TopCustomersData>>(`${this.baseUrl}/top-customers`, { params: this.buildParams(params) })
          .pipe(shareReplay(1))
      );
    }
    return this.cache.get(key)!;
  }
}
