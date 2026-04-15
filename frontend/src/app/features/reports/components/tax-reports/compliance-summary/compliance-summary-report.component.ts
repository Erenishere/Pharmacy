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
import { TaxReportService, TaxComplianceSummary } from '../../../services/tax-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-compliance-summary-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './compliance-summary-report.component.html',
  styleUrl: './compliance-summary-report.component.scss'
})
export class ComplianceSummaryReportComponent implements OnInit {
  loading = false;
  reportData: TaxComplianceSummary | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;

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

    this.taxReportService.getTaxComplianceSummary(startDateStr, endDateStr).subscribe({
      next: (response) => {
        this.reportData = response.data || null;
        this.loading = false;
      },
      error: () => {
        this.reportData = null;
        this.loading = false;
      }
    });
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

  // Export functionality
  get exportData(): any[] {
    if (!this.reportData) return [];

    return [
      { 'Category': 'GST Sales', 'Count': this.reportData.gstSales?.totalInvoices || 0, 'Amount': this.formatCurrency(this.reportData.gstSales?.totalAmount || 0) },
      { 'Category': 'GST Purchases', 'Count': this.reportData.gstPurchases?.totalInvoices || 0, 'Amount': this.formatCurrency(this.reportData.gstPurchases?.totalAmount || 0) },
      { 'Category': 'Withholding Tax', 'Count': this.reportData.withholdingTax?.totalTransactions || 0, 'Amount': this.formatCurrency(this.reportData.withholdingTax?.totalWHTAmount || 0) },
      { 'Category': 'Net GST Payable', 'Count': '-', 'Amount': this.formatCurrency(this.reportData.netGSTPayable || 0) }
    ];
  }

  get exportColumns(): string[] {
    return ['Category', 'Count', 'Amount'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('compliance-summary-content', 'Tax Compliance Summary');
  }
}
