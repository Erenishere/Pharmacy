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

import { environment } from '../../../../../environments/environment';

import {
  FinancialReportsService,
  BalanceSheet,
  FinancialReportQueryParams
} from '../../services/financial-reports.service';

@Component({
  selector: 'app-balance-sheet',
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
  templateUrl: './balance-sheet.component.html',
  styleUrls: ['./balance-sheet.component.scss']
})
export class BalanceSheetComponent implements OnInit {
  loading = false;
  balanceSheet: BalanceSheet | null = null;

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
      this.loadBalanceSheet();
    });
  }

  loadBalanceSheet(): void {
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

    this.financialReportsService.getBalanceSheet(params).subscribe({
      next: (response) => {
        this.balanceSheet = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading balance sheet:', error);
        this.snackBar.open('Failed to load balance sheet', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onGenerateReport(): void {
    this.loadBalanceSheet();
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

    this.financialReportsService.exportBalanceSheet(params).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`);
      },
      error: (error) => {
        console.error('Error exporting balance sheet:', error);
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

  getTotalAssets(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.assets.currentAssets.reduce((sum, item) => sum + item.amount, 0) +
           this.balanceSheet.assets.fixedAssets.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalLiabilities(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.liabilities.currentLiabilities.reduce((sum, item) => sum + item.amount, 0) +
           this.balanceSheet.liabilities.longTermLiabilities.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalEquity(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.equity.capital.reduce((sum, item) => sum + item.amount, 0) +
           this.balanceSheet.equity.retainedEarnings.reduce((sum, item) => sum + item.amount, 0);
  }

  getTotalLiabilitiesAndEquity(): number {
    return this.getTotalLiabilities() + this.getTotalEquity();
  }

  isBalanced(): boolean {
    return this.getTotalAssets() === this.getTotalLiabilitiesAndEquity();
  }

  getCurrentRatio(): number {
    const currentAssets = this.getCurrentAssets();
    const currentLiabilities = this.getCurrentLiabilities();
    return currentAssets > 0 ? currentAssets / currentLiabilities : 0;
  }

  getQuickRatio(): number {
    const currentAssets = this.getCurrentAssets();
    const currentLiabilities = this.getCurrentLiabilities();
    const inventory = this.getInventory();
    return currentAssets > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
  }

  getDebtToEquityRatio(): number {
    const totalLiabilities = this.getTotalLiabilities();
    const totalEquity = this.getTotalEquity();
    return totalEquity > 0 ? totalLiabilities / totalEquity : 0;
  }

  getEquityRatio(): number {
    const totalAssets = this.getTotalAssets();
    const totalEquity = this.getTotalEquity();
    return totalAssets > 0 ? totalEquity / totalAssets : 0;
  }

  // Helper methods for individual totals
  getCurrentAssets(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.assets.currentAssets.reduce((sum, item) => sum + item.amount, 0);
  }

  getCurrentLiabilities(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.liabilities.currentLiabilities.reduce((sum, item) => sum + item.amount, 0);
  }

  getInventory(): number {
    if (!this.balanceSheet) return 0;
    const inventoryItem = this.balanceSheet.assets.currentAssets.find(item => item.category === 'Inventory');
    return inventoryItem ? inventoryItem.amount : 0;
  }

  getFixedAssets(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.assets.fixedAssets.reduce((sum, item) => sum + item.amount, 0);
  }

  getLongTermLiabilities(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.liabilities.longTermLiabilities.reduce((sum, item) => sum + item.amount, 0);
  }

  getCapital(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.equity.capital.reduce((sum, item) => sum + item.amount, 0);
  }

  getRetainedEarnings(): number {
    if (!this.balanceSheet) return 0;
    return this.balanceSheet.equity.retainedEarnings.reduce((sum, item) => sum + item.amount, 0);
  }
}
