import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { PurchaseOrderService, PurchaseOrder } from '../../services/purchase-order.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableColumn } from '../../../../shared/models/data-table.model';

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    DataTableComponent
  ],
  templateUrl: './purchase-order-list.component.html',
  styleUrls: ['./purchase-order-list.component.scss']
})
export class PurchaseOrderListComponent implements OnInit, OnDestroy {
  tableColumns: DataTableColumn[] = [
    { key: 'sno', label: 'S#' },
    { key: 'supplierName', label: 'Party Name', sortable: true },
    { key: 'supplierTown', label: 'Town' },
    { key: 'poNumber', label: 'P/O No', sortable: true },
    { key: 'billNo', label: 'Bill No' },
    { key: 'poDate', label: 'Date', type: 'date', sortable: true },
    { key: 'totalAmount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'status', label: 'Status', type: 'status', colorMap: { 'draft': '', 'sent': 'primary', 'confirmed': 'accent', 'received': 'primary', 'cancelled': 'warn' } },
    { key: 'fulfillmentStatus', label: 'Fulfillment', type: 'status', colorMap: { 'pending': 'warn', 'partial': 'accent', 'fulfilled': 'primary' } },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'View', actionKey: 'view' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit', showIf: (row: any) => row.status === 'draft' },
      { icon: 'send', label: 'Send to Supplier', actionKey: 'send', showIf: (row: any) => row.status === 'draft' },
      { icon: 'check_circle', label: 'Confirm', actionKey: 'confirm', color: 'primary', showIf: (row: any) => row.status === 'sent' },
      { icon: 'receipt', label: 'Convert to Invoice', actionKey: 'convert', color: 'accent', showIf: (row: any) => row.status === 'confirmed' },
      { icon: 'print', label: 'Print', actionKey: 'print' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn', showIf: (row: any) => row.status === 'draft' }
    ]}
  ];

  dataSource: MatTableDataSource<any>;
  loading = false;
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;

  // Filters
  searchControl = new FormControl('');
  statusFilter = new FormControl('');
  supplierFilter = new FormControl('');
  dateFromFilter = new FormControl('');
  dateToFilter = new FormControl('');

  suppliers: any[] = [];
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Statistics
  statistics = {
    totalOrders: 0,
    totalAmount: 0,
    draftCount: 0,
    sentCount: 0,
    confirmedCount: 0
  };

  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private poService: PurchaseOrderService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<PurchaseOrder>([]);
  }

  ngOnInit(): void {
    this.loadPurchaseOrders();
    this.loadSuppliers();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(index: number, item: any): string { return item._id; }
  trackByValue(index: number, item: any): any { return item.value; }

  setupFilters(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadPurchaseOrders());

    this.statusFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPurchaseOrders());
    this.supplierFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPurchaseOrders());
    this.dateFromFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPurchaseOrders());
    this.dateToFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPurchaseOrders());
  }

  loadSuppliers(): void {
    this.poService.getSuppliers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => { this.suppliers = response.data; },
      error: () => {}
    });
  }

  loadPurchaseOrders(): void {
    this.loading = true;

    const params = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      keyword: this.searchControl.value || undefined,
      status: this.statusFilter.value || undefined,
      supplierId: this.supplierFilter.value || undefined,
      dateFrom: this.dateFromFilter.value || undefined,
      dateTo: this.dateToFilter.value || undefined
    };

    this.poService.getPurchaseOrders(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.dataSource.data = (response.data || []).map((po: any, index: number) => ({
          ...po,
          sno: (this.currentPage * this.pageSize) + index + 1,
          supplierTown: po.supplierTown || 'N/A',
          billNo: po.billNo || 'N/A'
        }));
        this.totalItems = response.pagination?.totalItems || 0;
        this.calculateStatistics(response.data);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load purchase orders', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  calculateStatistics(orders: PurchaseOrder[]): void {
    this.statistics = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, po) => sum + po.totalAmount, 0),
      draftCount: orders.filter(po => po.status === 'draft').length,
      sentCount: orders.filter(po => po.status === 'sent').length,
      confirmedCount: orders.filter(po => po.status === 'confirmed').length
    };
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPurchaseOrders();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: 'gray',
      sent: 'blue',
      confirmed: 'green',
      received: 'teal',
      cancelled: 'red'
    };
    return colors[status] || 'gray';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent',
      confirmed: 'Confirmed',
      received: 'Received',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  getFulfillmentColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: '#FFC107',
      partial: '#FF9800',
      fulfilled: '#4CAF50'
    };
    return colors[status] || '#9E9E9E';
  }

  getFulfillmentLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      partial: 'Partial',
      fulfilled: 'Fulfilled'
    };
    return labels[status] || 'N/A';
  }

  onCreateNew(): void {
    this.router.navigate(['/purchase-orders/create']);
  }

  onView(po: PurchaseOrder): void {
    this.router.navigate(['/purchase-orders', po._id]);
  }

  onEdit(po: PurchaseOrder): void {
    if (po.status !== 'draft') {
      this.snackBar.open('Only draft orders can be edited', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/purchase-orders/edit', po._id]);
  }

  onSend(po: PurchaseOrder): void {
    if (po.status !== 'draft') {
      this.snackBar.open('Only draft orders can be sent', 'Close', { duration: 3000 });
      return;
    }

    this.poService.sendPurchaseOrder(po._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Purchase order sent successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrders();
      },
      error: () => {
        this.snackBar.open('Failed to send purchase order', 'Close', { duration: 3000 });
      }
    });
  }

  onConfirm(po: PurchaseOrder): void {
    if (po.status !== 'sent') {
      this.snackBar.open('Only sent orders can be confirmed', 'Close', { duration: 3000 });
      return;
    }

    this.poService.confirmPurchaseOrder(po._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Purchase order confirmed successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrders();
      },
      error: () => {
        this.snackBar.open('Failed to confirm purchase order', 'Close', { duration: 3000 });
      }
    });
  }

  onConvertToInvoice(po: PurchaseOrder): void {
    if (po.status !== 'confirmed') {
      this.snackBar.open('Only confirmed orders can be converted to invoice', 'Close', { duration: 3000 });
      return;
    }

    this.poService.convertToInvoice(po._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.snackBar.open('Purchase order converted to invoice successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/purchase-invoices', response.data._id]);
      },
      error: () => {
        this.snackBar.open('Failed to convert to invoice', 'Close', { duration: 3000 });
      }
    });
  }

  onDelete(po: PurchaseOrder): void {
    if (po.status !== 'draft') {
      this.snackBar.open('Only draft orders can be deleted', 'Close', { duration: 3000 });
      return;
    }

    if (confirm(`Are you sure you want to delete PO ${po.poNumber}?`)) {
      this.poService.deletePurchaseOrder(po._id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Purchase order deleted successfully', 'Close', { duration: 3000 });
          this.loadPurchaseOrders();
        },
        error: () => {
          this.snackBar.open('Failed to delete purchase order', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onPrint(po: PurchaseOrder): void {
    // Implement print functionality
    this.snackBar.open('Print functionality coming soon', 'Close', { duration: 2000 });
  }

  onExport(): void {
    // Implement export functionality
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 2000 });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.setValue('');
    this.supplierFilter.setValue('');
    this.dateFromFilter.setValue('');
    this.dateToFilter.setValue('');
  }

  onTableAction(event: { action: string, row: any }): void {
    const po = event.row as PurchaseOrder;
    switch(event.action) {
      case 'view': this.onView(po); break;
      case 'edit': this.onEdit(po); break;
      case 'send': this.onSend(po); break;
      case 'confirm': this.onConfirm(po); break;
      case 'convert': this.onConvertToInvoice(po); break;
      case 'print': this.onPrint(po); break;
      case 'delete': this.onDelete(po); break;
    }
  }
}
