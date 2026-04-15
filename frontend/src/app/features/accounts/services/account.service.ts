import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Account {
  _id: string;
  name: string;
  accountNumber?: string;
  accountType: 'customer' | 'supplier' | 'employee' | 'investor' | 'both';
  parentAccountId?: string;
  dimensionId?: string;
  townId?: string;
  areaId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Contact Information
  contactInfo?: {
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    city?: string;
    nicNumber?: string;
  };

  // Business Details
  businessDetails?: {
    customerType?: string;
    creditAmountLimit?: number;
    creditDaysLimit?: number;
    balanceType?: 'debit' | 'credit';
    openingBalance?: number;
  };

  // Employee Biodata
  employeeBiodata?: {
    designation?: string;
    department?: string;
    basicPay?: number;
    dateOfBirth?: string;
    dateOfJoining?: string;
    bloodGroup?: string;
  };

  // Banking Information
  bankingInfo?: {
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
  };

  notes?: string;
}

export interface AccountQueryParams {
  page?: number;
  limit?: number;
  searchText?: string;
  accountType?: string;
  isActive?: boolean;
  dimensionId?: string;
  townId?: string;
  areaId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private baseUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  // Account CRUD operations
  getAccounts(params: AccountQueryParams = {}): Observable<ApiResponse<Account[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Account[]>>(this.baseUrl, { params: httpParams });
  }

  getAccountById(id: string): Observable<ApiResponse<Account>> {
    return this.http.get<ApiResponse<Account>>(`${this.baseUrl}/${id}`);
  }

  createAccount(account: Partial<Account>): Observable<ApiResponse<Account>> {
    return this.http.post<ApiResponse<Account>>(this.baseUrl, account);
  }

  updateAccount(id: string, account: Partial<Account>): Observable<ApiResponse<Account>> {
    return this.http.put<ApiResponse<Account>>(`${this.baseUrl}/${id}`, account);
  }

  deleteAccount(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  // Account balance operations
  updateAccountBalance(id: string, balanceUpdate: {
    amount: number;
    transactionType: 'debit' | 'credit';
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Observable<ApiResponse<Account>> {
    return this.http.patch<ApiResponse<Account>>(`${this.baseUrl}/${id}/balance`, balanceUpdate);
  }

  // Account transactions
  getAccountTransactions(id: string, params: { page?: number; limit?: number } = {}): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && (typeof value !== 'string' || value !== '')) {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${id}/transactions`, { params: httpParams });
  }

  // Account search
  searchAccounts(params: { searchText?: string; page?: number; limit?: number; accountType?: string } = {}): Observable<ApiResponse<Account[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  // Account sub-accounts
  getSubAccounts(id: string): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/${id}/sub-accounts`);
  }

  // Credit limit checks
  checkCreditLimit(params: { accountId: string; amount?: number }): Observable<ApiResponse<{ canCredit: boolean; availableLimit: number; message?: string }>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<{ canCredit: boolean; availableLimit: number; message?: string }>>(`${this.baseUrl}/credit-limit-check`, { params: httpParams });
  }

  // Credit limit exceeded accounts
  getAccountsWithCreditLimitExceeded(): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/credit-limit-exceeded`);
  }

  // Credit days exceeded accounts
  getAccountsWithCreditDaysExceeded(): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/credit-days-exceeded`);
  }

  // Accounts by type
  getAccountsByType(type: string): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/type/${type}`);
  }
}
