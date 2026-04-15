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

  // ── Form ─────────────────────────────────────────
  form!: FormGroup;
  saving = false;
  editingId: string | null = null;

  // Lookups
  accounts: any[] = [];

  // ── List ─────────────────────────────────────────
  displayedColumns = ['sno', 'capitalAssetName', 'cashAccount', 'inAmount', 'outAmount', 'status', 'investorAccount', 'capitalDate', 'transactionType', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

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
  }

  initForm(): void {
    this.form = this.fb.group({
      capitalDate: [new Date().toISOString().split('T')[0], Validators.required],
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
    this.http.get<any>(`${environment.apiUrl}/accounts?limit=500`).subscribe({
      next: (res) => { this.accounts = res.data || []; }
    });
  }

  loadList(): void {
    this.loading = true;
    this.service.getAll({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
        this.totalItems = res.pagination?.total || res.data?.length || 0;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req$ = this.editingId
      ? this.service.update(this.editingId, this.form.value)
      : this.service.create(this.form.value);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Capital entry saved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.editingId = null;
        this.form.reset({ capitalDate: new Date().toISOString().split('T')[0], transactionType: 'in', amount: 0, status: 'Investor' });
        this.loadList();
      },
      error: (e) => { this.saving = false; this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 }); }
    });
  }

  edit(row: any): void {
    this.editingId = row._id;
    this.form.patchValue({
      capitalDate: row.capitalDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      capitalAssetName: row.capitalAssetName || '',
      cashAccountId: row.cashAccountId?._id || row.cashAccountId || '',
      investorAccountId: row.investorAccountId?._id || row.investorAccountId || '',
      transactionType: row.transactionType || 'in',
      amount: row.amount || 0,
      detailReference: row.detailReference || '',
      status: row.status || 'Investor',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(row: any): void {
    if (!confirm('Delete this capital entry?')) return;
    this.service.delete(row._id).subscribe({
      next: () => { this.snackBar.open('Deleted', 'Close', { duration: 2000 }); this.loadList(); },
      error: (e) => this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  cancelEdit(): void { this.editingId = null; this.form.reset({ capitalDate: new Date().toISOString().split('T')[0], transactionType: 'in', amount: 0, status: 'Investor' }); }

  onPage(e: PageEvent): void { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.loadList(); }

  fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('en-PK') : '—'; }
  fmtNum(n: number): string { return n ? n.toLocaleString('en-PK') : '—'; }

  getInAmount(row: any): number { return row.transactionType === 'in' ? row.amount : 0; }
  getOutAmount(row: any): number { return row.transactionType === 'out' ? row.amount : 0; }
}
