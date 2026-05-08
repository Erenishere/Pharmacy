import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
  SalaryCalculation,
  SalaryCalculationRequest,
  ApiResponse
} from '../../../core/models/salary-calculation.model';
import { SalaryPackage } from '../../../core/models/salary-package.model';

@Injectable({
  providedIn: 'root'
})
export class SalaryCalculationService {
  private readonly baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) {}

  /**
   * Calculate salary for employee for a specific month/year
   */
  calculateSalary(request: SalaryCalculationRequest): Observable<ApiResponse<SalaryCalculation>> {
    if (request.packageId) {
      return this.postCalculation(request.packageId, request.month, request.year);
    }

    const params = new HttpParams()
      .set('employeeId', request.employeeId)
      .set('status', 'Active')
      .set('limit', '100');

    return this.http.get<ApiResponse<SalaryPackage[]>>(
      `${this.baseUrl}/salary-packages`,
      { params }
    ).pipe(
      switchMap((response) => {
        const selectedPackage = this.findPackageForPeriod(response.data || [], request.month, request.year);
        if (!selectedPackage?._id) {
          return throwError(() => new Error(`No active salary package found for ${request.month} ${request.year}`));
        }
        return this.postCalculation(selectedPackage._id, request.month, request.year);
      })
    );
  }

  private postCalculation(packageId: string, month: string, year: number): Observable<ApiResponse<SalaryCalculation>> {
    return this.http.post<ApiResponse<SalaryCalculation | { calculation: SalaryCalculation }>>(
      `${this.baseUrl}/salary/calculate`,
      { packageId, month, year }
    ).pipe(
      map((response) => {
        const rawData = response.data as SalaryCalculation | { calculation: SalaryCalculation };
        const calculation = 'calculation' in rawData ? rawData.calculation : rawData;
        return {
          ...response,
          data: calculation
        };
      })
    );
  }

  private findPackageForPeriod(packages: SalaryPackage[], month: string, year: number): SalaryPackage | undefined {
    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].indexOf(month);
    const periodDate = new Date(year, Math.max(monthIndex, 0), 1);

    return packages.find((salaryPackage) => {
      const fromDate = new Date(salaryPackage.duration.fromDate);
      const toDate = new Date(salaryPackage.duration.toDate);
      return fromDate <= periodDate && periodDate <= toDate;
    }) || packages[0];
  }

  /**
   * Get salary sheet for employee
   */
  getSalarySheet(employeeId: string, month: string, year: number): Observable<ApiResponse<SalaryCalculation>> {
    let params = new HttpParams()
      .set('month', month)
      .set('year', year.toString());

    return this.http.get<ApiResponse<SalaryCalculation>>(
      `${this.baseUrl}/salary/sheet/${employeeId}`,
      { params }
    );
  }

  /**
   * Get all salary calculations with filters
   */
  getCalculations(filters?: any): Observable<ApiResponse<SalaryCalculation[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<SalaryCalculation[]>>(
      `${this.baseUrl}/salary/calculations`,
      { params }
    );
  }
}
