import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GSTSalesReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  sales: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    customer: { _id: string; name: string; ntn: string; gstNumber: string };
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
    gstRate: number;
  }>;
  summary: {
    totalInvoices: number;
    totalTaxableAmount: number;
    totalGSTAmount: number;
    totalAmount: number;
  };
}

export interface GSTPurchaseReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  purchases: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    supplier: { _id: string; name: string; ntn: string; gstNumber: string };
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
    gstRate: number;
  }>;
  summary: {
    totalInvoices: number;
    totalTaxableAmount: number;
    totalGSTAmount: number;
    totalAmount: number;
  };
}

export interface WHTReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  transactions: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    customer: { _id: string; name: string; ntn: string };
    taxableAmount: number;
    whtRate: number;
    whtAmount: number;
    netAmount: number;
  }>;
  summary: {
    totalTransactions: number;
    totalTaxableAmount: number;
    totalWHTAmount: number;
    totalNetAmount: number;
  };
}

export interface TaxComplianceSummary {
  reportType: string;
  period: { startDate: string; endDate: string };
  gstSales: {
    totalInvoices: number;
    totalTaxableAmount: number;
    totalGSTAmount: number;
    totalAmount: number;
  };
  gstPurchases: {
    totalInvoices: number;
    totalTaxableAmount: number;
    totalGSTAmount: number;
    totalAmount: number;
  };
  netGSTPayable: number;
  withholdingTax: {
    totalTransactions: number;
    totalTaxableAmount: number;
    totalWHTAmount: number;
    totalNetAmount: number;
  };
  totalTaxLiability: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaxReportService {
  private baseUrl = `${environment.apiUrl}/reports/tax`;

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

  getGSTSalesReport(startDate: string, endDate: string): Observable<ApiResponse<GSTSalesReport>> {
    return this.http.get<ApiResponse<GSTSalesReport>>(`${this.baseUrl}/gst-sales`, {
      params: this.buildParams({ startDate, endDate })
    });
  }

  getGSTPurchaseReport(startDate: string, endDate: string): Observable<ApiResponse<GSTPurchaseReport>> {
    return this.http.get<ApiResponse<GSTPurchaseReport>>(`${this.baseUrl}/gst-purchases`, {
      params: this.buildParams({ startDate, endDate })
    });
  }

  getWHTReport(startDate: string, endDate: string): Observable<ApiResponse<WHTReport>> {
    return this.http.get<ApiResponse<WHTReport>>(`${this.baseUrl}/withholding-tax`, {
      params: this.buildParams({ startDate, endDate })
    });
  }

  getTaxComplianceSummary(startDate: string, endDate: string): Observable<ApiResponse<TaxComplianceSummary>> {
    return this.http.get<ApiResponse<TaxComplianceSummary>>(`${this.baseUrl}/compliance-summary`, {
      params: this.buildParams({ startDate, endDate })
    });
  }
}
