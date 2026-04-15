import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryReportService } from '../../../services/inventory-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-slow-moving-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './slow-moving-report.component.html',
  styleUrl: './slow-moving-report.component.scss'
})
export class SlowMovingReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  daysFilter = 90;

  summary: any = {
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    avgDaysSinceMovement: 0
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

    this.inventoryReportService.getSlowMovingReport(this.daysFilter).subscribe({
      next: (response) => {
        const data: any = response.data;
        // Map items to include stockValue (alias for totalValue)
        this.reportData = (data.items || []).map((item: any) => ({
          ...item,
          stockValue: item.totalValue
        }));

        this.summary = {
          totalItems: data.summary?.totalItems || 0,
          totalValue: data.summary?.totalValue || 0,
          // Calculate missing fields if needed
          totalQuantity: this.reportData.reduce((sum: number, item: any) => sum + (item.currentStock || 0), 0),
          avgDaysSinceMovement: 0
        };

        if (this.reportData.length > 0) {
          this.summary.avgDaysSinceMovement = this.reportData.reduce((sum: number, item: any) => sum + (item.daysSinceLastMovement || 0), 0) / this.reportData.length;
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
      totalQuantity: this.reportData.reduce((sum, item) => sum + (item.currentStock || 0), 0),
      totalValue: this.reportData.reduce((sum, item) => sum + (item.stockValue || 0), 0),
      avgDaysSinceMovement: 0
    };
    if (this.reportData.length > 0) {
      this.summary.avgDaysSinceMovement = this.reportData.reduce((sum, item) => sum + (item.daysSinceLastMovement || 0), 0) / this.reportData.length;
    }
  }

  getSeverityClass(days: number): string {
    if (days >= 180) return 'severity-critical';
    if (days >= 120) return 'severity-high';
    if (days >= 90) return 'severity-medium';
    return 'severity-low';
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
      'Current Stock': item.currentStock || 0,
      'Days Since Movement': item.daysSinceLastMovement || 0,
      'Last Movement Date': item.lastMovementDate ? new Date(item.lastMovementDate).toLocaleDateString() : '',
      'Stock Value': this.formatCurrency(item.stockValue || 0)
    }));
  }

  get exportColumns(): string[] {
    return ['Item Code', 'Item Name', 'Current Stock', 'Days Since Movement', 'Last Movement Date', 'Stock Value'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('slow-moving-content', 'Slow Moving Items Report');
  }
}
