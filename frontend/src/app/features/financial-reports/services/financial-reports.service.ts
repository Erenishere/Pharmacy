import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Financial Report Interfaces
export interface ProfitLossItem {
  category: string;
  subCategory?: string;
  amount: number;
  percentage?: number;
}

export interface BalanceSheetItem {
  category: string;
  subCategory?: string;
  amount: number;
  percentage?: number;
}

export interface CashFlowItem {
  category: string;
  amount: number;
  type: 'operating' | 'investing' | 'financing';
}

export interface TaxComplianceItem {
  taxType: string;
  period: string;
  amount: number;
  status: 'compliant' | 'overdue' | 'pending';
  dueDate?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashPosition: number;
  accountsReceivable: number;
  accountsPayable: number;
  profitMargin: number;
  returnOnAssets: number;
}

export interface ProfitLossStatement {
  period: string;
  revenue: {
    sales: ProfitLossItem[];
    otherIncome: ProfitLossItem[];
    totalRevenue: number;
  };
  expenses: {
    costOfGoodsSold: ProfitLossItem[];
    operatingExpenses: ProfitLossItem[];
    otherExpenses: ProfitLossItem[];
    totalExpenses: number;
  };
  profitBeforeTax: number;
  taxExpense: number;
  netProfit: number;
}

export interface BalanceSheet {
  period: string;
  assets: {
    currentAssets: BalanceSheetItem[];
    fixedAssets: BalanceSheetItem[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetItem[];
    longTermLiabilities: BalanceSheetItem[];
    totalLiabilities: number;
  };
  equity: {
    capital: BalanceSheetItem[];
    retainedEarnings: BalanceSheetItem[];
    totalEquity: number;
  };
}

export interface CashFlowStatement {
  period: string;
  operatingActivities: CashFlowItem[];
  investingActivities: CashFlowItem[];
  financingActivities: CashFlowItem[];
  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
}

export interface FinancialReportQueryParams {
  startDate?: string;
  endDate?: string;
  period?: 'monthly' | 'quarterly' | 'yearly';
  companyId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialReportsService {
  private baseUrl = `${environment.apiUrl}/financial-reports`;

  constructor(private http: HttpClient) {}

  // Profit & Loss Statement
  getProfitLossStatement(params: FinancialReportQueryParams = {}): Observable<ApiResponse<ProfitLossStatement>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<ProfitLossStatement>>(`${this.baseUrl}/profit-loss`, { params: httpParams });
  }

  // Balance Sheet
  getBalanceSheet(params: FinancialReportQueryParams = {}): Observable<ApiResponse<BalanceSheet>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<BalanceSheet>>(`${this.baseUrl}/balance-sheet`, { params: httpParams });
  }

  // Cash Flow Statement
  getCashFlowStatement(params: FinancialReportQueryParams = {}): Observable<ApiResponse<CashFlowStatement>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<CashFlowStatement>>(`${this.baseUrl}/cash-flow`, { params: httpParams });
  }

  // Tax Compliance Report
  getTaxComplianceReport(params: FinancialReportQueryParams = {}): Observable<ApiResponse<TaxComplianceItem[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<TaxComplianceItem[]>>(`${this.baseUrl}/tax-compliance`, { params: httpParams });
  }

  // Financial Summary Dashboard
  getFinancialSummary(params: FinancialReportQueryParams = {}): Observable<ApiResponse<FinancialSummary>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<FinancialSummary>>(`${this.baseUrl}/summary`, { params: httpParams });
  }

  // Export reports
  exportProfitLoss(params: FinancialReportQueryParams = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get(`${this.baseUrl}/profit-loss/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  exportBalanceSheet(params: FinancialReportQueryParams = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get(`${this.baseUrl}/balance-sheet/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  exportCashFlow(params: FinancialReportQueryParams = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get(`${this.baseUrl}/cash-flow/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
