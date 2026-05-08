import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  RecoveryCustomerDetail,
  RecoverySummaryRow,
  RecoverySummaryService,
  RecoverySummaryStats
} from '../../services/recovery-summary.service';

@Component({
  selector: 'app-recovery-summary',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './recovery-summary.component.html',
  styleUrl: './recovery-summary.component.scss'
})
export class RecoverySummaryComponent implements OnInit {
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator | undefined) {
    if (!paginator) {
      return;
    }

    this.paginator = paginator;
    this.dataSource.paginator = paginator;
  }

  readonly displayedColumns = [
    'salesmanName',
    'invoiceCount',
    'customerCount',
    'totalSales',
    'totalRecovery',
    'totalOutstanding',
    'recoveryPercentage'
  ];
  readonly detailColumns = [
    'customerName',
    'dimensionName',
    'invoiceCount',
    'totalSales',
    'totalRecovery',
    'totalOutstanding',
    'overdueAmount',
    'recoveryPercentage'
  ];

  readonly dataSource = new MatTableDataSource<RecoverySummaryRow>([]);

  readonly fromDate = new FormControl<Date | null>(null);
  readonly toDate = new FormControl<Date | null>(null);
  readonly salesmanFilter = new FormControl('');
  readonly dimensionFilter = new FormControl('');
  readonly customerFilter = new FormControl('');
  readonly agingFilter = new FormControl('');

  loading = false;
  pageSize = 20;
  salesmen: any[] = [];
  dimensions: any[] = [];
  selectedSummary: RecoverySummaryRow | null = null;
  detailsDataSource = new MatTableDataSource<RecoveryCustomerDetail>([]);
  stats: RecoverySummaryStats = {
    totalSales: 0,
    totalRecovery: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    recoveryRate: 0,
    activeSalesmen: 0,
    totalCustomers: 0,
    agingAnalysis: {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 }
    }
  };

  constructor(
    private recoverySummaryService: RecoverySummaryService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadLookups();
  }

  loadLookups(): void {
    forkJoin({
      salesmen: this.http.get<any>(`${environment.apiUrl}/salesmen`),
      dimensions: this.http.get<any>(`${environment.apiUrl}/dimensions`)
    }).subscribe({
      next: ({ salesmen, dimensions }) => {
        this.salesmen = this.arrayFromResponse(salesmen, ['salesmen']);
        this.dimensions = this.arrayFromResponse(dimensions, ['dimensions']);
      }
    });
  }

  loadReport(): void {
    this.loading = true;
    const filters = this.buildFilters();

    forkJoin({
      summary: this.recoverySummaryService.getRecoverySummary(filters),
      stats: this.recoverySummaryService.getRecoveryStatistics(filters)
    }).subscribe({
      next: ({ summary, stats }) => {
        this.loading = false;
        const rows = this.arrayFromResponse<RecoverySummaryRow>(summary, ['items']);
        this.dataSource.data = rows;
        this.stats = stats?.data || this.stats;

        if (rows.length > 0) {
          this.selectSummary(rows[0]);
        } else {
          this.selectedSummary = null;
          this.detailsDataSource.data = [];
        }

        this.paginator?.firstPage();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectSummary(row: RecoverySummaryRow): void {
    this.selectedSummary = row;
    this.detailsDataSource.data = row.details || [];
  }

  exportReport(): void {
    const data = this.dataSource.data;
    const csvContent = this.convertToCSV(data);
    this.downloadCSV(csvContent, 'recovery-summary.csv');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  private buildFilters(): Record<string, string> {
    const filters: Record<string, string> = {};

    if (this.fromDate.value) {
      filters['startDate'] = this.fromDate.value.toISOString();
    }
    if (this.toDate.value) {
      filters['endDate'] = this.toDate.value.toISOString();
    }
    if (this.salesmanFilter.value) {
      filters['salesmanId'] = this.salesmanFilter.value;
    }
    if (this.dimensionFilter.value) {
      filters['dimensionId'] = this.dimensionFilter.value;
    }
    if (this.customerFilter.value) {
      filters['customerId'] = this.customerFilter.value;
    }
    if (this.agingFilter.value) {
      filters['agingBucket'] = this.agingFilter.value;
    }

    return filters;
  }

  private convertToCSV(data: RecoverySummaryRow[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = [
      'Salesman',
      'Invoices',
      'Customers',
      'Total Sales',
      'Total Recovery',
      'Outstanding',
      'Overdue',
      'Recovery %'
    ];

    const rows = data.map((row) => [
      row.salesmanName,
      row.invoiceCount,
      row.customerCount,
      row.totalSales,
      row.totalRecovery,
      row.totalOutstanding,
      row.overdueAmount,
      `${row.recoveryPercentage.toFixed(2)}%`
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  private downloadCSV(content: string, filename: string): void {
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

  private arrayFromResponse<T = any>(res: any, keys: string[] = []): T[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    if (Array.isArray(res?.data?.items)) {
      return res.data.items;
    }
    for (const key of keys) {
      if (Array.isArray(res?.[key])) {
        return res[key];
      }
      if (Array.isArray(res?.data?.[key])) {
        return res.data[key];
      }
    }
    return [];
  }
}
