import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { EOrderService, EOrder } from '../../e-order.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EnhancedConfirmDialogComponent,
  EnhancedConfirmDialogData,
  EnhancedConfirmDialogResult
} from '../../../../shared/components/enhanced-confirm-dialog/enhanced-confirm-dialog.component';
import {
  EOrderCancelReasonDialogComponent,
  EOrderCancelReasonDialogResult
} from '../e-order-cancel-reason-dialog/e-order-cancel-reason-dialog.component';
import { EOrderFormDialogComponent } from '../e-order-form-dialog/e-order-form-dialog.component';

@Component({
  selector: 'app-e-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './e-order-detail.component.html',
  styleUrls: ['./e-order-detail.component.scss']
})
export class EOrderDetailComponent implements OnInit {
  eOrder: EOrder | null = null;
  loading = false;
  processing = false;

  displayedColumns: string[] = [
    'sno',
    'itemName',
    'boxQuantity',
    'unitQuantity',
    'schemeUnitQty',
    'rateWithGST',
    'discount',
    'lineTotal'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eOrderService: EOrderService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEOrder(id);
    }
  }

  loadEOrder(id: string): void {
    this.loading = true;
    this.eOrderService.getById(id).subscribe({
      next: (response: any) => {
        this.eOrder = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading e-order:', error);
        this.snackBar.open('Failed to load e-order', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: '#FFC107',
      approved: '#4CAF50',
      converted: '#009688',
      cancelled: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending Approval',
      approved: 'Approved',
      converted: 'Converted to Invoice',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  onApprove(): void {
    const order = this.eOrder;
    if (!order) return;

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

      this.processing = true;
      this.eOrderService.approve(order._id).subscribe({
        next: () => {
          this.snackBar.open('E-Order approved successfully', 'Close', { duration: 3000 });
          this.loadEOrder(order._id);
          this.processing = false;
        },
        error: (error: any) => {
          console.error('Error approving e-order:', error);
          this.snackBar.open(error?.error?.message || 'Failed to approve e-order', 'Close', { duration: 3000 });
          this.processing = false;
        }
      });
    });
  }

  onCancel(): void {
    const order = this.eOrder;
    if (!order) return;

    this.dialog.open(EOrderCancelReasonDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: { orderNumber: order.orderNumber }
    }).afterClosed().subscribe((result: EOrderCancelReasonDialogResult | undefined) => {
      const reason = result?.reason?.trim();
      if (!result?.confirmed || !reason) return;

      this.processing = true;
      this.eOrderService.cancel(order._id, reason).subscribe({
        next: () => {
          this.snackBar.open('E-Order cancelled successfully', 'Close', { duration: 3000 });
          this.loadEOrder(order._id);
          this.processing = false;
        },
        error: (error: any) => {
          console.error('Error cancelling e-order:', error);
          this.snackBar.open(error?.error?.message || 'Failed to cancel e-order', 'Close', { duration: 3000 });
          this.processing = false;
        }
      });
    });
  }

  onConvertToInvoice(): void {
    const order = this.eOrder;
    if (!order) return;

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

      this.processing = true;
      this.eOrderService.convertToInvoice(order._id).subscribe({
        next: () => {
          this.snackBar.open('E-Order converted to invoice successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/sales-invoices']);
        },
        error: (error: any) => {
          console.error('Error converting to invoice:', error);
          this.snackBar.open(error?.error?.message || 'Failed to convert to invoice', 'Close', { duration: 3000 });
          this.processing = false;
        }
      });
    });
  }

  onEdit(): void {
    if (!this.eOrder) return;
    const ref = this.dialog.open(EOrderFormDialogComponent, {
      width: '1280px',
      maxWidth: '96vw',
      height: '92vh',
      panelClass: ['standard-form-dialog-panel', 'e-order-dialog-panel'],
      autoFocus: false,
      data: { order: this.eOrder }
    });

    ref.afterClosed().subscribe(result => {
      if (result && this.eOrder) {
        this.loadEOrder(this.eOrder._id);
      }
    });
  }

  onPrint(): void {
    // Implement print functionality
    window.print();
  }

  onBack(): void {
    this.router.navigate(['/e-orders']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Permission checks
  canEdit(): boolean {
    return this.eOrder?.status === 'pending';
  }

  canApprove(): boolean {
    return this.eOrder?.status === 'pending';
  }

  canConvert(): boolean {
    return this.eOrder?.status === 'approved';
  }

  canCancel(): boolean {
    return ['pending', 'approved'].includes(this.eOrder?.status || '');
  }
}
