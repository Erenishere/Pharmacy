import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryReportService } from '../../../services/inventory-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-stock-valuation-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './stock-valuation-report.component.html',
  styleUrl: './stock-valuation-report.component.scss'
})
export class StockValuationReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  valuationMethod = 'FIFO';
  asOfDate: Date | null = new Date();

  summary: any = {
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    avgUnitCost: 0
  };

  constructor(
    private inventoryReportService: InventoryReportService,
    private printPreviewService: PrintPreviewService
  ) { }

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    const asOfDateStr = this.asOfDate ? this.asOfDate.toISOString().split('T')[0] : undefined;

    this.inventoryReportService.getStockValuationReport(asOfDateStr, this.valuationMethod).subscribe({
      next: (response) => {
        const data: any = response.data;
        this.reportData = data.items || [];
        this.summary = {
          totalItems: data.summary?.totalItems || 0,
          totalQuantity: data.summary?.totalQuantity || 0,
          totalValue: data.summary?.totalValue || 0,
          avgUnitCost: 0
        };

        if (this.summary.totalQuantity > 0) {
          this.summary.avgUnitCost = this.summary.totalValue / this.summary.totalQuantity;
        }

        this.loading = false;
      },
      error: () => {
        this.reportData = [];
        this.loading = false;
      }
    });
  }

  calculateSummary(): void {
    this.summary = {
      totalItems: this.reportData.length,
      totalQuantity: this.reportData.reduce((sum, item) => sum + (item.quantity || 0), 0),
      totalValue: this.reportData.reduce((sum, item) => sum + (item.totalValue || 0), 0),
      avgUnitCost: 0
    };
    if (this.summary.totalQuantity > 0) {
      this.summary.avgUnitCost = this.summary.totalValue / this.summary.totalQuantity;
    }
  }

  applyFilters(): void {
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
    return this.reportData.map(item => ({
      'Item Code': item.itemCode || '',
      'Item Name': item.itemName || '',
      'Quantity': item.quantity || 0,
      'Unit Cost': this.formatCurrency(item.unitCost || 0),
      'Total Value': this.formatCurrency(item.totalValue || 0),
      'Valuation Method': this.valuationMethod
    }));
  }

  get exportColumns(): string[] {
    return ['Item Code', 'Item Name', 'Quantity', 'Unit Cost', 'Total Value', 'Valuation Method'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('valuation-report-content', 'Stock Valuation Report');
  }
}
