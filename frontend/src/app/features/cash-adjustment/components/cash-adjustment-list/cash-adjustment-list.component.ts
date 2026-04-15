import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { CashAdjustmentService } from '../../cash-adjustment.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-cash-adjustment-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule,
    MatDatepickerModule, MatNativeDateModule, MatInputModule
  ],
  templateUrl: './cash-adjustment-list.component.html',
  styleUrl: './cash-adjustment-list.component.scss'
})
export class CashAdjustmentListComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  // Lookups
  customers: any[] = [];
  users: any[] = [];

  adjustmentTypes = [
    { value: 'account_to_account', label: 'Account To Account' },
    { value: 'user_to_user',       label: 'User ID To User ID' },
    { value: 'employee_adjustment', label: 'Employee Account To Account' },
  ];

  // List
  displayedColumns = ['sno', 'date', 'userId', 'cashReceiveFrom', 'cashPaidTo', 'detailReference', 'amount', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  pageSize = 20;
  pageIndex = 0;

  // List filters
  filterType = '';
  filterStatus = '';

  constructor(
    private fb: FormBuilder,
    private service: CashAdjustmentService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCustomers();
    this.loadUsers();
    this.loadList();
    // Reset from/to when type changes
    this.form.get('adjustmentType')!.valueChanges.subscribe(() => {
      this.form.patchValue({ fromAccountId: '', toAccountId: '' });
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      adjustmentDate: [new Date().toISOString().split('T')[0], Validators.required],
      adjustmentType: ['account_to_account', Validators.required],
      fromAccountId: ['', Validators.required],
      toAccountId: ['', Validators.required],
      detailReference: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  get adjType(): string { return this.form.get('adjustmentType')?.value || 'account_to_account'; }

  get fromList(): any[] { return this.adjType === 'user_to_user' ? this.users : this.customers; }
  get toList(): any[]   { return this.adjType === 'user_to_user' ? this.users : this.customers; }

  get fromLabel(): string {
    if (this.adjType === 'user_to_user') return 'User ID (From)';
    if (this.adjType === 'employee_adjustment') return 'Employee Account (From)';
    return 'Cash Receive From';
  }
  get toLabel(): string {
    if (this.adjType === 'user_to_user') return 'User ID (To)';
    return 'Cash Paid To';
  }

  loadCustomers(): void {
    this.http.get<any>(`${environment.apiUrl}/customers?limit=500`).subscribe(res => {
      this.customers = res.data || [];
    });
  }

  loadUsers(): void {
    this.http.get<any>(`${environment.apiUrl}/users?limit=200`).subscribe(res => {
      this.users = res.data || res.users || [];
    });
  }

  loadList(): void {
    this.loading = true;
    const params: any = { page: this.pageIndex + 1, limit: this.pageSize };
    if (this.filterType) params.adjustmentType = this.filterType;
    if (this.filterStatus) params.status = this.filterStatus;
    this.service.getAll(params).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const fv = this.form.value;
    this.saving = true;
    this.service.create(fv).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Cash Adjustment saved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.form.reset({ adjustmentDate: new Date().toISOString().split('T')[0], adjustmentType: 'account_to_account' });
        this.loadList();
      },
      error: (e) => {
        this.saving = false;
        this.snackBar.open(e?.error?.message || 'Failed to save', 'Close', { duration: 3000 });
      }
    });
  }

  applyFilters(): void { this.pageIndex = 0; this.loadList(); }

  onPageChange(e: PageEvent): void { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.loadList(); }

  accountName(id: string, list: any[]): string {
    const a = list.find(x => x._id === id);
    return a ? (a.name || a.username || id) : id;
  }

  typeLabel(val: string): string {
    return this.adjustmentTypes.find(t => t.value === val)?.label || val;
  }

  fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('en-PK') : '—'; }
  fmtAmt(v: number): string  { return v ? new Intl.NumberFormat('en-PK').format(v) : '—'; }
  statusClass(s: string): string { return ({ pending: 'chip-pending', completed: 'chip-cleared', cancelled: 'chip-cancelled' } as any)[s] || ''; }
}
