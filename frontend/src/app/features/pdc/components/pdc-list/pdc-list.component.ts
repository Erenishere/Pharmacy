import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PdcService, PDCRecord } from '../../pdc.service';
import { BounceReasonDialogComponent } from '../bounce-reason-dialog/bounce-reason-dialog.component';

@Component({
  selector: 'app-pdc-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatCardModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule, MatChipsModule, MatSnackBarModule
  ],
  templateUrl: './pdc-list.component.html',
  styleUrl: './pdc-list.component.scss'
})
export class PDCListComponent implements OnInit {
  displayedColumns = ['receiptNumber', 'customer', 'bank', 'chequeNumber', 'chequeDate', 'amount', 'status', 'actions'];
  dataSource = new MatTableDataSource<PDCRecord>([]);
  loading = false;
  processingId: string | null = null;

  // Summary
  totalPending = 0;
  totalPendingAmount = 0;
  totalCleared = 0;
  totalBounced = 0;

  statusFilter = new FormControl('pending');

  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' },
    { value: 'bounced', label: 'Bounced' },
    { value: '', label: 'All' },
  ];

  constructor(
    private pdcService: PdcService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPDCs();
  }

  loadPDCs(): void {
    this.loading = true;
    this.pdcService.getPendingPDCs().subscribe({
      next: (res) => {
        this.loading = false;
        const all: PDCRecord[] = res.data || res.pdcs || [];
        // Apply client-side filter since backend only returns pending
        const filterVal = this.statusFilter.value;
        this.dataSource.data = filterVal ? all.filter(r => r.chequeStatus === filterVal) : all;
        this.calculateSummary(all);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load PDCs', 'Close', { duration: 3000 });
      }
    });
  }

  private calculateSummary(records: PDCRecord[]): void {
    this.totalPending = records.filter(r => r.chequeStatus === 'pending').length;
    this.totalPendingAmount = records.filter(r => r.chequeStatus === 'pending').reduce((s, r) => s + r.amount, 0);
    this.totalCleared = records.filter(r => r.chequeStatus === 'cleared').length;
    this.totalBounced = records.filter(r => r.chequeStatus === 'bounced').length;
  }

  clearPDC(record: PDCRecord): void {
    this.processingId = record._id;
    this.pdcService.clearPDC(record._id).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open(`Cheque ${record.bankDetails.chequeNumber} cleared successfully`, 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.loadPDCs();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed to clear PDC', 'Close', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  bouncePDC(record: PDCRecord): void {
    const dialogRef = this.dialog.open(BounceReasonDialogComponent, {
      width: '450px',
      data: { receiptNumber: record.receiptNumber, chequeNumber: record.bankDetails.chequeNumber }
    });

    dialogRef.afterClosed().subscribe(reason => {
      if (!reason) return;
      this.processingId = record._id;
      this.pdcService.bouncePDC(record._id, reason).subscribe({
        next: () => {
          this.processingId = null;
          this.snackBar.open(`Cheque marked as bounced`, 'Close', { duration: 3000, panelClass: 'snack-error' });
          this.loadPDCs();
        },
        error: (err) => {
          this.processingId = null;
          this.snackBar.open(err?.error?.message || 'Failed to bounce PDC', 'Close', { duration: 3000 });
        }
      });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = { pending: 'status-pending', cleared: 'status-cleared', bounced: 'status-bounced' };
    return map[status] || '';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
  }

  isOverdue(date: string | Date | undefined): boolean {
    if (!date) return false;
    const checkDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate < today;
  }
}
