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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { environment } from '../../../../../environments/environment';
import { SchemeService } from '../../scheme.service';



@Component({
  selector: 'app-scheme-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatProgressSpinnerModule, MatTooltipModule,
    MatPaginatorModule, MatSnackBarModule, MatChipsModule,
    DataTableComponent
  ],
  templateUrl: './scheme-list.component.html',
  styleUrl: './scheme-list.component.scss'
})
export class SchemeListComponent implements OnInit {
  // ── Left panel: Create Claim (Scheme) ─────────────────────
  claimForm!: FormGroup;
  savingClaim = false;
  editingSchemeId: string | null = null;

  // ── Right panel: Create Claim Account ─────────────────────
  caForm!: FormGroup;
  savingCA = false;
  editingCAId: string | null = null;

  // Lookups
  companies: any[] = [];
  claimAccounts: any[] = [];

  // ── Claim Accounts list ───────────────────────────────────
  caColumns = ['sno', 'caDate', 'caName', 'caStatus', 'caActions'];
  caDataSource = new MatTableDataSource<any>([]);
  loadingCA = false;

  // ── Schemes list (bottom) ─────────────────────────────────
  schemeTableColumns: DataTableColumn[] = [
    { key: 'serial', label: 'S#', getValue: (row: any, i?: number) => (this.pageIndex * this.pageSize) + (i !== undefined ? i + 1 : 0) },
    { key: 'createdAt', label: 'Creation Date', getValue: (row: any) => this.fmtDate(row.createdAt) },
    { key: 'company', label: 'Company', getValue: (row: any) => row.company?.name || this.companyName(row.company), sortable: true },
    { key: 'group', label: 'Group' },
    { key: 'discount2Percent', label: 'Discount 2 (%)', type: 'numeric', getValue: (row: any) => (row.discount2Percent || 0) + '%' },
    { key: 'schemeFormat', label: 'Scheme Format' },
    { key: 'to2Percent', label: 'TO.2', type: 'numeric', getValue: (row: any) => (row.to2Percent || 0) + '%' },
    { key: 'claimAccount', label: 'Linked Account', getValue: (row: any) => row.claimAccountId?.name || this.caName(row.claimAccountId) },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit', actionKey: 'edit' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
    ]}
  ];

  schemeDataSource = new MatTableDataSource<any>([]);
  loadingSchemes = false;
  pageSize = 20;
  pageIndex = 0;
  totalSchemes = 0;

  constructor(
    private fb: FormBuilder,
    private service: SchemeService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadCompanies();
    this.loadClaimAccounts();
    this.loadSchemes();
  }

  initForms(): void {
    this.claimForm = this.fb.group({
      name: ['', Validators.required],
      type: ['scheme2', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      claimAccountId: ['', Validators.required],
      company: ['', Validators.required],
      group: [''],
      discount2Percent: [0, [Validators.min(0), Validators.max(100)]],
      schemeFormat: [''],
      to2Percent: [0, [Validators.min(0), Validators.max(100)]],
    });

    this.caForm = this.fb.group({
      caDate: [new Date().toISOString().split('T')[0]],
      name: ['', Validators.required],
    });
  }

  loadCompanies(): void {
    this.http.get<any>(`${environment.apiUrl}/companies?limit=500`).subscribe(res => {
      this.companies = res.data || [];
    });
  }

  loadClaimAccounts(): void {
    this.loadingCA = true;
    this.service.getClaimAccounts({ limit: 200 }).subscribe({
      next: (res: any) => { this.loadingCA = false; this.claimAccounts = res.data || []; this.caDataSource.data = res.data || []; },
      error: () => { this.loadingCA = false; }
    });
  }

  loadSchemes(): void {
    this.loadingSchemes = true;
    this.service.getSchemes({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res: any) => { 
        this.loadingSchemes = false; 
        this.schemeDataSource.data = res.data || []; 
        this.totalSchemes = res.pagination?.totalItems || this.schemeDataSource.data.length;
      },
      error: () => { this.loadingSchemes = false; }
    });
  }

  onSchemeTableAction(event: TableActionClickEvent): void {
    const row = event.row;
    if (event.action === 'edit') this.editScheme(row);
    if (event.action === 'delete') this.deleteScheme(row);
  }

  // ── Save Claim (Scheme) ───────────────────────────────────
  saveClaim(): void {
    if (this.claimForm.invalid) { this.claimForm.markAllAsTouched(); return; }
    const fv = this.claimForm.value;
    const payload = {
      name: fv.name,
      type: fv.type,
      startDate: fv.startDate,
      endDate: fv.endDate,
      company: fv.company,
      group: fv.group || '',
      discount2Percent: fv.discount2Percent,
      schemeFormat: fv.schemeFormat || '',
      to2Percent: fv.to2Percent,
      claimAccountId: fv.claimAccountId,
    };
    this.savingClaim = true;
    const req$ = this.editingSchemeId
      ? this.service.updateScheme(this.editingSchemeId, payload)
      : this.service.createScheme(payload);
    req$.subscribe({
      next: () => {
        this.savingClaim = false;
        this.snackBar.open('Claim saved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.editingSchemeId = null;
        this.claimForm.reset({
          name: '',
          type: 'scheme2',
          startDate: '',
          endDate: '',
        });
        this.loadSchemes();
      },
      error: (e: any) => { this.savingClaim = false; this.snackBar.open(e?.error?.message || 'Failed', 'Close', { duration: 3000 }); }
    });
  }

  editScheme(row: any): void {
    this.editingSchemeId = row._id;
    this.claimForm.patchValue({
      name: row.name || '',
      type: row.type || 'scheme2',
      startDate: row.startDate?.split('T')[0] || '',
      endDate: row.endDate?.split('T')[0] || '',
      claimAccountId: row.claimAccountId?._id || row.claimAccountId || '',
      company: row.company?._id || row.company || '',
      group: row.group || '',
      discount2Percent: row.discount2Percent || 0,
      schemeFormat: row.schemeFormat || '',
      to2Percent: row.to2Percent || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteScheme(row: any): void {
    if (!confirm('Delete this claim?')) return;
    this.service.deleteScheme(row._id).subscribe({
      next: () => { this.snackBar.open('Deleted', 'Close', { duration: 2000 }); this.loadSchemes(); },
      error: (e: any) => this.snackBar.open(e?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  // ── Save Claim Account ────────────────────────────────────
  saveCA(): void {
    if (this.caForm.invalid) { this.caForm.markAllAsTouched(); return; }
    const payload = { name: this.caForm.value.name };
    this.savingCA = true;
    const req$ = this.editingCAId
      ? this.service.updateClaimAccount(this.editingCAId, payload)
      : this.service.createClaimAccount(payload);
    req$.subscribe({
      next: () => {
        this.savingCA = false;
        this.snackBar.open('Claim Account saved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.editingCAId = null;
        this.caForm.reset({ caDate: new Date().toISOString().split('T')[0] });
        this.loadClaimAccounts();
      },
      error: (e: any) => { this.savingCA = false; this.snackBar.open(e?.error?.message || 'Failed', 'Close', { duration: 3000 }); }
    });
  }

  editCA(row: any): void {
    this.editingCAId = row._id;
    this.caForm.patchValue({ caDate: row.createdAt?.split('T')[0] || '', name: row.name });
  }

  toggleCA(row: any): void {
    this.service.toggleClaimAccountStatus(row._id).subscribe({
      next: () => { this.snackBar.open('Status updated', 'Close', { duration: 2000 }); this.loadClaimAccounts(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 2000 })
    });
  }

  onPageChange(e: PageEvent): void { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.loadSchemes(); }

  fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('en-PK') : '—'; }
  companyName(id: any): string { const c = this.companies.find(x => x._id === (id?._id || id)); return c?.name || id || '—'; }
  caName(id: any): string { const c = this.claimAccounts.find(x => x._id === (id?._id || id)); return c?.name || id || '—'; }
}
