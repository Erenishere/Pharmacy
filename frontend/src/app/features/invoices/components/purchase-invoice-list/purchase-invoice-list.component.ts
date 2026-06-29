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
              accountTitle: this.getInvoiceAccountTitle(inv),
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

  printInvoice(invoice: Invoice): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.toastService.error('Unable to open print preview');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.generatePurchaseInvoicePrintHtml(invoice));
    printWindow.document.close();
  }

  exportInvoice(invoice: Invoice): void {
    const row = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      purchaseType: this.getPurchaseTypeLabel(invoice),
      accountTitle: (invoice as any).accountTitle || (invoice as any).supplierName || '',
      supplierBillNo: (invoice as any).supplierBillNo || '',
      previousBalance: (invoice as any).previousBalance || 0,
      invoiceTotal: invoice.totals?.grandTotal || 0,
      invoiceType: this.getTaxInvoiceTypeLabel(invoice),
      gstAmount: this.getTotalGST(invoice),
      status: invoice.status,
      paymentStatus: invoice.paymentStatus
    };

    const columns = Object.keys(row);
    const csv = [
      columns.map(column => this.escapeCsv(this.formatColumnLabel(column))).join(','),
      columns.map(column => this.escapeCsv(String((row as any)[column] ?? ''))).join(',')
    ].join('\r\n');

    this.downloadText(csv, `purchase-invoice-${invoice.invoiceNumber || invoice._id}.csv`);
    this.toastService.success('Purchase invoice exported');
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
      case 'print': this.printInvoice(inv); break;
      case 'export': this.exportInvoice(inv); break;
    }
  }

  private downloadText(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private formatColumnLabel(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
  }

  private getInvoiceAccountTitle(invoice: Invoice | any): string {
    const supplier = invoice?.supplierId;
    const supplierName =
      (supplier && typeof supplier === 'object' ? supplier.name : '') ||
      invoice?.supplierName ||
      'Unknown Supplier';
    return invoice?.otherTitle ? `${supplierName} - ${invoice.otherTitle}` : supplierName;
  }

  private generatePurchaseInvoicePrintHtml(invoice: Invoice): string {
    const supplierName = this.getSupplierName(invoice);
    const supplierCode = this.getSupplierCode(invoice);
    const supplierAddress = this.getSupplierAddress(invoice);
    const itemsHtml = invoice.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div>${item.itemName || item.itemCode || '-'}</div>
          <div class="subtle">Code: ${item.itemCode || '-'}</div>
          <div class="subtle">Batch: ${item.batchInfo?.batchNumber || item.batchNumber || '-'}</div>
        </td>
        <td class="center">${item.quantity ?? 0}</td>
        <td class="right">${this.formatCurrency(item.unitPrice ?? 0)}</td>
        <td class="right">${this.formatCurrency(item.gstAmount ?? item.taxAmount ?? 0)}</td>
        <td class="right">${this.formatCurrency(item.lineTotal ?? 0)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Invoice ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #2b2f36;
            margin: 0;
            padding: 24px;
            background: #ffffff;
          }
          .document {
            max-width: 980px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 3px solid #22577a;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .brand h1 {
            margin: 0 0 6px;
            font-size: 28px;
            color: #22577a;
          }
          .brand p, .meta p, .party p {
            margin: 4px 0;
            font-size: 12px;
          }
          .title {
            text-align: right;
          }
          .title h2 {
            margin: 0;
            font-size: 30px;
            letter-spacing: 1px;
          }
          .tag {
            display: inline-block;
            margin-top: 8px;
            padding: 5px 12px;
            border-radius: 999px;
            background: #e8f1f8;
            color: #22577a;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .parties {
            display: flex;
            gap: 20px;
            margin-bottom: 24px;
          }
          .party {
            flex: 1;
            border: 1px solid #dbe4ee;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fbfd;
          }
          .party h3 {
            margin: 0 0 10px;
            color: #22577a;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #22577a;
            color: #ffffff;
            padding: 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            text-align: left;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e5e9ef;
            font-size: 12px;
            vertical-align: top;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .subtle {
            color: #65758b;
            font-size: 10px;
            margin-top: 2px;
          }
          .totals {
            width: 340px;
            margin-left: auto;
            border: 1px solid #dbe4ee;
            border-radius: 10px;
            overflow: hidden;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 14px;
            border-bottom: 1px solid #e5e9ef;
            font-size: 12px;
          }
          .totals-row:last-child {
            border-bottom: none;
          }
          .totals-row.grand {
            background: #22577a;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
          }
          .footer {
            margin-top: 28px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }
          .notes {
            flex: 1;
            font-size: 11px;
            color: #546274;
          }
          .signature {
            width: 220px;
            text-align: center;
            font-size: 11px;
            color: #546274;
          }
          .signature-line {
            margin-top: 48px;
            border-top: 1px solid #2b2f36;
            padding-top: 6px;
          }
          @media print {
            body {
              padding: 0;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="brand">
              <h1>Indus Traders</h1>
              <p>Pharmaceutical Wholesale & Distribution</p>
              <p>info@industraders.com</p>
              <p>+92-XXX-XXXXXXX</p>
            </div>
            <div class="title">
              <h2>PURCHASE INVOICE</h2>
              <p><strong>No:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${this.formatDate(invoice.invoiceDate)}</p>
              <p><strong>Supplier Bill:</strong> ${invoice.supplierBillNo || '-'}</p>
              <span class="tag">${invoice.status}</span>
            </div>
          </div>

          <div class="parties">
            <div class="party">
              <h3>Supplier</h3>
              <p><strong>${supplierName}</strong></p>
              <p>${supplierCode ? `Code: ${supplierCode}` : ''}</p>
              <p>${supplierAddress || 'Address not available'}</p>
            </div>
            <div class="party meta">
              <h3>Invoice Details</h3>
              <p><strong>Type:</strong> ${this.getPurchaseTypeLabel(invoice)}</p>
              <p><strong>Tax Mode:</strong> ${this.getTaxInvoiceTypeLabel(invoice)}</p>
              <p><strong>Payment Status:</strong> ${invoice.paymentStatus}</p>
              <p><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 46%;">Item</th>
                <th style="width: 12%;" class="center">Qty</th>
                <th style="width: 14%;" class="right">Unit Price</th>
                <th style="width: 10%;" class="right">GST</th>
                <th style="width: 12%;" class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${this.formatCurrency(invoice.totals?.subtotal || 0)}</span>
            </div>
            <div class="totals-row">
              <span>Total Discount</span>
              <span>${this.formatCurrency(invoice.totals?.totalDiscount || 0)}</span>
            </div>
            <div class="totals-row">
              <span>GST Total</span>
              <span>${this.formatCurrency(this.getTotalGST(invoice))}</span>
            </div>
            <div class="totals-row">
              <span>Previous Balance</span>
              <span>${this.formatCurrency(invoice.previousBalance || 0)}</span>
            </div>
            <div class="totals-row grand">
              <span>Grand Total</span>
              <span>${this.formatCurrency(invoice.totals?.grandTotal || 0)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="notes">
              <p><strong>Notes</strong></p>
              <p>Goods received subject to supplier bill verification and batch validation.</p>
            </div>
            <div class="signature">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  }

  private getSupplierName(invoice: Invoice): string {
    const supplier = invoice.supplierId as any;
    if (supplier && typeof supplier === 'object' && supplier.name) {
      return supplier.name;
    }

    return invoice.supplierName || (invoice as any).accountTitle || 'Unknown Supplier';
  }

  private getSupplierCode(invoice: Invoice): string {
    const supplier = invoice.supplierId as any;
    if (supplier && typeof supplier === 'object' && supplier.code) {
      return supplier.code;
    }

    return '';
  }

  private getSupplierAddress(invoice: Invoice): string {
    const supplier = invoice.supplierId as any;
    return supplier && typeof supplier === 'object'
      ? (supplier.address || supplier.contactInfo?.address || '')
      : '';
  }
}
