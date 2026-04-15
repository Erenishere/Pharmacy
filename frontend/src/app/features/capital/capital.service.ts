import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CapitalService {
  private base = `${environment.apiUrl}/capital`;
  constructor(private http: HttpClient) {}

  getAll(params: any = {}): Observable<any> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return this.http.get<any>(this.base, { params: p });
  }

  create(body: any): Observable<any> { return this.http.post<any>(this.base, body); }
  update(id: string, body: any): Observable<any> { return this.http.put<any>(`${this.base}/${id}`, body); }
  delete(id: string): Observable<any> { return this.http.delete<any>(`${this.base}/${id}`); }
  getStatement(asOfDate: string): Observable<any> {
    return this.http.get<any>(`${this.base}/statement`, { params: { asOfDate } });
  }
}
