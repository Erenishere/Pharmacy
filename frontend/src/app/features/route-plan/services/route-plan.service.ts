import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoutePlan, ApiResponse } from '../models/route-plan.model';

@Injectable({
  providedIn: 'root'
})
export class RoutePlanService {
  private baseUrl = `${environment.apiUrl}/route-plans`;

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

  getRoutePlans(filters: any = {}): Observable<ApiResponse<RoutePlan[]>> {
    return this.http.get<ApiResponse<RoutePlan[]>>(this.baseUrl, { params: this.buildParams(filters) });
  }

  getRoutePlanById(id: string): Observable<ApiResponse<RoutePlan>> {
    return this.http.get<ApiResponse<RoutePlan>>(`${this.baseUrl}/${id}`);
  }

  createRoutePlan(data: Partial<RoutePlan>): Observable<ApiResponse<RoutePlan>> {
    return this.http.post<ApiResponse<RoutePlan>>(this.baseUrl, data);
  }

  updateRoutePlan(id: string, data: Partial<RoutePlan>): Observable<ApiResponse<RoutePlan>> {
    return this.http.put<ApiResponse<RoutePlan>>(`${this.baseUrl}/${id}`, data);
  }

  deleteRoutePlan(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }
}
