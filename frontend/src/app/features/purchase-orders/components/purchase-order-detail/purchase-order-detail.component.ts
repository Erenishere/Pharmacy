import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrderService, PurchaseOrder } from '../../services/purchase-order.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './purchase-order-detail.component.html',
  styleUrls: ['./purchase-order-detail.component.scss']
})
export class PurchaseOrderDetailComponent implements OnInit {
  purchaseOrder: PurchaseOrder | null = null;
  loading = false;
  processing = false;

  displayedColumns: string[] = [
    'sno',
    'itemName',
    'boxPacking',
    'boxQty',
    'unitQty',
    'boxTP',
    'unitTP',
    'discount',
    'netAmount'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private poService: PurchaseOrderService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPurchaseOrder(id);
    }
  }

  loadPurchaseOrder(id: string): void {
    this.loading = true;
    this.poService.getPurchaseOrderById(id).subscribe({
      next: (response) => {
        this.purchaseOrder = response.data;
        this.loading = false;
        if (this.route.snapshot.queryParamMap.get('print') === '1') {
          setTimeout(() => window.print());
        }
      },
      error: (error: any) => {
        console.error('Error loading purchase order:', error);
        this.snackBar.open('Failed to load purchase order', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: '#9E9E9E',
      sent: '#2196F3',
      confirmed: '#4CAF50',
      received: '#009688',
      cancelled: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent to Supplier',
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

  onApprove(): void {
    if (!this.purchaseOrder) return;

    this.processing = true;
    this.poService.approvePurchaseOrder(this.purchaseOrder._id).subscribe({
      next: () => {
        this.snackBar.open('Purchase order approved successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrder(this.purchaseOrder!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error approving purchase order:', error);
        this.snackBar.open('Failed to approve purchase order', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onSend(): void {
    if (!this.purchaseOrder) return;

    this.processing = true;
    this.poService.sendPurchaseOrder(this.purchaseOrder._id).subscribe({
      next: () => {
        this.snackBar.open('Purchase order sent to supplier successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrder(this.purchaseOrder!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error sending purchase order:', error);
        this.snackBar.open('Failed to send purchase order', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onConfirm(): void {
    if (!this.purchaseOrder) return;

    this.processing = true;
    this.poService.confirmPurchaseOrder(this.purchaseOrder._id).subscribe({
      next: () => {
        this.snackBar.open('Purchase order confirmed successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrder(this.purchaseOrder!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error confirming purchase order:', error);
        this.snackBar.open('Failed to confirm purchase order', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onConvertToInvoice(): void {
    if (!this.purchaseOrder) return;

    this.processing = true;
    this.poService.convertToInvoice(this.purchaseOrder._id).subscribe({
      next: (response) => {
        this.snackBar.open('Purchase order converted to invoice successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/purchase-invoices/edit', response.data._id]);
      },
      error: (error) => {
        console.error('Error converting to invoice:', error);
        this.snackBar.open('Failed to convert to invoice', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onEdit(): void {
    if (!this.purchaseOrder) return;
    this.router.navigate(['/purchase-orders/edit', this.purchaseOrder._id]);
  }

  onPrint(): void {
    window.print();
  }

  onBack(): void {
    this.router.navigate(['/purchase-orders']);
  }

  canApprove(): boolean {
    return this.purchaseOrder?.status === 'draft';
  }

  canSend(): boolean {
    return this.purchaseOrder?.status === 'draft';
  }

  canConfirm(): boolean {
    return this.purchaseOrder?.status === 'sent';
  }

  canConvert(): boolean {
    return this.purchaseOrder?.status === 'confirmed';
  }

  canEdit(): boolean {
    return this.purchaseOrder?.status === 'draft';
  }
}
