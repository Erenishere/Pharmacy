import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { QuotationService, Quotation } from '../../quotation.service';
import { QuotationFormDialogComponent } from '../quotation-form-dialog/quotation-form-dialog.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatProgressSpinnerModule, MatDialogModule,
    MatTooltipModule, MatSnackBarModule, MatMenuModule, MatPaginatorModule
  ],
  templateUrl: './quotation-list.component.html',
  styleUrl: './quotation-list.component.scss'
})
export class QuotationListComponent implements OnInit {
  displayedColumns = ['quotationDate', 'partyName', 'referenceNumber', 'grandTotal', 'status', 'actions'];
  dataSource = new MatTableDataSource<Quotation>([]);
  loading = false;
  processingId: string | null = null;
  warehouses: any[] = [];

  summary: any = { totalQuotations: 0, draftQuotations: 0, sentQuotations: 0, convertedQuotations: 0, expiredQuotations: 0, totalValue: 0 };

  // Pagination
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;

  // Filters
  statusFilter = new FormControl('');
  customerFilter = new FormControl('');
  dateFrom = new FormControl<Date | null>(null);
  dateTo = new FormControl<Date | null>(null);

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'converted', label: 'Converted' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  constructor(
    private quotationService: QuotationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadQuotations();
    this.loadSummary();
    this.loadWarehouses();
  }

  loadQuotations(): void {
    this.loading = true;
    const filters: any = { page: this.pageIndex + 1, limit: this.pageSize };
    if (this.statusFilter.value) filters.status = this.statusFilter.value;
    if (this.customerFilter.value) filters.customerName = this.customerFilter.value;
    if (this.dateFrom.value) filters.dateFrom = this.dateFrom.value.toISOString();
    if (this.dateTo.value) filters.dateTo = this.dateTo.value.toISOString();

    this.quotationService.getQuotations(filters).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || res.quotations || [];
        this.totalCount = res.pagination?.total || this.dataSource.data.length;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load quotations', 'Close', { duration: 3000 });
      }
    });
  }

  loadSummary(): void {
    this.quotationService.getSummary().subscribe({
      next: (res) => { this.summary = res.data?.summary || res.data || this.summary; },
      error: () => {}
    });
  }

  loadWarehouses(): void {
    this.http.get<any>(`${environment.apiUrl}/warehouses?limit=100`).subscribe(res => {
      this.warehouses = res.data || res.warehouses || [];
    });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadQuotations();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadQuotations();
  }

  clearFilters(): void {
    this.statusFilter.setValue('');
    this.customerFilter.setValue('');
    this.dateFrom.setValue(null);
    this.dateTo.setValue(null);
    this.applyFilters();
  }

  viewDetails(quotation: Quotation): void {
    this.router.navigate(['/quotations', quotation._id]);
  }

  openCreate(): void {
    const ref = this.dialog.open(QuotationFormDialogComponent, {
      width: '1000px', maxWidth: '95vw',
      panelClass: ['standard-form-dialog-panel', 'quotation-dialog-panel'],
      autoFocus: false,
      data: {}
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.loadQuotations(); this.loadSummary(); }
    });
  }

  openEdit(quotation: Quotation): void {
    const ref = this.dialog.open(QuotationFormDialogComponent, {
      width: '1000px', maxWidth: '95vw',
      panelClass: ['standard-form-dialog-panel', 'quotation-dialog-panel'],
      autoFocus: false,
      data: { quotation }
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.loadQuotations(); this.loadSummary(); }
    });
  }

  markAsSent(q: Quotation): void {
    this.processingId = q._id;
    this.quotationService.markAsSent(q._id).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open(`Quotation ${q.quotationNumber} marked as sent`, 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  approve(q: Quotation): void {
    this.processingId = q._id;
    this.quotationService.approve(q._id).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open('Quotation approved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  cancel(q: Quotation): void {
    if (!confirm(`Cancel quotation ${q.quotationNumber}?`)) return;
    this.processingId = q._id;
    this.quotationService.cancel(q._id).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open('Quotation cancelled', 'Close', { duration: 3000 });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  convertToInvoice(q: Quotation): void {
    if (this.warehouses.length === 0) {
      this.snackBar.open('No warehouses available', 'Close', { duration: 3000 });
      return;
    }
    const warehouseId = this.warehouses[0]._id;
    if (!confirm(`Convert ${q.quotationNumber} to a Sales Invoice using warehouse "${this.warehouses[0].name}"?`)) return;
    this.processingId = q._id;
    this.quotationService.convertToInvoice(q._id, { warehouseId }).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open('Converted to Sales Invoice', 'Close', { duration: 4000, panelClass: 'snack-success' });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed to convert', 'Close', { duration: 3000 });
      }
    });
  }

  convertToOrder(q: Quotation): void {
    if (!confirm(`Convert ${q.quotationNumber} to an E-Order?`)) return;
    this.processingId = q._id;
    this.quotationService.convertToOrder(q._id).subscribe({
      next: () => {
        this.processingId = null;
        this.snackBar.open('Converted to E-Order', 'Close', { duration: 4000, panelClass: 'snack-success' });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.processingId = null;
        this.snackBar.open(err?.error?.message || 'Failed to convert', 'Close', { duration: 3000 });
      }
    });
  }

  deleteQuotation(q: Quotation): void {
    if (!confirm(`Delete quotation ${q.quotationNumber}?`)) return;
    this.quotationService.delete(q._id).subscribe({
      next: () => {
        this.snackBar.open('Quotation deleted', 'Close', { duration: 3000 });
        this.loadQuotations(); this.loadSummary();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed', 'Close', { duration: 3000 });
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'status-draft', sent: 'status-sent', approved: 'status-approved',
      converted: 'status-converted', expired: 'status-expired', cancelled: 'status-cancelled'
    };
    return map[status] || '';
  }

  isExpiringSoon(validUntil: string): boolean {
    const diff = new Date(validUntil).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0 }).format(val || 0);
  }
}
