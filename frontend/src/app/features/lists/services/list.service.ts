import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Letter, ApiResponse } from '../../letters/models/letter.model';

@Injectable({
  providedIn: 'root'
})
export class LetterService {
  private baseUrl = `${environment.apiUrl}/letters`;

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

  getLetters(filters: any = {}): Observable<ApiResponse<Letter[]>> {
    return this.http.get<ApiResponse<Letter[]>>(this.baseUrl, { params: this.buildParams(filters) });
  }

  getLetterById(id: string): Observable<ApiResponse<Letter>> {
    return this.http.get<ApiResponse<Letter>>(`${this.baseUrl}/${id}`);
  }

  createLetter(data: Partial<Letter>): Observable<ApiResponse<Letter>> {
    return this.http.post<ApiResponse<Letter>>(this.baseUrl, data);
  }

  updateLetter(id: string, data: Partial<Letter>): Observable<ApiResponse<Letter>> {
    return this.http.put<ApiResponse<Letter>>(`${this.baseUrl}/${id}`, data);
  }

  deleteLetter(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }
}
