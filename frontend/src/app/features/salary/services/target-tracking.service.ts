import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TargetDashboardResponse, EmployeeTargetResponse } from '../../../core/models/target-tracking.model';

@Injectable({
  providedIn: 'root'
})
export class TargetTrackingService {
  private apiUrl = `${environment.apiUrl}/targets`;

  constructor(private http: HttpClient) {}

  /**
   * Get target achievement dashboard for all employees
   * @param month - Month name (e.g., 'January')
   * @param year - Year (e.g., 2025)
   * @param page - Page number for pagination (optional)
   * @param limit - Records per page (optional)
   * @returns Observable of TargetDashboardResponse
   */
  getTargetDashboard(
    month: string,
    year: number,
    page: number = 1,
    limit: number = 50
  ): Observable<TargetDashboardResponse> {
    let params = new HttpParams()
      .set('month', month)
      .set('year', year.toString())
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<TargetDashboardResponse>(`${this.apiUrl}/dashboard`, { params });
  }

  /**
   * Get target achievement for a specific employee
   * @param employeeId - Employee ID
   * @param month - Month name
   * @param year - Year
   * @returns Observable of EmployeeTargetResponse
   */
  getEmployeeTargets(
    employeeId: string,
    month: string,
    year: number
  ): Observable<EmployeeTargetResponse> {
    let params = new HttpParams()
      .set('month', month)
      .set('year', year.toString());

    return this.http.get<EmployeeTargetResponse>(`${this.apiUrl}/achievement/${employeeId}`, { params });
  }
}
