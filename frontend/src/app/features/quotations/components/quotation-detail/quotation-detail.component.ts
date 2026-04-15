import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { QuotationService, Quotation } from '../../quotation.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-quotation-detail',
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
  templateUrl: './quotation-detail.component.html',
  styleUrls: ['./quotation-detail.component.scss']
})
export class QuotationDetailComponent implements OnInit {
  quotation: Quotation | null = null;
  loading = false;
  processing = false;

  displayedColumns: string[] = [
    'sno',
    'itemName',
    'quantity',
    'unitPrice',
    'discount',
    'gstRate',
    'gstAmount',
    'lineTotal'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadQuotation(id);
    }
  }

  loadQuotation(id: string): void {
    this.loading = true;
    this.quotationService.getById(id).subscribe({
      next: (response) => {
        this.quotation = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading quotation:', error);
        this.snackBar.open('Failed to load quotation', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: '#9E9E9E',
      sent: '#2196F3',
      approved: '#4CAF50',
      converted: '#009688',
      expired: '#FF9800',
      cancelled: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent to Customer',
      approved: 'Approved',
      converted: 'Converted',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  isExpiringSoon(validUntil: string): boolean {
    if (!validUntil) return false;
    const diff = new Date(validUntil).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  isExpired(validUntil: string): boolean {
    if (!validUntil) return false;
    return new Date(validUntil).getTime() < Date.now();
  }

  onMarkAsSent(): void {
    if (!this.quotation) return;

    this.processing = true;
    this.quotationService.markAsSent(this.quotation._id).subscribe({
      next: () => {
        this.snackBar.open('Quotation marked as sent successfully', 'Close', { duration: 3000 });
        this.loadQuotation(this.quotation!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error marking as sent:', error);
        this.snackBar.open('Failed to mark as sent', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onApprove(): void {
    if (!this.quotation) return;

    this.processing = true;
    this.quotationService.approve(this.quotation._id).subscribe({
      next: () => {
        this.snackBar.open('Quotation approved successfully', 'Close', { duration: 3000 });
        this.loadQuotation(this.quotation!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error approving quotation:', error);
        this.snackBar.open('Failed to approve quotation', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onCancel(): void {
    if (!this.quotation) return;

    if (!confirm(`Are you sure you want to cancel quotation ${this.quotation.quotationNumber}?`)) return;

    this.processing = true;
    this.quotationService.cancel(this.quotation._id).subscribe({
      next: () => {
        this.snackBar.open('Quotation cancelled successfully', 'Close', { duration: 3000 });
        this.loadQuotation(this.quotation!._id);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error cancelling quotation:', error);
        this.snackBar.open('Failed to cancel quotation', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onConvertToInvoice(): void {
    if (!this.quotation) return;

    if (!confirm(`Convert quotation ${this.quotation.quotationNumber} to a Sales Invoice?`)) return;

    this.processing = true;
    // For now, we'll use a default approach - in a real app you'd select a warehouse
    this.quotationService.convertToInvoice(this.quotation._id, { warehouseId: 'default', autoConfirm: true }).subscribe({
      next: () => {
        this.snackBar.open('Quotation converted to invoice successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/sales-invoices']);
      },
      error: (error: any) => {
        console.error('Error converting to invoice:', error);
        this.snackBar.open('Failed to convert to invoice', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onConvertToOrder(): void {
    if (!this.quotation) return;

    if (!confirm(`Convert quotation ${this.quotation.quotationNumber} to an E-Order?`)) return;

    this.processing = true;
    this.quotationService.convertToOrder(this.quotation._id).subscribe({
      next: () => {
        this.snackBar.open('Quotation converted to e-order successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/e-orders']);
      },
      error: (error) => {
        console.error('Error converting to order:', error);
        this.snackBar.open('Failed to convert to order', 'Close', { duration: 3000 });
        this.processing = false;
      }
    });
  }

  onEdit(): void {
    if (!this.quotation) return;
    this.router.navigate(['/quotations/edit', this.quotation._id]);
  }

  onPrint(): void {
    // Implement print functionality
    window.print();
  }

  onBack(): void {
    this.router.navigate(['/quotations']);
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
    return this.quotation?.status === 'draft';
  }

  canMarkAsSent(): boolean {
    return this.quotation?.status === 'draft';
  }

  canApprove(): boolean {
    return this.quotation?.status === 'sent';
  }

  canConvert(): boolean {
    return this.quotation?.status === 'approved';
  }

  canCancel(): boolean {
    return ['draft', 'sent', 'approved'].includes(this.quotation?.status || '');
  }
}
