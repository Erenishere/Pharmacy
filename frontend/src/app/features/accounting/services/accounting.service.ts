import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Accounting Interfaces
export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype: 'current_asset' | 'fixed_asset' | 'current_liability' | 'long_term_liability' | 'capital' | 'retained_earnings' | 'sales' | 'other_revenue' | 'cost_of_goods_sold' | 'operating_expense' | 'other_expense';
  parentId?: string;
  parentAccount?: string;
  level: number;
  isActive: boolean;
  description?: string;
  openingBalance: number;
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  createdDate: string;
  lastUpdated: string;
  createdBy: string;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  transactionDate: string;
  transactionId: string;
  transactionType: 'invoice' | 'payment' | 'journal' | 'adjustment' | 'transfer';
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sourceModule: 'sales' | 'purchases' | 'inventory' | 'payroll' | 'manual';
  sourceId: string;
  createdBy: string;
  createdDate: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceNumber?: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'cancelled';
  createdBy: string;
  postedBy?: string;
  postedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface AccountQueryParams {
  type?: string;
  subtype?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LedgerQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private baseUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  // Chart of Accounts Operations
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

  deleteAccount(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Account Hierarchy Operations
  getAccountHierarchy(): Observable<ApiResponse<Account[]>> {
    return throwError(() => new Error('Account hierarchy is not exposed by the mounted /accounts API.'));
  }

  getChildAccounts(parentId: string): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/${parentId}/sub-accounts`);
  }

  moveAccount(accountId: string, newParentId?: string): Observable<ApiResponse<Account>> {
    return throwError(() => new Error('Moving accounts is not exposed by the mounted /accounts API.'));
  }

  // Ledger Operations
  getLedgerEntries(params: LedgerQueryParams = {}): Observable<ApiResponse<LedgerEntry[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    if (!params.accountId) {
      return throwError(() => new Error('accountId is required for the mounted account ledger endpoint.'));
    }

    const { accountId } = params;
    httpParams = httpParams.delete('accountId');
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/ledger`, { params: httpParams })
      .pipe(map(response => ({
        ...response,
        data: response.data?.entries || response.data || [],
        pagination: response.data?.pagination || response.pagination
      })));
  }

  getAccountLedger(accountId: string, params: { startDate?: string; endDate?: string } = {}): Observable<ApiResponse<LedgerEntry[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/ledger`, { params: httpParams })
      .pipe(map(response => ({
        ...response,
        data: response.data?.entries || response.data || [],
        pagination: response.data?.pagination || response.pagination
      })));
  }

  // Journal Entry Operations
  getJournalEntries(params: { startDate?: string; endDate?: string; status?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<JournalEntry[]>> {
    return throwError(() => new Error('Journal entries are not exposed by the mounted accounting API.'));
  }

  getJournalEntryById(id: string): Observable<ApiResponse<JournalEntry>> {
    return throwError(() => new Error('Journal entries are not exposed by the mounted accounting API.'));
  }

  createJournalEntry(entry: Partial<JournalEntry>): Observable<ApiResponse<JournalEntry>> {
    return throwError(() => new Error('Journal entries are not exposed by the mounted accounting API.'));
  }

  updateJournalEntry(id: string, entry: Partial<JournalEntry>): Observable<ApiResponse<JournalEntry>> {
    return throwError(() => new Error('Journal entries are not exposed by the mounted accounting API.'));
  }

  postJournalEntry(id: string): Observable<ApiResponse<JournalEntry>> {
    return throwError(() => new Error('Journal posting is not exposed by the mounted accounting API.'));
  }

  approveJournalEntry(id: string, approvalData: { approvedBy: string; notes?: string }): Observable<ApiResponse<JournalEntry>> {
    return throwError(() => new Error('Journal approval is not exposed by the mounted accounting API.'));
  }

  // Accounting Reports Integration
  getAccountBalances(params: { asOfDate?: string; accountType?: string } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return throwError(() => new Error('Account balance reports are not exposed by the mounted /accounts API.'));
  }

  getTrialBalance(params: { asOfDate?: string; includeZeroBalances?: boolean } = {}): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return throwError(() => new Error('Trial balance is available through reports, not the mounted /accounts API.'));
  }

  // Export Operations
  exportChartOfAccounts(params: { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
    return throwError(() => new Error('Chart of accounts export is not exposed by the mounted /accounts API.'));
  }

  exportLedger(params: LedgerQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return throwError(() => new Error('Ledger export is not exposed by the mounted /accounts API.'));
  }

  // Utility Methods
  validateJournalEntry(entry: Partial<JournalEntry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.description || entry.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!entry.lines || entry.lines.length === 0) {
      errors.push('At least one journal entry line is required');
    } else {
      const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

      if (totalDebit !== totalCredit) {
        errors.push('Total debits must equal total credits');
      }

      entry.lines.forEach((line, index) => {
        if (!line.accountId) {
          errors.push(`Line ${index + 1}: Account is required`);
        }
        if (line.debit > 0 && line.credit > 0) {
          errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
        }
        if (line.debit === 0 && line.credit === 0) {
          errors.push(`Line ${index + 1}: Must have either debit or credit amount`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateAccount(account: Partial<Account>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!account.name || account.name.trim() === '') {
      errors.push('Account name is required');
    }

    if (!account.type) {
      errors.push('Account type is required');
    }

    if (!account.accountNumber || account.accountNumber.trim() === '') {
      errors.push('Account number is required');
    }

    if ((account.openingBalance || 0) < 0) {
      errors.push('Opening balance cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getAccountTypeColor(type: Account['type']): string {
    switch (type) {
      case 'asset': return '#4CAF50';
      case 'liability': return '#FF9800';
      case 'equity': return '#2196F3';
      case 'revenue': return '#9C27B0';
      case 'expense': return '#F44336';
      default: return '#666';
    }
  }

  getAccountTypeText(type: Account['type']): string {
    switch (type) {
      case 'asset': return 'Asset';
      case 'liability': return 'Liability';
      case 'equity': return 'Equity';
      case 'revenue': return 'Revenue';
      case 'expense': return 'Expense';
      default: return type;
    }
  }

  getSubtypeText(subtype: Account['subtype']): string {
    switch (subtype) {
      case 'current_asset': return 'Current Asset';
      case 'fixed_asset': return 'Fixed Asset';
      case 'current_liability': return 'Current Liability';
      case 'long_term_liability': return 'Long-term Liability';
      case 'capital': return 'Capital';
      case 'retained_earnings': return 'Retained Earnings';
      case 'sales': return 'Sales';
      case 'other_revenue': return 'Other Revenue';
      case 'cost_of_goods_sold': return 'Cost of Goods Sold';
      case 'operating_expense': return 'Operating Expense';
      case 'other_expense': return 'Other Expense';
      default: return subtype;
    }
  }

  calculateAccountBalance(debitTotal: number, creditTotal: number, type: Account['type']): number {
    // Assets and Expenses: Debit increases balance
    // Liabilities, Equity, and Revenue: Credit increases balance
    if (type === 'asset' || type === 'expense') {
      return debitTotal - creditTotal;
    } else {
      return creditTotal - debitTotal;
    }
  }

  generateAccountNumber(parentAccountNumber?: string, nextSequence?: number): string {
    if (!parentAccountNumber) {
      // Root level account
      return (nextSequence || 1000).toString().padStart(4, '0');
    } else {
      // Child account
      return `${parentAccountNumber}-${(nextSequence || 1).toString().padStart(2, '0')}`;
    }
  }

  isAccountActive(account: Account): boolean {
    return account.isActive && (!account.parentId || true); // Could check parent status recursively
  }

  getAccountLevel(accountNumber: string): number {
    return accountNumber.split('-').length;
  }
}
