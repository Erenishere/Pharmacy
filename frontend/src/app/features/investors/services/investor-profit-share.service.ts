import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProfitShareDetail {
  investorAccountId: string | any;
  capitalContribution: number;
  sharePercent: number;
  profitAmount: number;
}

export interface InvestorProfitShare {
  _id: string;
  periodFrom: string;
  periodTo: string;
  totalProfit: number;
  distributionDate: string;
  status: 'Draft' | 'Distributed';
  details: ProfitShareDetail[];
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InvestorProfitShareService {
  private baseUrl = `${environment.apiUrl}/investor-profit-share`;

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

  getProfitShares(filters: any = {}): Observable<ApiResponse<InvestorProfitShare[]>> {
    return this.http.get<ApiResponse<InvestorProfitShare[]>>(this.baseUrl, { params: this.buildParams(filters) });
  }

  getProfitShareById(id: string): Observable<ApiResponse<InvestorProfitShare>> {
    return this.http.get<ApiResponse<InvestorProfitShare>>(`${this.baseUrl}/${id}`);
  }

  createProfitShare(data: Partial<InvestorProfitShare>): Observable<ApiResponse<InvestorProfitShare>> {
    return this.http.post<ApiResponse<InvestorProfitShare>>(this.baseUrl, data);
  }

  distributeProfitShare(id: string): Observable<ApiResponse<InvestorProfitShare>> {
    return this.http.patch<ApiResponse<InvestorProfitShare>>(`${this.baseUrl}/${id}/distribute`, {});
  }

  deleteProfitShare(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  calculateShares(totalProfit: number): Observable<ApiResponse<ProfitShareDetail[]>> {
    return this.http.get<ApiResponse<ProfitShareDetail[]>>(`${this.baseUrl}/calculate`, {
      params: new HttpParams().set('totalProfit', totalProfit.toString())
    });
  }
}
