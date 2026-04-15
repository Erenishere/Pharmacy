import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { EOrderService, EOrder, EOrderSummary } from '../../e-order.service';
import { EOrderFormDialogComponent } from '../e-order-form-dialog/e-order-form-dialog.component';
import { Router } from '@angular/router';
import {
  EnhancedConfirmDialogComponent,
  EnhancedConfirmDialogData,
  EnhancedConfirmDialogResult
} from '../../../../shared/components/enhanced-confirm-dialog/enhanced-confirm-dialog.component';
import {
  EOrderCancelReasonDialogComponent,
  EOrderCancelReasonDialogResult
} from '../e-order-cancel-reason-dialog/e-order-cancel-reason-dialog.component';

@Component({
  selector: 'app-e-order-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatProgressSpinnerModule, MatDialogModule,
    MatTooltipModule, MatSnackBarModule, MatMenuModule, MatPaginatorModule
  ],
  templateUrl: './e-order-list.component.html',
  styleUrl: './e-order-list.component.scss'
})
export class EOrderListComponent implements OnInit {
  displayedColumns = ['orderNumber', 'customer', 'town', 'grandTotal', 'createdBy', 'orderDate', 'actions'];
  dataSource = new MatTableDataSource<EOrder>([]);
  loading = false;
  processingId: string | null = null;

  summary: EOrderSummary = { totalOrders: 0, pendingOrders: 0, approvedOrders: 0, convertedOrders: 0, cancelledOrders: 0, totalValue: 0 };

  // Pagination
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;

  // Filters
  statusFilter = new FormControl('');
  dateFrom = new FormControl<Date | null>(null);
  dateTo = new FormControl<Date | null>(null);

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'converted', label: 'Converted' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  constructor(
    private eOrderService: EOrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadSummary();
  }

  loadOrders(): void {
    this.loading = true;
    const filters: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (this.statusFilter.value) filters.status = this.statusFilter.value;
    if (this.dateFrom.value) filters.startDate = this.dateFrom.value.toISOString();
    if (this.dateTo.value) filters.endDate = this.dateTo.value.toISOString();

    this.eOrderService.getOrders(filters).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.orders || res.data || [];
        this.totalCount = res.pagination?.total || this.dataSource.data.length;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load e-orders', 'Close', { duration: 3000 });
      }
    });
  }

  loadSummary(): void {
    this.eOrderService.getSummary().subscribe({
      next: (res) => { this.summary = res.data || this.summary; },
      error: () => {}
    });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadOrders();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadOrders();
  }

  viewDetails(eOrder: EOrder): void {
    this.router.navigate(['/e-orders', eOrder._id]);
  }

  openCreate(): void {
    const ref = this.dialog.open(EOrderFormDialogComponent, {
      width: '1280px',
      maxWidth: '96vw',
      height: '92vh',
      panelClass: 'e-order-dialog-panel',
      autoFocus: false,
      data: {}
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.loadOrders(); this.loadSummary(); }
    });
  }

  openEdit(order: EOrder): void {
    const ref = this.dialog.open(EOrderFormDialogComponent, {
      width: '1280px',
      maxWidth: '96vw',
      height: '92vh',
      panelClass: 'e-order-dialog-panel',
      autoFocus: false,
      data: { order }
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.loadOrders(); this.loadSummary(); }
    });
  }

  approve(order: EOrder): void {
    const confirmData: EnhancedConfirmDialogData = {
      title: 'Approve E-Order',
      message: `Approve order ${order.orderNumber}?`,
      confirmText: 'Approve',
      cancelText: 'Back',
      confirmColor: 'primary',
      icon: 'check_circle',
      type: 'success'
    };

    this.dialog.open(EnhancedConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: confirmData
    }).afterClosed().subscribe((result: EnhancedConfirmDialogResult | undefined) => {
      if (!result?.confirmed) return;

      this.processingId = order._id;
      this.eOrderService.approve(order._id).subscribe({
        next: () => {
          this.processingId = null;
          this.snackBar.open(`Order ${order.orderNumber} approved`, 'Close', { duration: 3000, panelClass: 'snack-success' });
          this.loadOrders();
          this.loadSummary();
        },
        error: (err) => {
          this.processingId = null;
          this.snackBar.open(err?.error?.message || 'Failed to approve', 'Close', { duration: 3000 });
        }
      });
    });
  }

  cancel(order: EOrder): void {
    this.dialog.open(EOrderCancelReasonDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: { orderNumber: order.orderNumber }
    }).afterClosed().subscribe((result: EOrderCancelReasonDialogResult | undefined) => {
      if (!result?.confirmed || !result.reason?.trim()) return;

      this.processingId = order._id;
      this.eOrderService.cancel(order._id, result.reason.trim()).subscribe({
        next: () => {
          this.processingId = null;
          this.snackBar.open('Order cancelled', 'Close', { duration: 3000 });
          this.loadOrders();
          this.loadSummary();
        },
        error: (err) => {
          this.processingId = null;
          this.snackBar.open(err?.error?.message || 'Failed to cancel', 'Close', { duration: 3000 });
        }
      });
    });
  }

  convertToInvoice(order: EOrder): void {
    const confirmData: EnhancedConfirmDialogData = {
      title: 'Convert To Invoice',
      message: `Convert order ${order.orderNumber} to a Sales Invoice?`,
      confirmText: 'Convert',
      cancelText: 'Back',
      confirmColor: 'primary',
      icon: 'receipt_long',
      type: 'info'
    };

    this.dialog.open(EnhancedConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: confirmData
    }).afterClosed().subscribe((result: EnhancedConfirmDialogResult | undefined) => {
      if (!result?.confirmed) return;

      this.processingId = order._id;
      this.eOrderService.convertToInvoice(order._id).subscribe({
        next: () => {
          this.processingId = null;
          this.snackBar.open('Converted to invoice successfully', 'Close', { duration: 4000, panelClass: 'snack-success' });
          this.loadOrders();
          this.loadSummary();
        },
        error: (err) => {
          this.processingId = null;
          this.snackBar.open(err?.error?.message || 'Failed to convert', 'Close', { duration: 3000 });
        }
      });
    });
  }

  deleteOrder(order: EOrder): void {
    const confirmData: EnhancedConfirmDialogData = {
      title: 'Delete E-Order',
      message: `Delete order ${order.orderNumber}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Back',
      confirmColor: 'warn',
      icon: 'delete_forever',
      type: 'error'
    };

    this.dialog.open(EnhancedConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: confirmData
    }).afterClosed().subscribe((result: EnhancedConfirmDialogResult | undefined) => {
      if (!result?.confirmed) return;

      this.eOrderService.delete(order._id).subscribe({
        next: () => {
          this.snackBar.open('Order deleted', 'Close', { duration: 3000 });
          this.loadOrders();
          this.loadSummary();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
        }
      });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status-pending', approved: 'status-approved',
      converted: 'status-converted', cancelled: 'status-cancelled'
    };
    return map[status] || '';
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0 }).format(val || 0);
  }
}
