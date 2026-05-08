import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CashBookService } from '../services/cashbook.service';
import { CashBookEntry, CashBookLookupOption, CashBookLookups } from '../models/cashbook.model';

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
  form!: FormGroup;
  saving = false;
  editingId: string | null = null;

  customers: CashBookLookupOption[] = [];
  suppliers: CashBookLookupOption[] = [];
  salesmen: CashBookLookupOption[] = [];
  cashAccountOptions: CashBookLookupOption[] = [];
  private loadedLookupModes = new Set<'receive' | 'payment'>();

  invoiceRows: InvoiceRow[] = [];
  loadingInvoices = false;

  get invoiceTotals() {
    return {
      due: this.invoiceRows.reduce((sum, row) => sum + (row.dueAmount || 0), 0),
      received: this.invoiceRows.reduce((sum, row) => sum + (row.receivedAmount || 0), 0),
      difference: this.invoiceRows.reduce((sum, row) => sum + (row.difference || 0), 0),
    };
  }

  listColumns = [
    'sno', 'accountTitle', 'cashAccount', 'salesman', 'userId',
    'receive', 'paid', 'difference', 'date', 'postDateCheq',
    'bankName', 'chequeNumber', 'status', 'detail', 'actions'
  ];
  dataSource = new MatTableDataSource<CashBookEntry>([]);
  loadingList = false;
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;

  listFilterType = '';
  listFilterFrom: Date | null = null;
  listFilterTo: Date | null = null;
  listFilterStatus = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cashBookService: CashBookService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.ensureLookupsLoaded('receive');
    this.loadList();

    this.form.get('transactionType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactionType: 'receive' | 'payment') => {
        this.form.get('accountId')!.setValue('');
        this.invoiceRows = [];
        this.ensureLookupsLoaded(transactionType);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterFromChange(value: Date | string | null): void {
    this.listFilterFrom = value ? new Date(value) : null;
  }

  onFilterToChange(value: Date | string | null): void {
    this.listFilterTo = value ? new Date(value) : null;
  }

  private initForm(): void {
    this.form = this.fb.group({
      transactionType: ['receive', Validators.required],
      date: [new Date(), Validators.required],
      accountId: ['', Validators.required],
      cashAccountId: ['', Validators.required],
      salesmanId: [''],
      detailReference: [''],
      bankName: [''],
      chequeNumber: [''],
      chequeDate: [null],
    });
  }

  get isReceive(): boolean {
    return this.form.get('transactionType')?.value === 'receive';
  }

  get currentTransactionType(): 'receive' | 'payment' {
    return this.isReceive ? 'receive' : 'payment';
  }

  get accountLabel(): string {
    return this.isReceive ? 'Account Title (Customer)' : 'Account Title (Supplier)';
  }

  get accountList(): CashBookLookupOption[] {
    return this.isReceive ? this.customers : this.suppliers;
  }

  get selectedAccount(): CashBookLookupOption | null {
    const id = this.form.get('accountId')?.value;
    return this.accountList.find((account) => account._id === id) || null;
  }

  private applyLookups(lookups: CashBookLookups): void {
    if (lookups.transactionType === 'payment') {
      this.suppliers = lookups.accountOptions;
    } else {
      this.customers = lookups.accountOptions;
    }

    this.salesmen = lookups.salesmen;
    this.cashAccountOptions = lookups.cashAccountOptions;

    if (!this.form.get('cashAccountId')?.value && this.cashAccountOptions.length) {
      this.form.get('cashAccountId')?.setValue(this.cashAccountOptions[0]._id);
    }
  }

  private ensureLookupsLoaded(
    transactionType: 'receive' | 'payment',
    forceRefresh = false,
    afterLoad?: () => void
  ): void {
    if (!forceRefresh && this.loadedLookupModes.has(transactionType)) {
      afterLoad?.();
      return;
    }

    this.cashBookService.getLookups(transactionType, forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applyLookups(response.data);
          this.loadedLookupModes.add(response.data.transactionType);
          afterLoad?.();
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.message || 'Failed to load cash book lookups',
            'Close',
            { duration: 3000 }
          );
        }
      });
  }

  private refreshLookups(transactionType: 'receive' | 'payment' = this.currentTransactionType): void {
    this.cashBookService.clearLookupCache();
    this.loadedLookupModes.clear();
    this.customers = [];
    this.suppliers = [];
    this.salesmen = [];
    this.cashAccountOptions = [];
    this.ensureLookupsLoaded(transactionType, true);
  }

  onAccountChange(): void {
    const accountId = this.form.get('accountId')?.value;
    if (!accountId) {
      this.invoiceRows = [];
      return;
    }

    this.loadingInvoices = true;

    const request$ = this.isReceive
      ? this.cashBookService.getCustomerPendingInvoices(accountId)
      : this.cashBookService.getSupplierPendingInvoices(accountId);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingInvoices = false;
          const invoices: any[] = response.data || [];
          const today = Date.now();

          this.invoiceRows = invoices.map((invoice) => {
            const dueDate = new Date(invoice.invoiceDate || invoice.createdAt);
            const daysOld = Math.floor((today - dueDate.getTime()) / 86400000);
            const dueAmount = invoice.totals?.dueAmount
              ?? invoice.balanceDue
              ?? invoice.totals?.grandTotal
              ?? invoice.grandTotal
              ?? 0;

            return {
              invoiceId: invoice._id,
              invoiceNumber: invoice.invoiceNumber || invoice.invoiceNo || '',
              invoiceDate: invoice.invoiceDate || invoice.createdAt,
              invoiceAmount: invoice.totals?.grandTotal || invoice.grandTotal || invoice.netAmount || 0,
              daysOld,
              dueAmount,
              receivedAmount: 0,
              difference: dueAmount,
            };
          });
        },
        error: () => {
          this.loadingInvoices = false;
        }
      });
  }

  updateDifference(row: InvoiceRow): void {
    row.receivedAmount = Number(row.receivedAmount) || 0;
    row.difference = row.dueAmount - row.receivedAmount;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    const formValue = this.form.value;
    const allocations = this.invoiceRows
      .filter((row) => row.receivedAmount > 0)
      .map((row) => ({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        amount: row.receivedAmount,
      }));

    const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const amount = totalAllocated || 0;

    if (amount <= 0) {
      this.snackBar.open('Enter at least one received amount', 'Close', { duration: 3000 });
      return;
    }

    const isPostDated = !!(formValue.bankName || formValue.chequeNumber);
    const payload: any = {
      date: formValue.date,
      amount,
      cashAccountId: formValue.cashAccountId,
      salesmanId: formValue.salesmanId || undefined,
      notes: formValue.detailReference || '',
      invoiceAllocations: allocations,
      postDatedCheque: isPostDated,
      bankDetails: isPostDated ? {
        bankName: formValue.bankName,
        chequeNumber: formValue.chequeNumber,
        chequeDate: formValue.chequeDate,
      } : undefined,
    };

    this.saving = true;

    if (this.isReceive) {
      payload.customerId = formValue.accountId;
      payload.receiptDate = formValue.date;
      payload.paymentMethod = isPostDated ? 'cheque' : 'cash';

      const request$ = this.editingId
        ? this.cashBookService.updateReceipt(this.editingId, payload)
        : this.cashBookService.createReceipt(payload);

      request$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.saving = false;
          this.afterSave();
        },
        error: (error: any) => {
          this.saving = false;
          this.snackBar.open(error?.error?.message || 'Failed to save receipt', 'Close', { duration: 3000 });
        }
      });
      return;
    }

    payload.supplierId = formValue.accountId;
    payload.paymentDate = formValue.date;
    payload.paymentMethod = isPostDated ? 'cheque' : 'cash';

    const request$ = this.editingId
      ? this.cashBookService.updatePayment(this.editingId, payload)
      : this.cashBookService.createPayment(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.afterSave();
      },
      error: (error: any) => {
        this.saving = false;
        this.snackBar.open(error?.error?.message || 'Failed to save payment', 'Close', { duration: 3000 });
      }
    });
  }

  private afterSave(): void {
    this.snackBar.open('Saved successfully', 'Close', { duration: 3000, panelClass: 'snack-success' });
    this.refreshLookups('receive');
    this.resetForm();
    this.loadList();
  }

  resetForm(): void {
    this.editingId = null;
    this.invoiceRows = [];
    this.form.reset({
      transactionType: 'receive',
      date: new Date(),
      cashAccountId: this.cashAccountOptions[0]?._id || '',
      chequeDate: null,
    });
  }

  loadList(): void {
    this.loadingList = true;

    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
    };

    if (this.listFilterType) params.type = this.listFilterType;
    if (this.listFilterFrom) params.startDate = this.listFilterFrom.toISOString();
    if (this.listFilterTo) params.endDate = this.listFilterTo.toISOString();
    if (this.listFilterStatus) params.status = this.listFilterStatus;

    this.cashBookService.getEntries(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingList = false;
          const payload = response.data;
          this.dataSource.data = payload?.entries || [];
          this.totalCount = payload?.pagination?.totalItems || 0;
        },
        error: () => {
          this.loadingList = false;
          this.dataSource.data = [];
          this.totalCount = 0;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadList();
  }

  applyListFilters(): void {
    this.pageIndex = 0;
    this.loadList();
  }

  editEntry(entry: CashBookEntry): void {
    const raw = entry.raw;

    this.ensureLookupsLoaded(entry.entryType, false, () => {
      this.editingId = entry._id;
      this.form.patchValue({
        transactionType: entry.entryType,
        date: new Date(entry.date),
        accountId: entry.entryType === 'receive'
          ? raw.customerId?._id || raw.customerId
          : raw.supplierId?._id || raw.supplierId,
        cashAccountId: raw.cashAccountId?._id || raw.cashAccountId || this.cashAccountOptions[0]?._id || '',
        salesmanId: raw.salesmanId?._id || raw.salesmanId || '',
        detailReference: raw.notes || '',
        bankName: raw.bankDetails?.bankName || '',
        chequeNumber: raw.bankDetails?.chequeNumber || '',
        chequeDate: raw.bankDetails?.chequeDate ? new Date(raw.bankDetails.chequeDate) : null,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  deleteEntry(entry: CashBookEntry): void {
    if (!confirm(`Delete this ${entry.entryType === 'receive' ? 'receipt' : 'payment'} entry?`)) {
      return;
    }

    const request$: Observable<any> = entry.entryType === 'receive'
      ? this.cashBookService.cancelReceipt(entry._id, 'deleted')
      : this.cashBookService.cancelPayment(entry._id, 'deleted');

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.refreshLookups(this.currentTransactionType);
        this.snackBar.open('Entry cancelled', 'Close', { duration: 2000 });
        this.loadList();
      },
      error: (error: any) => {
        this.snackBar.open(error?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  formatAmt(value: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0 }).format(value);
  }

  formatDate(value: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  statusClass(status: string): string {
    return {
      pending: 'chip-pending',
      cleared: 'chip-cleared',
      bounced: 'chip-cancelled',
      cancelled: 'chip-cancelled',
    }[status] || '';
  }

  trackById(index: number, item: { _id: string }): string {
    return item._id;
  }

  trackByValue(index: number, item: { value: unknown }): unknown {
    return item.value;
  }

  trackByInvoiceId(index: number, row: InvoiceRow): string {
    return row.invoiceId;
  }
}
