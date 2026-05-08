import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Account Ledger Interfaces
export interface LedgerEntry {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  transactionDate: string;
  transactionId: string;
  transactionType: 'invoice' | 'payment' | 'journal' | 'adjustment' | 'transfer' | 'reconciliation';
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reconciled: boolean;
  reconciliationId?: string;
  reconciliationDate?: string;
  sourceModule: 'sales' | 'purchases' | 'inventory' | 'payroll' | 'accounting' | 'manual';
  sourceId: string;
  createdBy: string;
  createdDate: string;
  lastModified: string;
  notes?: string;
}

export interface Reconciliation {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  reconciliationPeriod: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  closingBalance: number;
  bankStatementBalance?: number;
  adjustmentAmount: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  reconciledBy?: string;
  reconciledDate?: string;
  notes?: string;
  entries: ReconciliationEntry[];
  createdBy: string;
  createdDate: string;
}

export interface ReconciliationEntry {
  id: string;
  ledgerEntryId: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  reconciled: boolean;
  reconciliationNotes?: string;
}

export interface LedgerSummary {
  accountId: string;
  accountNumber: string;
  accountName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  netMovement: number;
  closingBalance: number;
  reconciledBalance: number;
  unreconciledItems: number;
  lastReconciliationDate?: string;
}

export interface LedgerQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  reconciled?: boolean;
  sourceModule?: string;
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
export class AccountLedgerService {
  private baseUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  // Ledger Entry Operations
  getLedgerEntries(params: LedgerQueryParams = {}): Observable<ApiResponse<LedgerEntry[]>> {
    if (!params.accountId) {
      return throwError(() => new Error('accountId is required for the mounted account ledger endpoint'));
    }

    const { accountId, ...queryParams } = params;
    let httpParams = new HttpParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/ledger`, { params: httpParams })
      .pipe(map(response => ({
        ...response,
        data: response.data?.entries || [],
        pagination: response.data?.pagination
      })));
  }

  getAccountLedger(accountId: string, params: { startDate?: string; endDate?: string; page?: number; limit?: number } = {}): Observable<ApiResponse<LedgerEntry[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/ledger`, { params: httpParams })
      .pipe(map(response => ({
        ...response,
        data: response.data?.entries || [],
        pagination: response.data?.pagination
      })));
  }

  createLedgerEntry(entry: Partial<LedgerEntry>): Observable<ApiResponse<LedgerEntry>> {
    if (!entry.accountId) {
      return throwError(() => new Error('accountId is required to create an account ledger adjustment'));
    }

    const debit = entry.debit || 0;
    const credit = entry.credit || 0;
    const amount = debit > 0 ? debit : credit;
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/${entry.accountId}/balance`, {
      amount,
      transactionType: debit > 0 ? 'debit' : 'credit',
      description: entry.description,
      referenceType: entry.transactionType === 'adjustment' ? 'adjustment' : entry.transactionType,
      referenceId: entry.sourceId
    }).pipe(map(response => ({
      ...response,
      data: response.data?.ledgerEntry || response.data
    })));
  }

  updateLedgerEntry(id: string, entry: Partial<LedgerEntry>): Observable<ApiResponse<LedgerEntry>> {
    return throwError(() => new Error('Ledger entries are append-only; create a reversing adjustment instead of editing an entry.'));
  }

  deleteLedgerEntry(id: string): Observable<ApiResponse<null>> {
    return throwError(() => new Error('Ledger entries are append-only and cannot be deleted.'));
  }

  // Reconciliation Operations
  getReconciliations(accountId?: string): Observable<ApiResponse<Reconciliation[]>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  getReconciliationById(id: string): Observable<ApiResponse<Reconciliation>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  createReconciliation(reconciliation: Partial<Reconciliation>): Observable<ApiResponse<Reconciliation>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  updateReconciliation(id: string, reconciliation: Partial<Reconciliation>): Observable<ApiResponse<Reconciliation>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  completeReconciliation(id: string, completionData: {
    reconciledBy: string;
    bankStatementBalance?: number;
    adjustmentAmount?: number;
    notes?: string;
    reconciledEntries: string[]; // Array of ledger entry IDs
  }): Observable<ApiResponse<Reconciliation>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  cancelReconciliation(id: string, cancellationData: { cancelledBy: string; reason: string }): Observable<ApiResponse<Reconciliation>> {
    return throwError(() => new Error('Bank reconciliation is handled by the bank-reconciliation/PDC modules, not the account ledger endpoint.'));
  }

  // Ledger Summary Operations
  getLedgerSummary(accountId: string, params: { startDate: string; endDate: string }): Observable<ApiResponse<LedgerSummary>> {
    const httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/ledger`, { params: httpParams })
      .pipe(map(response => {
        const entries = response.data?.entries || [];
        const summary = this.calculatePeriodSummary(
          entries.map((entry: any) => ({
            ...entry,
            debit: entry.transactionType === 'debit' ? entry.amount : 0,
            credit: entry.transactionType === 'credit' ? entry.amount : 0
          })),
          response.data?.openingBalance || 0
        );

        return {
          ...response,
          data: {
            ...summary,
            accountId,
            accountNumber: response.data?.account?.code || '',
            accountName: response.data?.account?.name || '',
            period: {
              startDate: params.startDate,
              endDate: params.endDate
            },
            closingBalance: response.data?.closingBalance ?? summary.closingBalance
          }
        };
      }));
  }

  // Bulk Operations
  bulkReconcileEntries(accountId: string, entryIds: string[], reconciliationId: string): Observable<ApiResponse<null>> {
    return throwError(() => new Error('Bulk reconciliation is not exposed on the mounted account ledger API.'));
  }

  bulkUnreconcileEntries(accountId: string, entryIds: string[]): Observable<ApiResponse<null>> {
    return throwError(() => new Error('Bulk reconciliation is not exposed on the mounted account ledger API.'));
  }

  // Audit Trail Operations
  getLedgerAuditTrail(accountId: string, params: { startDate?: string; endDate?: string } = {}): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${accountId}/transactions`, { params: httpParams })
      .pipe(map(response => ({
        ...response,
        data: response.data || []
      })));
  }

  // Export Operations
  exportLedger(accountId: string, params: LedgerQueryParams & { format: 'csv' | 'excel' | 'pdf' }): Observable<Blob> {
    return throwError(() => new Error('Ledger export is not exposed on the mounted account ledger API yet.'));
  }

  // Utility Methods
  calculateRunningBalance(entries: LedgerEntry[], openingBalance: number): LedgerEntry[] {
    let runningBalance = openingBalance;

    return entries.map(entry => {
      if (entry.debit > 0) {
        runningBalance += entry.debit;
      } else if (entry.credit > 0) {
        runningBalance -= entry.credit;
      }
      return { ...entry, balance: runningBalance };
    });
  }

  validateReconciliation(reconciliation: Partial<Reconciliation>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!reconciliation.accountId) {
      errors.push('Account is required');
    }

    if (!reconciliation.reconciliationPeriod?.startDate || !reconciliation.reconciliationPeriod?.endDate) {
      errors.push('Reconciliation period is required');
    } else {
      const startDate = new Date(reconciliation.reconciliationPeriod.startDate);
      const endDate = new Date(reconciliation.reconciliationPeriod.endDate);
      if (startDate >= endDate) {
        errors.push('Start date must be before end date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateLedgerEntry(entry: Partial<LedgerEntry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.accountId) {
      errors.push('Account is required');
    }

    if (!entry.transactionDate) {
      errors.push('Transaction date is required');
    }

    if (!entry.transactionType) {
      errors.push('Transaction type is required');
    }

    if (!entry.description || entry.description.trim() === '') {
      errors.push('Description is required');
    }

    // Either debit or credit must be provided, but not both
    if ((entry.debit || 0) > 0 && (entry.credit || 0) > 0) {
      errors.push('Cannot have both debit and credit amounts');
    }

    if ((entry.debit || 0) === 0 && (entry.credit || 0) === 0) {
      errors.push('Must have either debit or credit amount');
    }

    if ((entry.debit || 0) < 0 || (entry.credit || 0) < 0) {
      errors.push('Amounts cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getTransactionTypeColor(type: LedgerEntry['transactionType']): string {
    switch (type) {
      case 'invoice': return '#2196F3';
      case 'payment': return '#4CAF50';
      case 'journal': return '#FF9800';
      case 'adjustment': return '#9C27B0';
      case 'transfer': return '#795548';
      case 'reconciliation': return '#607D8B';
      default: return '#666';
    }
  }

  getTransactionTypeText(type: LedgerEntry['transactionType']): string {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'payment': return 'Payment';
      case 'journal': return 'Journal Entry';
      case 'adjustment': return 'Adjustment';
      case 'transfer': return 'Transfer';
      case 'reconciliation': return 'Reconciliation';
      default: return type;
    }
  }

  getReconciliationStatusColor(status: Reconciliation['status']): string {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'in_progress': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  }

  getReconciliationStatusText(status: Reconciliation['status']): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  calculateReconciliationDifference(reconciliation: Reconciliation): number {
    const calculatedBalance = reconciliation.openingBalance + reconciliation.adjustmentAmount;
    return (reconciliation.bankStatementBalance || 0) - calculatedBalance;
  }

  isEntryReconciled(entry: LedgerEntry): boolean {
    return entry.reconciled === true;
  }

  getUnreconciledEntries(entries: LedgerEntry[]): LedgerEntry[] {
    return entries.filter(entry => !entry.reconciled);
  }

  calculatePeriodSummary(entries: LedgerEntry[], openingBalance: number): LedgerSummary {
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);
    const netMovement = totalDebits - totalCredits;
    const closingBalance = openingBalance + netMovement;
    const reconciledBalance = entries
      .filter(entry => entry.reconciled)
      .reduce((sum, entry) => sum + entry.debit - entry.credit, openingBalance);

    return {
      accountId: '',
      accountNumber: '',
      accountName: '',
      period: { startDate: '', endDate: '' },
      openingBalance,
      totalDebits,
      totalCredits,
      netMovement,
      closingBalance,
      reconciledBalance,
      unreconciledItems: this.getUnreconciledEntries(entries).length
    };
  }

  formatLedgerEntryDescription(entry: LedgerEntry): string {
    const typeText = this.getTransactionTypeText(entry.transactionType);
    return `${typeText} - ${entry.description} (${entry.referenceNumber})`;
  }
}
