import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import {
  FinancialReportsService,
  CashFlowStatement,
  FinancialReportQueryParams
} from '../../services/financial-reports.service';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './cash-flow.component.html',
  styleUrls: ['./cash-flow.component.scss']
})
export class CashFlowComponent implements OnInit {
  loading = false;
  cashFlow: CashFlowStatement | null = null;
  Math = Math; // Expose Math to template

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
      this.loadCashFlowStatement();
    });
  }

  loadCashFlowStatement(): void {
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

    this.financialReportsService.getCashFlowStatement(params).subscribe({
      next: (response) => {
        this.cashFlow = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cash flow statement:', error);
        this.snackBar.open('Failed to load cash flow statement', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onGenerateReport(): void {
    this.loadCashFlowStatement();
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

    this.financialReportsService.exportCashFlow(params).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `cash-flow-${new Date().toISOString().split('T')[0]}.pdf`);
      },
      error: (error) => {
        console.error('Error exporting cash flow report:', error);
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

  getTotalOperatingActivities(): number {
    if (!this.cashFlow) return 0;
    return this.cashFlow.operatingActivities.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalInvestingActivities(): number {
    if (!this.cashFlow) return 0;
    return this.cashFlow.investingActivities.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalFinancingActivities(): number {
    if (!this.cashFlow) return 0;
    return this.cashFlow.financingActivities.reduce((sum, item) => sum + item.amount, 0);
  }

  getNetCashFlow(): number {
    return this.getTotalOperatingActivities() + this.getTotalInvestingActivities() + this.getTotalFinancingActivities();
  }

  getCashFlowHealth(): string {
    if (!this.cashFlow) return 'neutral';

    const netCashFlow = this.getNetCashFlow();
    const openingBalance = this.cashFlow.openingCashBalance;

    // Positive cash flow and increased balance = good
    if (netCashFlow > 0 && this.cashFlow.closingCashBalance > openingBalance) {
      return 'positive';
    }
    // Negative cash flow but still positive balance = warning
    else if (netCashFlow < 0 && this.cashFlow.closingCashBalance > 0) {
      return 'warning';
    }
    // Negative cash flow and negative/zero balance = critical
    else if (netCashFlow < 0 && this.cashFlow.closingCashBalance <= 0) {
      return 'negative';
    }
    // No change = neutral
    else {
      return 'neutral';
    }
  }

  getCashFlowHealthIcon(): string {
    const health = this.getCashFlowHealth();
    switch (health) {
      case 'positive': return 'trending_up';
      case 'warning': return 'warning';
      case 'negative': return 'trending_down';
      default: return 'remove';
    }
  }

  getCashFlowHealthText(): string {
    const health = this.getCashFlowHealth();
    switch (health) {
      case 'positive': return 'Healthy Cash Flow';
      case 'warning': return 'Cash Flow Warning';
      case 'negative': return 'Critical Cash Position';
      default: return 'Stable Cash Position';
    }
  }
}
