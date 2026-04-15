import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Investor {
  _id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  balance: number;
  isActive: boolean;
  metadata: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    accountType: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InvestorStatement {
  investor: {
    id: string;
    name: string;
    code: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  transactions: Array<{
    date: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
  }>;
  closingBalance: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvestorService {
  private baseUrl = `${environment.apiUrl}/investors`;

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

  getAllInvestors(): Observable<ApiResponse<Investor[]>> {
    return this.http.get<ApiResponse<Investor[]>>(this.baseUrl);
  }

  getInvestorById(id: string): Observable<ApiResponse<Investor>> {
    return this.http.get<ApiResponse<Investor>>(`${this.baseUrl}/${id}`);
  }

  createInvestor(investorData: any): Observable<ApiResponse<Investor>> {
    return this.http.post<ApiResponse<Investor>>(this.baseUrl, investorData);
  }

  updateInvestor(id: string, investorData: any): Observable<ApiResponse<Investor>> {
    return this.http.put<ApiResponse<Investor>>(`${this.baseUrl}/${id}`, investorData);
  }

  deleteInvestor(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  getInvestorStatement(id: string, startDate: string, endDate: string): Observable<ApiResponse<InvestorStatement>> {
    return this.http.get<ApiResponse<InvestorStatement>>(`${this.baseUrl}/${id}/statement`, {
      params: this.buildParams({ startDate, endDate })
    });
  }
}
