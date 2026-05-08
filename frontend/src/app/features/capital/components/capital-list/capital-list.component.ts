import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CapitalService } from '../../capital.service';

@Component({
  selector: 'app-capital-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './capital-list.component.html',
  styleUrl: './capital-list.component.scss'
})
export class CapitalListComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  editingId: string | null = null;

  cashAccounts: any[] = [];
  investorAccounts: any[] = [];

  displayedColumns = ['sno', 'capitalAssetName', 'cashAccount', 'inAmount', 'outAmount', 'status', 'investorAccount', 'capitalDate', 'transactionType', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

  statement: any = null;
  statementAsOfDate = this.toDateInputValue(new Date());
  statementLoading = false;

  constructor(
    private fb: FormBuilder,
    private service: CapitalService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAccounts();
    this.loadList();
    this.loadStatement();
  }

  initForm(): void {
    this.form = this.fb.group({
      capitalDate: [new Date(), Validators.required],
      capitalAssetName: ['', Validators.required],
      cashAccountId: ['', Validators.required],
      investorAccountId: ['', Validators.required],
      transactionType: ['in', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      detailReference: [''],
      status: ['Investor', Validators.required],
    });
  }

  loadAccounts(): void {
    this.http.get<any>(`${environment.apiUrl}/accounts?limit=500&isActive=true&accountType=asset`).subscribe({
      next: (res) => {
        const accounts = this.extractRows(res);
        const cashLikeAccounts = accounts.filter((account) => this.isCashLikeAccount(account));
        this.cashAccounts = cashLikeAccounts.length > 0 ? cashLikeAccounts : accounts;
      },
      error: () => {
        this.cashAccounts = [];
        this.snackBar.open('Failed to load cash accounts', 'Close', { duration: 3000 });
      }
    });

    this.http.get<any>(`${environment.apiUrl}/accounts?limit=500&isActive=true&accountType=equity`).subscribe({
      next: (res) => {
        this.investorAccounts = this.extractRows(res);
      },
      error: () => {
        this.investorAccounts = [];
        this.snackBar.open('Failed to load investor accounts', 'Close', { duration: 3000 });
      }
    });
  }

  loadList(): void {
    this.loading = true;
    this.service.getAll({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = this.extractRows(res);
        this.totalItems = res.pagination?.total || this.dataSource.data.length || 0;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadStatement(): void {
    if (!this.statementAsOfDate) {
      return;
    }

    this.statementLoading = true;
    this.service.getStatement(this.statementAsOfDate).subscribe({
      next: (res) => {
        this.statementLoading = false;
        this.statement = res.data || null;
      },
      error: () => {
        this.statementLoading = false;
        this.statement = null;
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const rawValue = this.form.getRawValue();
    const payload = this.editingId
      ? {
          capitalAssetName: rawValue.capitalAssetName,
          detailReference: rawValue.detailReference,
        }
      : rawValue;

    const req$ = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => {
        const message = this.editingId ? 'Capital entry updated' : 'Capital entry saved';
        this.saving = false;
        this.snackBar.open(message, 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.editingId = null;
        this.resetForm();
        this.loadList();
        this.loadStatement();
      },
      error: (e) => {
        this.saving = false;
        this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  edit(row: any): void {
    this.editingId = row._id;
    this.form.patchValue({
      capitalDate: row.capitalDate ? new Date(row.capitalDate) : new Date(),
      capitalAssetName: row.capitalAssetName || '',
      cashAccountId: row.cashAccountId?._id || row.cashAccountId || '',
      investorAccountId: row.investorAccountId?._id || row.investorAccountId || '',
      transactionType: row.transactionType || 'in',
      amount: row.amount || 0,
      detailReference: row.detailReference || '',
      status: row.status || 'Investor',
    });
    this.setEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(row: any): void {
    if (!confirm('Delete this capital entry?')) {
      return;
    }

    this.service.delete(row._id).subscribe({
      next: () => {
        if (this.editingId === row._id) {
          this.cancelEdit();
        }
        this.snackBar.open('Deleted', 'Close', { duration: 2000 });
        this.loadList();
        this.loadStatement();
      },
      error: (e) => this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.resetForm();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadList();
  }

  fmtDate(d: string | Date): string {
    return d ? new Date(d).toLocaleDateString('en-PK') : '-';
  }

  fmtNum(n: number): string {
    return typeof n === 'number' ? n.toLocaleString('en-PK') : '-';
  }

  getInAmount(row: any): number {
    return row.transactionType === 'in' ? row.amount : 0;
  }

  getOutAmount(row: any): number {
    return row.transactionType === 'out' ? row.amount : 0;
  }

  private resetForm(): void {
    this.form.enable({ emitEvent: false });
    this.form.reset({
      capitalDate: new Date(),
      capitalAssetName: '',
      cashAccountId: '',
      investorAccountId: '',
      transactionType: 'in',
      amount: 0,
      detailReference: '',
      status: 'Investor',
    });
  }

  private setEditMode(isEditing: boolean): void {
    const financialFields = ['capitalDate', 'cashAccountId', 'investorAccountId', 'transactionType', 'amount', 'status'];
    financialFields.forEach((field) => {
      const control = this.form.get(field);
      if (!control) {
        return;
      }

      if (isEditing) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  private extractRows(response: any): any[] {
    return Array.isArray(response?.data) ? response.data : [];
  }

  private isCashLikeAccount(account: any): boolean {
    const haystack = [account?.name, account?.accountName, account?.code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes('cash') || haystack.includes('bank');
  }

  private toDateInputValue(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
