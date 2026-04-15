import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './item-master.service';

export interface ContactInfo {
  address: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  nicNumber?: string;
}

export interface EmployeeBiodata {
  fatherName: string;
  fatherNIC: string;
  dateOfAppointment: Date;
  guarantorName?: string;
  guarantorNIC?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  permanentAddress?: string;
  designationId?: string;
  basicPay?: number;
  salaryPosition?: string;
}

export interface BusinessDetails {
  customerType: 'retailer' | 'wholesaler' | 'distributor' | 'hospital' | 'pharmacy';
  creditDaysLimit: number;
  creditAmountLimit: number;
  openingBalance: number;
  balanceType: 'debit' | 'credit';
  assignedSalesmanId?: string;
}

export interface BankingInfo {
  bankName: string;
  accountNumber: string;
  branch: string;
}

export interface Account {
  _id: string;
  code: string;
  name: string;
  accountType: 'customer' | 'supplier' | 'employee' | 'investor' | 'both';
  parentAccountId?: string;
  dimensionId?: string;
  townId?: string;
  areaId?: string;
  contactInfo: ContactInfo;
  employeeBiodata?: EmployeeBiodata;
  businessDetails?: BusinessDetails;
  bankingInfo?: BankingInfo;
  currentBalance: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountFilters {
  search?: string;
  accountType?: string;
  townId?: string;
  dimensionId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccountMasterService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  createAccount(accountData: Partial<Account>): Observable<ApiResponse<Account>> {
    return this.http.post<ApiResponse<Account>>(this.apiUrl, accountData);
  }

  getAccounts(filters?: AccountFilters): Observable<ApiResponse<Account[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<Account[]>>(this.apiUrl, { params });
  }

  getAccountById(id: string): Observable<ApiResponse<Account>> {
    return this.http.get<ApiResponse<Account>>(`${this.apiUrl}/${id}`);
  }

  getAccountsByType(type: string): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.apiUrl}/type/${type}`);
  }

  updateAccount(id: string, accountData: Partial<Account>): Observable<ApiResponse<Account>> {
    return this.http.put<ApiResponse<Account>>(`${this.apiUrl}/${id}`, accountData);
  }

  deleteAccount(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  updateBalance(id: string, amount: number, type: 'debit' | 'credit'): Observable<ApiResponse<Account>> {
    return this.http.patch<ApiResponse<Account>>(`${this.apiUrl}/${id}/balance`, { amount, type });
  }

  getAccountLedger(id: string, startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}/ledger`, { params });
  }

  getAccountTransactions(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/${id}/transactions`);
  }

  checkCreditLimit(accountId: string, amount: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('accountId', accountId).set('amount', amount.toString());
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/credit-limit-check`, { params });
  }

  searchAccounts(query: string): Observable<ApiResponse<Account[]>> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ApiResponse<Account[]>>(`${this.apiUrl}/search`, { params });
  }

  bulkImport(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bulk-import`, formData);
  }

  exportAccounts(format: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }
}
