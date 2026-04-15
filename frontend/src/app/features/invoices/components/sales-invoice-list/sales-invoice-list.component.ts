import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { RouterModule, Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceStatistics, InvoiceQueryParams } from '../../models/invoice.model';
import { InvoiceFormComponent, InvoiceFormData } from '../invoice-form/invoice-form.component';
import { InvoicePrintPreviewComponent } from '../invoice-print-preview/invoice-print-preview.component';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';
import { AuthService } from '@core/services/auth.service';
import { SalesmanService } from '../../../../core/services/salesman.service';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-sales-invoice-list',
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
    MatDatepickerModule,
    MatNativeDateModule,
    ExportButtonsComponent,
    DataTableComponent
  ],
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss'
})
export class SalesInvoiceListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  tableColumns: TableColumn[] = [
    { key: 'invoiceNumber', label: 'Invoice No', sortable: true },
    { key: 'invoiceDate', label: 'Date', type: 'date', sortable: true },
    { key: 'salesType', label: 'Sales Type Tag' },
    { key: 'customerName', label: 'Account Title' },
    { key: 'otherTitle', label: 'Other Title' },
    { key: 'claimAccountId', label: 'Adjustment Account' },
    { key: 'previousBalance', label: 'Previous Balance', type: 'currency' },
    { key: 'gstTotal', label: 'GST Total', type: 'currency' },
    { key: 'grandTotal', label: 'Invoice Total', type: 'currency', sortable: true },
    { key: 'taxInvoiceType', label: 'Invoice Type' },
    { key: 'creditDays', label: 'Days' },
    { key: 'createdBy', label: 'User ID' },
    { key: 'salesman', label: 'Salesman' },
    { key: 'status', label: 'Status', type: 'status', colorMap: {'draft': 'accent', 'confirmed': 'primary', 'paid': 'primary', 'cancelled': 'warn'} },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'Preview Invoice', actionKey: 'preview' },
      { icon: 'print', label: 'Print A4', actionKey: 'printA4' },
      { icon: 'receipt', label: 'Print Thermal', actionKey: 'printThermal' },
      { icon: 'check_circle', label: 'Confirm', actionKey: 'confirm', showIf: (row) => row.status === 'draft' },
      { icon: 'payment', label: 'Mark Paid', actionKey: 'markPaid', showIf: (row) => row.status === 'confirmed' && row.paymentStatus !== 'paid' },
      { icon: 'cancel', label: 'Cancel Invoice', actionKey: 'cancel', showIf: (row) => row.status !== 'cancelled' },
      { icon: 'assignment_return', label: 'Return Items', actionKey: 'return', showIf: (row) => row.status === 'confirmed' },
      { icon: 'edit', label: 'Edit Invoice', actionKey: 'edit', showIf: (row) => row.status === 'draft' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn', showIf: (row) => row.status === 'draft' }
    ]}
  ];

  dataSource = new MatTableDataSource<any>([]);

  searchControl = new FormControl('');
  selectedStatus: string = '';
  selectedPaymentStatus: string = '';
  selectedSource: string = 'admin'; // 'admin' | 'pos' | '' (all)
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
    private salesmanService: SalesmanService,
    private authService: AuthService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private printPreviewService: PrintPreviewService,
    private router: Router
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
    const user = this.authService.currentUserValue;
    const isSalesman = user?.role === 'sales' || user?.role === 'salesman';

    if (isSalesman) {
      this.salesmanService.getMyProfile().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.executeLoadInvoices(res.data._id);
          } else {
            this.executeLoadInvoices();
          }
        },
        error: () => this.executeLoadInvoices()
      });
    } else {
      this.executeLoadInvoices();
    }
  }

  private executeLoadInvoices(salesmanId?: string): void {
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
    if (salesmanId) {
      params.salesmanId = salesmanId;
    }
    if (this.selectedSource) {
      (params as any).invoiceSource = this.selectedSource;
    }

    this.invoiceService.getSalesInvoices(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dataSource.data = (response.data || []).map((inv: any) => ({
              ...inv,
              salesType: this.getSalesTypeLabel(inv),
              customerName: inv.customerId?.name || inv.customerName || '-',
              previousBalance: inv.previousBalance || 0,
              gstTotal: this.getGst18Total(inv),
              grandTotal: inv.totals?.grandTotal || 0,
              taxInvoiceType: this.getTaxInvoiceTypeLabel(inv),
              createdBy: inv.createdBy?.username || inv.createdBy || '-',
              salesman: inv.salesmanId?.name || '-'
            }));
            this.totalInvoices = response.pagination?.totalItems || this.dataSource.data.length;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load sales invoices';
          this.toastService.error(this.error);
          this.loading = false;
        }
      });
  }

  loadStatistics(): void {
    this.invoiceService.getSalesStatistics()
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
    this.invoiceService.confirmSalesInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice confirmed. Stock deducted.');
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
    this.invoiceService.markSalesInvoicePaid(invoice._id)
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

  printInvoice(invoice: Invoice): void {
    this.printThermalReceipt(invoice);
  }

  previewInvoice(invoice: Invoice): void {
    this.dialog.open(InvoicePrintPreviewComponent, {
      width: '900px',
      height: '95vh',
      maxWidth: '95vw',
      data: { invoice }
    });
  }

  printA4Invoice(invoice: Invoice): void {
    const dialogRef = this.dialog.open(InvoicePrintPreviewComponent, {
      width: '900px',
      height: '95vh',
      maxWidth: '95vw',
      data: { invoice }
    });

    // Auto-trigger print after dialog opens
    setTimeout(() => {
      const previewComponent = dialogRef.componentInstance;
      previewComponent.print();
    }, 500);
  }

  printThermalReceipt(invoice: Invoice): void {
    const receiptHtml = this.generateThermalReceiptHtml(invoice);
    const popupWin = window.open('', '_blank', 'width=300,height=600');
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(receiptHtml);
      popupWin.document.close();
    }
  }

  private generateThermalReceiptHtml(invoice: Invoice): string {
    const itemsHtml = invoice.items.map(item => `
      <div class="item-row">
        <div>${item.itemName || item.itemCode}</div>
        <div class="item-line">
          <span>${item.quantity} x ${this.formatCurrency(item.unitPrice)}</span>
          <span>${this.formatCurrency(item.lineTotal)}</span>
        </div>
      </div>
    `).join('');

    return `
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 80mm;
            margin: 0;
            padding: 10px;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h2 { margin: 0; font-size: 16px; }
          .meta { margin: 10px 0; }
          .meta-row { display: flex; justify-content: space-between; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .item-row { margin-bottom: 8px; }
          .item-line { display: flex; justify-content: space-between; }
          .totals { padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .grand-total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Indus Traders</h2>
          <div>Pharmaceutical Wholesale</div>
        </div>
        <div class="meta">
          <div class="meta-row"><span>Invoice #:</span><span>${invoice.invoiceNumber}</span></div>
          <div class="meta-row"><span>Date:</span><span>${this.formatDate(invoice.invoiceDate)}</span></div>
          <div class="meta-row"><span>Customer:</span><span>${invoice.customerName || '-'}</span></div>
        </div>
        <div class="items">
          ${itemsHtml}
        </div>
        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>${this.formatCurrency(invoice.totals.subtotal)}</span></div>
          <div class="total-row"><span>Discount:</span><span>-${this.formatCurrency(invoice.totals.totalDiscount)}</span></div>
          <div class="total-row"><span>Tax:</span><span>${this.formatCurrency(invoice.totals.totalTax)}</span></div>
          <div class="total-row grand-total"><span>TOTAL:</span><span>${this.formatCurrency(invoice.totals.grandTotal)}</span></div>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>For queries: +92-XXX-XXXXXXX</p>
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `;
  }

  async cancelInvoice(invoice: Invoice): Promise<void> {
    const confirmed = await this.toastService.confirm(
      `Cancel invoice ${invoice.invoiceNumber}? This will reverse any stock changes.`,
      'Cancel Invoice?',
      'Yes, cancel',
      'No'
    );

    if (!confirmed) return;

    this.invoiceService.cancelSalesInvoice(invoice._id)
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

    this.invoiceService.deleteSalesInvoice(invoice._id)
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
      return 'PKR 0';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK');
  }

  isSalesReturn(invoice: Invoice): boolean {
    return invoice.salesType === 'return' || invoice.type === 'return_sales';
  }

  getSalesTypeLabel(invoice: Invoice): string {
    return this.isSalesReturn(invoice) ? 'Return Sales' : 'New Sales';
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

  getGst18Total(invoice: Invoice): number {
    return invoice.totals?.gst18Total || invoice.totals?.gstTotal || 0;
  }

  createInvoice(): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '95vw',
      maxWidth: '1600px',
      height: '95vh',
      panelClass: 'invoice-form-dialog-panel',
      data: { mode: 'create', type: 'sales' } as InvoiceFormData
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
      data: { mode: 'edit', type: 'sales', invoice } as InvoiceFormData
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
      data: { mode: 'view', type: 'sales', invoice } as InvoiceFormData
    });
  }

  returnItems(invoice: Invoice): void {
    // Navigate to sales return page with pre-selected invoice
    this.router.navigate(['/sales-returns'], {
      queryParams: { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber }
    });
  }

  // Export functionality
  get exportData(): any[] {
    return this.dataSource.data.map(invoice => ({
      'Invoice #': invoice.invoiceNumber,
      'Date': this.formatDate(invoice.invoiceDate),
      'Customer': invoice.customerName || '-',
      'Subtotal': this.formatCurrency(invoice.totals.subtotal),
      'Discount': this.formatCurrency(invoice.totals.totalDiscount),
      'Tax': this.formatCurrency(invoice.totals.totalTax),
      'Total': this.formatCurrency(invoice.totals.grandTotal),
      'Status': invoice.status,
      'Payment Status': invoice.paymentStatus
    }));
  }

  get exportColumns(): string[] {
    return ['Invoice #', 'Date', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Status', 'Payment Status'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('invoice-list-content', 'Sales Invoices');
  }

  trackByValue(index: number, item: any): any { return item.value; }
  trackById(index: number, item: any): string { return item._id; }

  onTableAction(event: { action: string, row: any }): void {
    const inv = event.row as Invoice;
    switch(event.action) {
      case 'preview': this.previewInvoice(inv); break;
      case 'printA4': this.printA4Invoice(inv); break;
      case 'printThermal': this.printThermalReceipt(inv); break;
      case 'confirm': this.confirmInvoice(inv); break;
      case 'markPaid': this.markAsPaid(inv); break;
      case 'cancel': this.cancelInvoice(inv); break;
      case 'return': this.returnItems(inv); break;
      case 'edit': this.editInvoice(inv); break;
      case 'delete': this.deleteInvoice(inv); break;
    }
  }
}
