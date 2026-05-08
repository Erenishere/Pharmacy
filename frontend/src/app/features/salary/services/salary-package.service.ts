import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
  SalaryPackage,
  SalaryPackageCreateRequest,
  Employee,
  Item,
  ApiResponse
} from '../../../core/models/salary-package.model';

@Injectable({
  providedIn: 'root'
})
export class SalaryPackageService {
  private readonly baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) { }

  /**
   * Create salary package
   */
  createPackage(packageData: SalaryPackageCreateRequest): Observable<ApiResponse<SalaryPackage>> {
    return this.http.post<ApiResponse<SalaryPackage | { packageId: string; package: SalaryPackage }>>(
      `${this.baseUrl}/salary-packages`,
      packageData
    ).pipe(
      map((response) => {
        const rawData = response.data as SalaryPackage | { packageId: string; package: SalaryPackage };
        const salaryPackage = 'package' in rawData ? rawData.package : rawData;
        return {
          ...response,
          data: salaryPackage
        };
      })
    );
  }

  /**
   * Get all packages with filters
   */
  getPackages(filters?: any): Observable<ApiResponse<SalaryPackage[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<SalaryPackage[]>>(
      `${this.baseUrl}/salary-packages`,
      { params }
    );
  }

  /**
   * Get package by ID
   */
  getPackageById(id: string): Observable<ApiResponse<SalaryPackage>> {
    return this.http.get<ApiResponse<SalaryPackage>>(
      `${this.baseUrl}/salary-packages/${id}`
    );
  }

  /**
   * Update package
   */
  updatePackage(id: string, packageData: Partial<SalaryPackageCreateRequest>): Observable<ApiResponse<SalaryPackage>> {
    return this.http.put<ApiResponse<SalaryPackage>>(
      `${this.baseUrl}/salary-packages/${id}`,
      packageData
    );
  }

  /**
   * Delete package
   */
  deletePackage(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/salary-packages/${id}`
    );
  }

  /**
   * Get employees (from Account API)
   */
  getEmployees(): Observable<ApiResponse<Employee[]>> {
    const params = new HttpParams()
      .set('accountType', 'employee')
      .set('isActive', 'true')
      .set('limit', '100');

    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/accounts`,
      { params }
    ).pipe(
      map((response) => ({
        ...response,
        data: (response.data || []).map((account) => ({
          _id: account._id,
          code: account.code || '',
          name: account.name || account.accountName || '',
          email: account.email || account.contactInfo?.email || '',
          phone: account.phone || account.contactInfo?.phone || account.contactInfo?.mobile || '',
          designation: account.employeeBiodata?.designation || account.employeeBiodata?.designationId?.name || account.designation || '',
          basicPay: Number(account.employeeBiodata?.basicPay || account.basicPay || 0),
          accountType: 'employee',
          isActive: account.isActive !== false
        }))
      }))
    );
  }

  /**
   * Get items for brand incentives
   */
  getItems(): Observable<ApiResponse<Item[]>> {
    const params = new HttpParams()
      .set('isActive', 'true')
      .set('limit', '100');

    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/items`,
      { params }
    ).pipe(
      map((response) => ({
        ...response,
        data: (response.data || []).map((item) => ({
          _id: item._id,
          code: item.code || '',
          name: item.name || item.itemName || '',
          category: item.category?.name || item.categoryName || item.category || ''
        }))
      }))
    );
  }
}
