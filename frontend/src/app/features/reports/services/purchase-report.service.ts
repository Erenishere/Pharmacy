import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseReportService {
  private apiUrl = `${environment.apiUrl}/purchase-reports`;

  constructor(private http: HttpClient) {}

  getPurchaseSummary(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/summary`, { params: httpParams });
  }

  getPurchaseBySupplier(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/by-supplier`, { params: httpParams });
  }

  getPurchaseByItem(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/by-item`, { params: httpParams });
  }

  getPurchaseAnalysis(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/analysis`, { params: httpParams });
  }

  getGSTInputSummary(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/gst-input-summary`, { params: httpParams });
  }

  getSupplierAging(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/supplier-aging`);
  }

  getPaymentDue(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payment-due`);
  }

  getPurchaseVsSales(params: ReportParams): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/vs-sales`, { params: httpParams });
  }

  exportReport(params: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export`, params, {
      responseType: 'blob'
    });
  }
}
