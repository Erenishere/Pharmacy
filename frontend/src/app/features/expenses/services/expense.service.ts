import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Expense, ExpenseCategory, ApiResponse } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private baseUrl = `${environment.apiUrl}/expenses`;
  private categoryUrl = `${environment.apiUrl}/expense-categories`;

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

  getExpenses(filters: any = {}): Observable<ApiResponse<Expense[]>> {
    return this.http.get<ApiResponse<Expense[]>>(this.baseUrl, { params: this.buildParams(filters) });
  }

  getExpenseById(id: string): Observable<ApiResponse<Expense>> {
    return this.http.get<ApiResponse<Expense>>(`${this.baseUrl}/${id}`);
  }

  createExpense(data: Partial<Expense>): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(this.baseUrl, data);
  }

  updateExpense(id: string, data: Partial<Expense>): Observable<ApiResponse<Expense>> {
    return this.http.put<ApiResponse<Expense>>(`${this.baseUrl}/${id}`, data);
  }

  deleteExpense(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  // Expense Categories
  getCategories(status?: string): Observable<ApiResponse<ExpenseCategory[]>> {
    const params = status ? { status } : {};
    return this.http.get<ApiResponse<ExpenseCategory[]>>(this.categoryUrl, { params: this.buildParams(params) });
  }

  createCategory(data: Partial<ExpenseCategory>): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.post<ApiResponse<ExpenseCategory>>(this.categoryUrl, data);
  }

  updateCategory(id: string, data: Partial<ExpenseCategory>): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.put<ApiResponse<ExpenseCategory>>(`${this.categoryUrl}/${id}`, data);
  }

  deleteCategory(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.categoryUrl}/${id}`);
  }
}
