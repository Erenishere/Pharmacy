import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CashAdjustmentService {
  private base = `${environment.apiUrl}/cash-adjustments`;
  constructor(private http: HttpClient) {}

  getAll(params: any = {}): Observable<any> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<any>(this.base, { params: p });
  }

  create(body: any): Observable<any> {
    return this.http.post<any>(this.base, body);
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }
}
