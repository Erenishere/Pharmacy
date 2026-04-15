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
import { TaxReportService, GSTSalesReport } from '../../../services/tax-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-gst-sales-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './gst-sales-report.component.html',
  styleUrl: './gst-sales-report.component.scss'
})
export class GSTSalesReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;

  summary: any = {
    totalInvoices: 0,
    taxableAmount: 0,
    gstAmount: 0,
    totalAmount: 0
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

    this.taxReportService.getGSTSalesReport(startDateStr, endDateStr).subscribe({
      next: (response) => {
        const data: any = response.data;
        this.reportData = data.sales || [];

        // Map service summary properties to template expectations
        const serviceSummary = data.summary || {
          totalInvoices: 0,
          totalTaxableAmount: 0,
          totalGSTAmount: 0,
          totalAmount: 0
        };

        this.summary = {
          totalInvoices: serviceSummary.totalInvoices,
          taxableAmount: serviceSummary.totalTaxableAmount,
          gstAmount: serviceSummary.totalGSTAmount,
          totalAmount: serviceSummary.totalAmount
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
      'Invoice No': item.invoiceNumber || '',
      'Date': item.date ? new Date(item.date).toLocaleDateString() : '',
      'Customer': item.customerName || '',
      'Taxable Amount': this.formatCurrency(item.taxableAmount || 0),
      'GST Rate': this.formatPercent(item.gstRate || 0),
      'GST Amount': this.formatCurrency(item.gstAmount || 0),
      'Total Amount': this.formatCurrency(item.totalAmount || 0)
    }));
  }

  get exportColumns(): string[] {
    return ['Invoice No', 'Date', 'Customer', 'Taxable Amount', 'GST Rate', 'GST Amount', 'Total Amount'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('gst-sales-content', 'GST Sales Report');
  }
}
