import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './item-master.service';

export interface Company {
  _id: string;
  code: string;
  name: string;
  groupType: 'A' | 'B' | 'C';
  contactPerson?: string;
  phone?: string;
  address?: string;
  email?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFilters {
  search?: string;
  groupType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyMasterService {
  private apiUrl = `${environment.apiUrl}/companies`;

  constructor(private http: HttpClient) {}

  createCompany(companyData: Partial<Company>): Observable<ApiResponse<Company>> {
    return this.http.post<ApiResponse<Company>>(this.apiUrl, companyData);
  }

  getCompanies(filters?: CompanyFilters): Observable<ApiResponse<Company[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<Company[]>>(this.apiUrl, { params });
  }

  getCompanyById(id: string): Observable<ApiResponse<Company>> {
    return this.http.get<ApiResponse<Company>>(`${this.apiUrl}/${id}`);
  }

  getCompaniesByGroup(groupType: string): Observable<ApiResponse<Company[]>> {
    return this.http.get<ApiResponse<Company[]>>(`${this.apiUrl}/group/${groupType}`);
  }

  updateCompany(id: string, companyData: Partial<Company>): Observable<ApiResponse<Company>> {
    return this.http.put<ApiResponse<Company>>(`${this.apiUrl}/${id}`, companyData);
  }

  deleteCompany(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  toggleCompanyStatus(id: string): Observable<ApiResponse<Company>> {
    return this.http.patch<ApiResponse<Company>>(`${this.apiUrl}/${id}/status`, {});
  }

  searchCompanies(query: string): Observable<ApiResponse<Company[]>> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ApiResponse<Company[]>>(`${this.apiUrl}/search`, { params });
  }
}
