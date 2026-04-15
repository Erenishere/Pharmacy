import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaxReportService, WHTReport } from '../../../services/tax-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-withholding-tax-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './withholding-tax-report.component.html',
  styleUrl: './withholding-tax-report.component.scss'
})
export class WithholdingTaxReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;

  summary: any = {
    totalTransactions: 0,
    taxableAmount: 0,
    whtAmount: 0,
    netAmount: 0
  };

  constructor(
    private taxReportService: TaxReportService,
    private printPreviewService: PrintPreviewService
  ) {
    const today = new Date();
    this.endDate = today;
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    if (!this.startDate || !this.endDate) {
      this.loading = false;
      return;
    }

    const startDateStr = this.startDate.toISOString().split('T')[0];
    const endDateStr = this.endDate.toISOString().split('T')[0];

    this.taxReportService.getWHTReport(startDateStr, endDateStr).subscribe({
      next: (response) => {
        const data: any = response.data;
        this.reportData = data.transactions || [];

        // Map service summary properties to template expectations
        const serviceSummary = data.summary || {
          totalTransactions: 0,
          totalTaxableAmount: 0,
          totalWHTAmount: 0,
          totalNetAmount: 0
        };

        this.summary = {
          totalTransactions: serviceSummary.totalTransactions,
          taxableAmount: serviceSummary.totalTaxableAmount,
          whtAmount: serviceSummary.totalWHTAmount,
          netAmount: serviceSummary.totalNetAmount
        };
        this.loading = false;
      },
      error: () => {
        this.reportData = [];
        this.loading = false;
      }
    });
  }

  calculateSummary(): void {
    // Summary is now provided by the backend
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    const today = new Date();
    this.endDate = today;
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.loadReport();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }

  formatPercent(value: number): string {
    return (value || 0).toFixed(2) + '%';
  }

  // Export functionality
  get exportData(): any[] {
    return this.reportData.map(item => ({
      'Transaction No': item.transactionNumber || '',
      'Date': item.date ? new Date(item.date).toLocaleDateString() : '',
      'Party': item.partyName || '',
      'Taxable Amount': this.formatCurrency(item.taxableAmount || 0),
      'WHT Rate': this.formatPercent(item.whtRate || 0),
      'WHT Amount': this.formatCurrency(item.whtAmount || 0),
      'Net Amount': this.formatCurrency(item.netAmount || 0)
    }));
  }

  get exportColumns(): string[] {
    return ['Transaction No', 'Date', 'Party', 'Taxable Amount', 'WHT Rate', 'WHT Amount', 'Net Amount'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('wht-report-content', 'Withholding Tax Report');
  }
}
