import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  FinancialReportsService,
  FinancialSummary,
  FinancialReportQueryParams
} from '../../services/financial-reports.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatGridListModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    BaseChartDirective
  ],
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit {
  loading = false;
  summary: FinancialSummary | null = null;

  // Date filters
  periodFilter = new FormControl<'monthly' | 'quarterly' | 'yearly' | null>('monthly');
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);

  // Chart configurations
  public revenueExpenseChart: any = {
    type: 'doughnut',
    data: {
      labels: ['Revenue', 'Expenses'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#4CAF50', '#F44336'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  };

  public profitTrendChart: any = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Net Profit',
        data: [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  constructor(
    private financialReportsService: FinancialReportsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadFinancialSummary();
  }

  setDefaultDateRange(): void {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.startDate.setValue(startOfMonth);
    this.endDate.setValue(now);
  }

  loadFinancialSummary(): void {
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

    this.financialReportsService.getFinancialSummary(params).subscribe({
      next: (response) => {
        this.summary = response.data;
        this.updateCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading financial summary:', error);
        this.snackBar.open('Failed to load financial summary', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateCharts(): void {
    if (!this.summary) return;

    // Update revenue vs expense chart
    this.revenueExpenseChart.data.datasets[0].data = [
      this.summary.totalRevenue,
      this.summary.totalExpenses
    ];

    // Mock profit trend data (in real implementation, this would come from API)
    this.profitTrendChart.data.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    this.profitTrendChart.data.datasets[0].data = [
      45000, 52000, 48000, 61000, 55000, this.summary.netProfit
    ];
  }

  onGenerateReports(): void {
    this.loadFinancialSummary();
  }

  onViewProfitLoss(): void {
    this.router.navigate(['/financial-reports/profit-loss'], {
      queryParams: {
        startDate: this.startDate.value?.toISOString(),
        endDate: this.endDate.value?.toISOString(),
        period: this.periodFilter.value
      }
    });
  }

  onViewBalanceSheet(): void {
    this.router.navigate(['/financial-reports/balance-sheet'], {
      queryParams: {
        startDate: this.startDate.value?.toISOString(),
        endDate: this.endDate.value?.toISOString(),
        period: this.periodFilter.value
      }
    });
  }

  onViewCashFlow(): void {
    this.router.navigate(['/financial-reports/cash-flow'], {
      queryParams: {
        startDate: this.startDate.value?.toISOString(),
        endDate: this.endDate.value?.toISOString(),
        period: this.periodFilter.value
      }
    });
  }

  onExportReports(): void {
    // Implementation for exporting all reports
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 3000 });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatPercentage(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  getProfitMarginClass(): string {
    if (!this.summary) return '';
    return this.summary.profitMargin >= 20 ? 'excellent' :
           this.summary.profitMargin >= 10 ? 'good' : 'poor';
  }

  getROAClass(): string {
    if (!this.summary) return '';
    return this.summary.returnOnAssets >= 15 ? 'excellent' :
           this.summary.returnOnAssets >= 8 ? 'good' : 'poor';
  }
}
