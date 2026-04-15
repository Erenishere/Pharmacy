import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface StockLevelReport {
  reportType: string;
  filters: any;
  stockLevels: Array<{
    item: { _id: string; code: string; name: string };
    warehouse: { _id: string; name: string };
    quantity: number;
    reorderPoint: number;
    averageCost?: number;
    totalValue?: number;
    status?: string;
  }>;
  summary: {
    totalItems: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
  };
}

export interface StockMovementReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  movements: Array<{
    date: string;
    item: { _id: string; code: string; name: string };
    warehouse: { _id: string; name: string };
    type: string;
    quantity: number;
    reference: string;
    balance: number;
  }>;
  summary: {
    totalMovements: number;
    totalIn: number;
    totalOut: number;
  };
}

export interface BatchExpiryReport {
  reportType: string;
  daysAhead: number;
  batches: Array<{
    item: { _id: string; code: string; name: string };
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    daysUntilExpiry: number;
    status: string;
  }>;
  summary: {
    totalBatches: number;
    totalQuantity: number;
    expiredCount: number;
    expiringCount: number;
  };
}

export interface StockValuationReport {
  reportType: string;
  asOfDate: string;
  method: string;
  items: Array<{
    item: { _id: string; code: string; name: string };
    quantity: number;
    unitCost: number;
    totalValue: number;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  };
}

export interface ABCAnalysisReport {
  reportType: string;
  items: Array<{
    item: { _id: string; code: string; name: string };
    totalValue: number;
    percentage: number;
    cumulativePercentage: number;
    classification: string;
  }>;
  summary: {
    classA: { count: number; value: number; percentage: number };
    classB: { count: number; value: number; percentage: number };
    classC: { count: number; value: number; percentage: number };
  };
}

export interface SlowMovingReport {
  reportType: string;
  days: number;
  items: Array<{
    item: { _id: string; code: string; name: string };
    currentStock: number;
    lastMovementDate: string;
    daysSinceLastMovement: number;
    totalValue: number;
  }>;
  summary: {
    totalItems: number;
    totalValue: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryReportService {
  private baseUrl = `${environment.apiUrl}/reports/inventory`;

  constructor(private http: HttpClient) {}

  private buildParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  getStockLevelReport(filters: any = {}): Observable<ApiResponse<StockLevelReport>> {
    return this.http.get<ApiResponse<StockLevelReport>>(`${this.baseUrl}/stock-level`, {
      params: this.buildParams(filters)
    });
  }

  getStockMovementReport(startDate: string, endDate: string, filters: any = {}): Observable<ApiResponse<StockMovementReport>> {
    const params = { startDate, endDate, ...filters };
    return this.http.get<ApiResponse<StockMovementReport>>(`${this.baseUrl}/stock-movement`, {
      params: this.buildParams(params)
    });
  }

  getBatchExpiryReport(daysAhead: number = 90): Observable<ApiResponse<BatchExpiryReport>> {
    return this.http.get<ApiResponse<BatchExpiryReport>>(`${this.baseUrl}/batch-expiry`, {
      params: this.buildParams({ daysAhead })
    });
  }

  getStockValuationReport(asOfDate?: string, method: string = 'FIFO'): Observable<ApiResponse<StockValuationReport>> {
    const params: any = { method };
    if (asOfDate) params.asOfDate = asOfDate;
    return this.http.get<ApiResponse<StockValuationReport>>(`${this.baseUrl}/stock-valuation`, {
      params: this.buildParams(params)
    });
  }

  getABCAnalysisReport(): Observable<ApiResponse<ABCAnalysisReport>> {
    return this.http.get<ApiResponse<ABCAnalysisReport>>(`${this.baseUrl}/abc-analysis`);
  }

  getSlowMovingReport(days: number = 90): Observable<ApiResponse<SlowMovingReport>> {
    return this.http.get<ApiResponse<SlowMovingReport>>(`${this.baseUrl}/slow-moving`, {
      params: this.buildParams({ days })
    });
  }
}
