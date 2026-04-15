import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CashBookService } from '../services/cashbook.service';
import { environment } from '../../../../environments/environment';

interface InvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  daysOld: number;
  dueAmount: number;
  receivedAmount: number;
  difference: number;
}

interface CombinedEntry {
  _id: string;
  entryType: 'receive' | 'payment';
  number: string;
  accountTitle: string;
  cashAccount: string;
  salesman: string;
  userId: string;
  receive: number;
  paid: number;
  difference: number;
  date: string;
  postDatedCheque: boolean;
  bankName: string;
  chequeNumber: string;
  status: string;
  detail: string;
  raw: any;
}

@Component({
  selector: 'app-cashbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
  ],
  templateUrl: './cashbook.component.html',
  styleUrls: ['./cashbook.component.scss']
})
export class CashBookComponent implements OnInit, OnDestroy {
  // ── Form ──────────────────────────────────────────────────────────
  form!: FormGroup;
  saving = false;
  editingId: string | null = null;

  // ── Lookup data ───────────────────────────────────────────────────
  customers: any[] = [];
  suppliers: any[] = [];
  salesmen: any[] = [];

  cashAccountOptions = [
    { value: 'Main Cash', label: 'Main Cash' },
    { value: 'Bank Account', label: 'Bank Account' },
    { value: 'Online Transfer', label: 'Online Transfer' },
  ];

  // ── Invoice allocation rows ───────────────────────────────────────
  invoiceRows: InvoiceRow[] = [];
  loadingInvoices = false;

  get invoiceTotals() {
    return {
      due: this.invoiceRows.reduce((s, r) => s + (r.dueAmount || 0), 0),
      received: this.invoiceRows.reduce((s, r) => s + (r.receivedAmount || 0), 0),
      difference: this.invoiceRows.reduce((s, r) => s + (r.difference || 0), 0),
    };
  }

  // ── Combined list ─────────────────────────────────────────────────
  listColumns = [
    'sno', 'accountTitle', 'cashAccount', 'salesman', 'userId',
    'receive', 'paid', 'difference', 'date', 'postDateCheq',
    'bankName', 'chequeNumber', 'status', 'detail', 'actions'
  ];
  dataSource = new MatTableDataSource<CombinedEntry>([]);
  loadingList = false;
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;

  // List filters
  listFilterType = '';
  listFilterFrom: Date | null = null;
  listFilterTo: Date | null = null;
  listFilterStatus = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cashBookService: CashBookService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadCustomers();
    this.loadSuppliers();
    this.loadSalesmen();
    this.loadList();

    // Watch transactionType to reset account selection & invoices
    this.form.get('transactionType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.get('accountId')!.setValue('');
        this.invoiceRows = [];
      });
  }

  onFilterFromChange(val: any): void {
    this.listFilterFrom = val ? new Date(val) : null;
  }

  onFilterToChange(val: any): void {
    this.listFilterTo = val ? new Date(val) : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      transactionType: ['receive', Validators.required],
      date: [new Date(), Validators.required],
      accountId: ['', Validators.required],
      cashAccount: ['Main Cash', Validators.required],
      salesmanId: [''],
      detailReference: [''],
      bankName: [''],
      chequeNumber: [''],
    });
  }

  get isReceive(): boolean {
    return this.form.get('transactionType')?.value === 'receive';
  }

  get accountLabel(): string {
    return this.isReceive ? 'Account Title (Customer)' : 'Account Title (Supplier)';
  }

  get accountList(): any[] {
    return this.isReceive ? this.customers : this.suppliers;
  }

  get selectedAccount(): any | null {
    const id = this.form.get('accountId')?.value;
    return this.accountList.find(a => a._id === id) || null;
  }

  // ── Lookups ───────────────────────────────────────────────────────
  loadCustomers(): void {
    this.http.get<any>(`${environment.apiUrl}/customers?limit=500&isActive=true`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.customers = res.data || []; });
  }

  loadSuppliers(): void {
    this.http.get<any>(`${environment.apiUrl}/suppliers?limit=500&isActive=true`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.suppliers = res.data || []; });
  }

  loadSalesmen(): void {
    this.http.get<any>(`${environment.apiUrl}/users?role=salesman&limit=200`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.salesmen = res.data || res.users || []; });
  }

  // ── Invoice allocation ────────────────────────────────────────────
  onAccountChange(): void {
    const accountId = this.form.get('accountId')?.value;
    if (!accountId || !this.isReceive) {
      this.invoiceRows = [];
      return;
    }
    this.loadingInvoices = true;
    this.cashBookService.getCustomerPendingInvoices(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loadingInvoices = false;
          const invoices: any[] = res.data || [];
          const today = Date.now();
          this.invoiceRows = invoices.map(inv => {
            const dueDate = new Date(inv.invoiceDate || inv.createdAt);
            const daysOld = Math.floor((today - dueDate.getTime()) / 86400000);
            return {
              invoiceId: inv._id,
              invoiceNumber: inv.invoiceNumber || inv.invoiceNo || '',
              invoiceDate: inv.invoiceDate || inv.createdAt,
              invoiceAmount: inv.grandTotal || inv.netAmount || 0,
              daysOld,
              dueAmount: inv.balanceDue || inv.grandTotal || 0,
              receivedAmount: 0,
              difference: inv.balanceDue || inv.grandTotal || 0,
            };
          });
        },
        error: () => { this.loadingInvoices = false; }
      });
  }

  updateDifference(row: InvoiceRow): void {
    row.receivedAmount = Number(row.receivedAmount) || 0;
    row.difference = row.dueAmount - row.receivedAmount;
  }

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    const fv = this.form.value;
    const allocations = this.invoiceRows
      .filter(r => r.receivedAmount > 0)
      .map(r => ({ invoiceId: r.invoiceId, invoiceNumber: r.invoiceNumber, amount: r.receivedAmount }));

    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
    const amount = totalAllocated || 0;

    if (amount <= 0) {
      this.snackBar.open('Enter at least one received amount', 'Close', { duration: 3000 });
      return;
    }

    const isPostDated = !!(fv.bankName || fv.chequeNumber);
    const payload: any = {
      date: fv.date,
      amount,
      cashAccount: fv.cashAccount,
      salesmanId: fv.salesmanId || undefined,
      notes: fv.detailReference || '',
      allocations,
      postDatedCheque: isPostDated,
      bankDetails: isPostDated ? {
        bankName: fv.bankName,
        chequeNumber: fv.chequeNumber,
      } : undefined,
    };

    this.saving = true;

    if (this.isReceive) {
      payload.customerId = fv.accountId;
      payload.receiptDate = fv.date;
      payload.paymentMethod = isPostDated ? 'cheque' : 'cash';
      const req$ = this.editingId
        ? this.cashBookService.updateReceipt(this.editingId, payload)
        : this.cashBookService.createReceipt(payload);
      req$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.saving = false; this.afterSave(); },
        error: (e: any) => { this.saving = false; this.snackBar.open(e?.error?.message || 'Failed to save receipt', 'Close', { duration: 3000 }); }
      });
    } else {
      payload.supplierId = fv.accountId;
      payload.paymentDate = fv.date;
      payload.paymentMethod = isPostDated ? 'cheque' : 'cash';
      const req$ = this.editingId
        ? this.cashBookService.updatePayment(this.editingId, payload)
        : this.cashBookService.createPayment(payload);
      req$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.saving = false; this.afterSave(); },
        error: (e: any) => { this.saving = false; this.snackBar.open(e?.error?.message || 'Failed to save payment', 'Close', { duration: 3000 }); }
      });
    }
  }

  private afterSave(): void {
    this.snackBar.open('Saved successfully', 'Close', { duration: 3000, panelClass: 'snack-success' });
    this.resetForm();
    this.loadList();
  }

  resetForm(): void {
    this.editingId = null;
    this.invoiceRows = [];
    this.form.reset({ transactionType: 'receive', date: new Date(), cashAccount: 'Main Cash' });
  }

  // ── List ──────────────────────────────────────────────────────────
  loadList(): void {
    this.loadingList = true;
    const params: any = { page: this.pageIndex + 1, limit: this.pageSize };
    if (this.listFilterFrom) params.startDate = this.listFilterFrom.toISOString();
    if (this.listFilterTo) params.endDate = this.listFilterTo.toISOString();
    if (this.listFilterStatus) params.status = this.listFilterStatus;

    let receipts: any[] = [];
    let payments: any[] = [];
    let done = 0;

    const merge = () => {
      done++;
      if (done < 2) return;
      this.loadingList = false;
      const entries: CombinedEntry[] = [
        ...receipts.map(r => this.toEntry(r, 'receive')),
        ...payments.map(p => this.toEntry(p, 'payment')),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (this.listFilterType) {
        this.dataSource.data = entries.filter(e => e.entryType === this.listFilterType);
      } else {
        this.dataSource.data = entries;
      }
    };

    this.cashBookService.getReceipts(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { receipts = res.data || []; merge(); },
      error: () => merge()
    });

    this.cashBookService.getPayments(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { payments = res.data || []; merge(); },
      error: () => merge()
    });
  }

  private toEntry(item: any, type: 'receive' | 'payment'): CombinedEntry {
    const isR = type === 'receive';
    const salesman = item.salesmanId?.name || item.salesman || '';
    const userId = item.createdBy?.username || item.createdBy?.name || item.createdBy || '';
    const bank = item.bankDetails?.bankName || '';
    const cheq = item.bankDetails?.chequeNumber || '';
    return {
      _id: item._id,
      entryType: type,
      number: isR ? (item.receiptNumber || '') : (item.paymentNumber || ''),
      accountTitle: isR
        ? (item.customerId?.name || item.customerName || '')
        : (item.supplierId?.name || item.supplierName || ''),
      cashAccount: item.cashAccount || item.paymentMethod || '',
      salesman,
      userId,
      receive: isR ? (item.amount || 0) : 0,
      paid: !isR ? (item.amount || 0) : 0,
      difference: 0,
      date: isR ? item.receiptDate : item.paymentDate,
      postDatedCheque: !!item.postDatedCheque,
      bankName: bank,
      chequeNumber: cheq,
      status: item.status || '',
      detail: item.notes || '',
      raw: item,
    };
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadList();
  }

  applyListFilters(): void {
    this.pageIndex = 0;
    this.loadList();
  }

  // ── Row actions ───────────────────────────────────────────────────
  editEntry(entry: CombinedEntry): void {
    const raw = entry.raw;
    this.editingId = entry._id;
    this.form.patchValue({
      transactionType: entry.entryType,
      date: new Date(entry.date),
      accountId: entry.entryType === 'receive' ? raw.customerId?._id || raw.customerId : raw.supplierId?._id || raw.supplierId,
      cashAccount: raw.cashAccount || 'Main Cash',
      salesmanId: raw.salesmanId?._id || raw.salesmanId || '',
      detailReference: raw.notes || '',
      bankName: raw.bankDetails?.bankName || '',
      chequeNumber: raw.bankDetails?.chequeNumber || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteEntry(entry: CombinedEntry): void {
    if (!confirm(`Delete this ${entry.entryType === 'receive' ? 'receipt' : 'payment'} entry?`)) return;

    const req$: Observable<any> = entry.entryType === 'receive'
      ? this.cashBookService.cancelReceipt(entry._id, 'deleted')
      : this.cashBookService.cancelPayment(entry._id, 'deleted');

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Entry cancelled', 'Close', { duration: 2000 });
        this.loadList();
      },
      error: (e: any) => this.snackBar.open(e?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  formatAmt(v: number): string {
    if (!v) return '—';
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0 }).format(v);
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  statusClass(s: string): string {
    return { pending: 'chip-pending', cleared: 'chip-cleared', cancelled: 'chip-cancelled' }[s] || '';
  }

  trackById(index: number, item: any): string { return item._id; }
  trackByValue(index: number, item: any): any { return item.value; }
  trackByInvoiceId(index: number, row: any): string { return row.invoiceId; }
}
