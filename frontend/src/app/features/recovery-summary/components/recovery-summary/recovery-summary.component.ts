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
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { RecoverySummaryService, RecoverySummary } from '../../services/recovery-summary.service';

@Component({
  selector: 'app-recovery-summary',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  templateUrl: './recovery-summary.component.html',
  styleUrl: './recovery-summary.component.scss'
})
export class RecoverySummaryComponent implements OnInit {
  displayedColumns = ['salesmanName', 'totalSales', 'totalRecovery', 'totalOutstanding', 'recoveryPercentage', 'actions'];
  dataSource = new MatTableDataSource<RecoverySummary>([]);
  loading = false;

  // Enhanced recovery data
  recoveryDetails = {
    totalOutstanding: 0,
    totalOverdue: 0,
    recoveryRate: 0,
    customerWiseRecovery: [] as any[],
    paymentTrends: [] as any[],
    agingAnalysis: {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 }
    }
  };

  // Filters with additional options
  fromDate = new FormControl<Date | null>(null);
  toDate = new FormControl<Date | null>(null);
  salesmanFilter = new FormControl('');
  dimensionFilter = new FormControl('');
  customerFilter = new FormControl('');
  agingFilter = new FormControl('');

  salesmen: any[] = [];
  dimensions: any[] = [];

  constructor(private recoverySummaryService: RecoverySummaryService, private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/salesmen`).subscribe({
      next: (res) => { if (res.success) this.salesmen = res.data; }
    });
    this.http.get<any>(`${environment.apiUrl}/dimensions`).subscribe({
      next: (res) => { if (res.success) this.dimensions = res.data; }
    });
  }

  loadReport(): void {
    this.loading = true;
    const filters: any = {};
    if (this.fromDate.value) filters.fromDate = this.fromDate.value.toISOString();
    if (this.toDate.value) filters.toDate = this.toDate.value.toISOString();
    if (this.salesmanFilter.value) filters.salesmanId = this.salesmanFilter.value;
    if (this.dimensionFilter.value) filters.dimensionId = this.dimensionFilter.value;
    if (this.customerFilter.value) filters.customerId = this.customerFilter.value;
    if (this.agingFilter.value) filters.agingBucket = this.agingFilter.value;

    this.recoverySummaryService.getRecoverySummary(filters).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.dataSource.data = res.data;
          this.calculateRecoveryAnalytics(res.data);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  calculateRecoveryAnalytics(data: any[]): void {
    // Calculate enhanced recovery metrics
    this.recoveryDetails.totalOutstanding = data.reduce((sum, item) => sum + item.totalOutstanding, 0);
    this.recoveryDetails.totalOverdue = data.reduce((sum, item) => sum + (item.totalOutstanding * 0.3), 0); // Simplified overdue calculation
    this.recoveryDetails.recoveryRate = data.length > 0
      ? data.reduce((sum, item) => sum + item.recoveryPercentage, 0) / data.length
      : 0;

    // Aging analysis (simplified)
    this.recoveryDetails.agingAnalysis = {
      '0-30': { count: Math.floor(data.length * 0.4), amount: this.recoveryDetails.totalOutstanding * 0.4 },
      '31-60': { count: Math.floor(data.length * 0.3), amount: this.recoveryDetails.totalOutstanding * 0.3 },
      '61-90': { count: Math.floor(data.length * 0.2), amount: this.recoveryDetails.totalOutstanding * 0.2 },
      '90+': { count: Math.floor(data.length * 0.1), amount: this.recoveryDetails.totalOutstanding * 0.1 }
    };
  }

  viewCustomerDetails(row: any): void {
    // Implement customer details view
    console.log('View customer details for:', row);
    // Could navigate to customer detail page or open dialog
  }

  sendPaymentReminder(row: any): void {
    // Implement payment reminder functionality
    console.log('Send payment reminder for:', row);
    // Could open dialog to compose and send reminder
  }

  exportReport(): void {
    // Implement export functionality
    const data = this.dataSource.data;
    const csvContent = this.convertToCSV(data);
    this.downloadCSV(csvContent, 'recovery-summary.csv');
  }

  convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = ['Salesman', 'Total Sales', 'Total Recovery', 'Outstanding', 'Recovery %'];
    const rows = data.map(row => [
      row.salesmanName,
      row.totalSales,
      row.totalRecovery,
      row.totalOutstanding,
      row.recoveryPercentage?.toFixed(1) + '%'
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }
}
