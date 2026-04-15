import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SchemeService {
  private base = `${environment.apiUrl}/schemes`;
  private caBase = `${environment.apiUrl}/claim-accounts`;
  constructor(private http: HttpClient) {}

  // ── Schemes ──────────────────────────────────
  getSchemes(params: any = {}): Observable<any> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<any>(this.base, { params: p });
  }
  createScheme(body: any): Observable<any> { return this.http.post<any>(this.base, body); }
  updateScheme(id: string, body: any): Observable<any> { return this.http.put<any>(`${this.base}/${id}`, body); }
  deleteScheme(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/${id}`); }

  // ── Claim Accounts ────────────────────────────
  getClaimAccounts(params: any = {}): Observable<any> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<any>(this.caBase, { params: p });
  }
  createClaimAccount(body: any): Observable<any> { return this.http.post<any>(this.caBase, body); }
  updateClaimAccount(id: string, body: any): Observable<any> { return this.http.put<any>(`${this.caBase}/${id}`, body); }
  deleteClaimAccount(id: string): Observable<any> { return this.http.delete<any>(`${this.caBase}/${id}`); }
  toggleClaimAccountStatus(id: string): Observable<any> { return this.http.patch<any>(`${this.caBase}/${id}/toggle-status`, {}); }
}
