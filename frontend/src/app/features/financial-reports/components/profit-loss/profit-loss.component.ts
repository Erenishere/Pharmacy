import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import {
  FinancialReportsService,
  ProfitLossStatement,
  FinancialReportQueryParams
} from '../../services/financial-reports.service';

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './profit-loss.component.html',
  styleUrls: ['./profit-loss.component.scss']
})
export class ProfitLossComponent implements OnInit {
  loading = false;
  statement: ProfitLossStatement | null = null;

  // Current date for template
  currentDate = new Date();

  // Filters
  periodFilter = new FormControl<'monthly' | 'quarterly' | 'yearly'>('monthly');
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);

  constructor(
    private financialReportsService: FinancialReportsService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['startDate']) {
        this.startDate.setValue(new Date(params['startDate']));
      }
      if (params['endDate']) {
        this.endDate.setValue(new Date(params['endDate']));
      }
      if (params['period']) {
        this.periodFilter.setValue(params['period']);
      }
      this.loadProfitLossStatement();
    });
  }

  loadProfitLossStatement(): void {
    this.loading = true;

    const params: FinancialReportQueryParams = {
      period: this.periodFilter.value || 'monthly'
    };

    if (this.startDate.value) {
      params.startDate = this.startDate.value.toISOString();
    }

    if (this.endDate.value) {
      params.endDate = this.endDate.value.toISOString();
    }

    this.financialReportsService.getProfitLossStatement(params).subscribe({
      next: (response) => {
        this.statement = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profit & loss statement:', error);
        this.snackBar.open('Failed to load profit & loss statement', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onGenerateReport(): void {
    this.loadProfitLossStatement();
  }

  onExportReport(): void {
    const params: FinancialReportQueryParams = {
      period: this.periodFilter.value || 'monthly'
    };

    if (this.startDate.value) {
      params.startDate = this.startDate.value.toISOString();
    }

    if (this.endDate.value) {
      params.endDate = this.endDate.value.toISOString();
    }

    this.financialReportsService.exportProfitLoss(params).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `profit-loss-${new Date().toISOString().split('T')[0]}.pdf`);
      },
      error: (error) => {
        console.error('Error exporting profit & loss report:', error);
        this.snackBar.open('Failed to export report', 'Close', { duration: 3000 });
      }
    });
  }

  onBackToDashboard(): void {
    this.router.navigate(['/financial-reports']);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  getTotalRevenue(): number {
    if (!this.statement) return 0;
    return this.statement.revenue.sales.reduce((sum, item) => sum + item.amount, 0) +
           this.statement.revenue.otherIncome.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalExpenses(): number {
    if (!this.statement) return 0;
    return this.statement.expenses.costOfGoodsSold.reduce((sum, item) => sum + item.amount, 0) +
           this.statement.expenses.operatingExpenses.reduce((sum, item) => sum + item.amount, 0) +
           this.statement.expenses.otherExpenses.reduce((sum, item) => sum + item.amount, 0);
  }
}
