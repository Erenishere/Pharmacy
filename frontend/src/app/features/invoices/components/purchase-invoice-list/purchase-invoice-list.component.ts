import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceStatistics, InvoiceQueryParams } from '../../models/invoice.model';
import { InvoiceFormComponent, InvoiceFormData } from '../invoice-form/invoice-form.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


@Component({
  selector: 'app-purchase-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DataTableComponent
  ],
  templateUrl: './purchase-invoice-list.component.html',
  styleUrl: './purchase-invoice-list.component.scss'
})
export class PurchaseInvoiceListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  tableColumns: DataTableColumn[] = [
    { key: 'invoiceNumber', label: 'Invoice No', sortable: true },
    { key: 'invoiceDate', label: 'Date', type: 'date', sortable: true },
    { key: 'type', label: 'Purchase Type Tag' },
    { key: 'accountTitle', label: 'Account Title' },
    { key: 'supplierBillNo', label: 'Supplier Bill No' },
    { key: 'previousBalance', label: 'Previous Balance', type: 'currency' },
    { key: 'invoiceTotal', label: 'Invoice Total', type: 'currency', sortable: true },
    { key: 'invoiceType', label: 'Invoice Type' },
    { key: 'gstAmount', label: 'GST Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status', colorMap: {'draft': 'accent', 'confirmed': 'primary', 'paid': 'primary', 'cancelled': 'warn'} },
    { key: 'paymentStatus', label: 'Payment', type: 'status', colorMap: {'pending': 'warn', 'partial': 'accent', 'paid': 'primary'} },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'View', actionKey: 'view' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit', showIf: (row) => row.status === 'draft' },
      { icon: 'check_circle', label: 'Confirm', actionKey: 'confirm', color: 'primary', showIf: (row) => row.status === 'draft' },
      { icon: 'payment', label: 'Mark Paid', actionKey: 'markPaid', color: 'accent', showIf: (row) => row.status === 'confirmed' && row.paymentStatus !== 'paid' },
      { icon: 'cancel', label: 'Cancel', actionKey: 'cancel', color: 'warn', showIf: (row) => row.status !== 'cancelled' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn', showIf: (row) => row.status === 'draft' },
      { icon: 'print', label: 'Print', actionKey: 'print' },
      { icon: 'download', label: 'Export', actionKey: 'export' }
    ]}
  ];

  dataSource = new MatTableDataSource<any>([]);

  searchControl = new FormControl('');
  selectedStatus: string = '';
  selectedPaymentStatus: string = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  totalInvoices = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  loading = false;
  error: string | null = null;
  statistics: InvoiceStatistics | null = null;

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
    this.loadStatistics();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadInvoices();
      });
  }

  loadInvoices(): void {
    this.loading = true;
    this.error = null;

    const params: InvoiceQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      keyword: this.searchControl.value || undefined,
    };

    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }
    if (this.selectedPaymentStatus) {
      params.paymentStatus = this.selectedPaymentStatus;
    }
    if (this.dateFrom) {
      params.dateFrom = this.dateFrom.toISOString();
    }
    if (this.dateTo) {
      params.dateTo = this.dateTo.toISOString();
    }

    this.invoiceService.getPurchaseInvoices(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dataSource.data = (response.data || []).map((inv: any) => ({
              ...inv,
              type: this.getPurchaseTypeLabel(inv),
              accountTitle: inv.supplierName + (inv.otherTitle ? ` - ${inv.otherTitle}` : ''),
              supplierBillNo: inv.supplierBillNo || '-',
              previousBalance: inv.previousBalance || 0,
              invoiceTotal: inv.totals?.grandTotal || 0,
              invoiceType: this.getTaxInvoiceTypeLabel(inv),
              gstAmount: this.getTotalGST(inv)
            }));
            this.totalInvoices = response.pagination?.totalItems || this.dataSource.data.length;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load purchase invoices';
          this.toastService.error(this.error);
          this.loading = false;
        }
      });
  }

  loadStatistics(): void {
    this.invoiceService.getPurchaseStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.statistics = response.data;
          }
        }
      });
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadInvoices();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadInvoices();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedStatus = '';
    this.selectedPaymentStatus = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.pageIndex = 0;
    this.loadInvoices();
  }

  confirmInvoice(invoice: Invoice): void {
    this.invoiceService.confirmPurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice confirmed. Stock updated.');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to confirm invoice');
        }
      });
  }

  markAsPaid(invoice: Invoice): void {
    this.invoiceService.markPurchaseInvoicePaid(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice marked as paid');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to mark invoice as paid');
        }
      });
  }

  async cancelInvoice(invoice: Invoice): Promise<void> {
    const confirmed = await this.toastService.confirm(
      `Cancel invoice ${invoice.invoiceNumber}? This will reverse any stock changes.`,
      'Cancel Invoice?',
      'Yes, cancel',
      'No'
    );

    if (!confirmed) return;

    this.invoiceService.cancelPurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice cancelled');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to cancel invoice');
        }
      });
  }

  async deleteInvoice(invoice: Invoice): Promise<void> {
    if (invoice.status !== 'draft') {
      this.toastService.error('Only draft invoices can be deleted');
      return;
    }

    const confirmed = await this.toastService.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
      'Delete Invoice?',
      'Yes, delete',
      'No'
    );

    if (!confirmed) return;

    this.invoiceService.deletePurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Invoice deleted');
          this.loadInvoices();
          this.loadStatistics();
        },
        error: () => {
          this.toastService.error('Failed to delete invoice');
        }
      });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': 'accent',
      'confirmed': 'primary',
      'paid': 'primary',
      'cancelled': 'warn'
    };
    return colors[status] || '';
  }

  getPaymentStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'warn',
      'partial': 'accent',
      'paid': 'primary'
    };
    return colors[status] || '';
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'Rs. 0';
    }
    return `Rs. ${new Intl.NumberFormat('en-PK', {
      maximumFractionDigits: 0
    }).format(amount)}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK');
  }

  isReturnInvoice(invoice: Invoice): boolean {
    return invoice.type === 'return_purchase';
  }

  getPurchaseTypeLabel(invoice: Invoice): string {
    return this.isReturnInvoice(invoice) ? 'Purchase Return' : 'New Purchase';
  }

  private getNormalizedTaxInvoiceType(invoice: Invoice): string {
    const rawType = ((invoice as any).taxInvoiceType ?? (invoice as any).invoiceType ?? '')
      .toString()
      .toLowerCase()
      .trim();
    return rawType;
  }

  isSalesTaxInvoice(invoice: Invoice): boolean {
    const taxType = this.getNormalizedTaxInvoiceType(invoice);
    return taxType === 'sales_tax' || taxType === 'sale_tax' || taxType === 'advance_tax';
  }

  getTaxInvoiceTypeLabel(invoice: Invoice): string {
    return this.isSalesTaxInvoice(invoice) ? 'Sales Tax' : 'Normal';
  }

  getTotalGST(invoice: Invoice): number {
    return (invoice.totals?.gst18Total || 0) + (invoice.totals?.gst4Total || 0);
  }

  getGSTBreakdown(invoice: Invoice): string {
    const gst18 = invoice.totals?.gst18Total || 0;
    const gst4 = invoice.totals?.gst4Total || 0;
    if (gst18 > 0 && gst4 > 0) {
      return `18%: ${this.formatCurrency(gst18)}, 4%: ${this.formatCurrency(gst4)}`;
    } else if (gst18 > 0) {
      return `18%: ${this.formatCurrency(gst18)}`;
    } else if (gst4 > 0) {
      return `4%: ${this.formatCurrency(gst4)}`;
    }
    return 'No GST';
  }

  createInvoice(): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '95vw',
      maxWidth: '1600px',
      height: '95vh',
      panelClass: 'invoice-form-dialog-panel',
      data: { mode: 'create', type: 'purchase' } as InvoiceFormData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.loadInvoices();
        this.loadStatistics();
      }
    });
  }

  editInvoice(invoice: Invoice): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '95vw',
      maxWidth: '1600px',
      height: '95vh',
      panelClass: 'invoice-form-dialog-panel',
      data: { mode: 'edit', type: 'purchase', invoice } as InvoiceFormData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.loadInvoices();
        this.loadStatistics();
      }
    });
  }

  viewInvoice(invoice: Invoice): void {
    this.dialog.open(InvoiceFormComponent, {
      width: '95vw',
      maxWidth: '1600px',
      height: '95vh',
      panelClass: 'invoice-form-dialog-panel',
      data: { mode: 'view', type: 'purchase', invoice } as InvoiceFormData
    });
  }

  calculateTotalAmount(invoices: Invoice[]): number {
    return invoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0);
  }

  calculateTotalGST(invoices: Invoice[]): number {
    return invoices.reduce((sum, inv) => sum + this.getTotalGST(inv), 0);
  }

  trackByValue(index: number, item: any): any { return item.value; }
  trackById(index: number, item: any): string { return item._id; }

  getRowClass = (row: any): string => {
    return this.isReturnInvoice(row) ? 'return-row' : '';
  };

  onTableAction(event: TableActionClickEvent): void {
    const inv = event.row as Invoice;
    switch(event.action) {
      case 'view': this.viewInvoice(inv); break;
      case 'edit': this.editInvoice(inv); break;
      case 'confirm': this.confirmInvoice(inv); break;
      case 'markPaid': this.markAsPaid(inv); break;
      case 'cancel': this.cancelInvoice(inv); break;
      case 'delete': this.deleteInvoice(inv); break;
      case 'print': this.toastService.info('Print functionality coming soon'); break;
      case 'export': this.toastService.info('Export functionality coming soon'); break;
    }
  }
}
