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
  selector: 'app-batch-expiry-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './batch-expiry-report.component.html',
  styleUrl: './batch-expiry-report.component.scss'
})
export class BatchExpiryReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  daysAhead = 90;

  summary: any = {
    totalBatches: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    totalValue: 0
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

    this.inventoryReportService.getBatchExpiryReport(this.daysAhead).subscribe({
      next: (response) => {
        const data: any = response.data;
        this.reportData = data.batches || [];

        // Use backend-provided summary
        this.summary = {
          totalBatches: data.summary?.totalBatches || 0,
          expiredCount: data.summary?.expiredCount || 0,
          expiringSoonCount: data.summary?.expiringCount || 0,
          totalValue: 0 // Backend doesn't provide this field
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
    const today = new Date();
    this.summary = {
      totalBatches: this.reportData.length,
      expiredCount: this.reportData.filter(b => new Date(b.expiryDate) < today).length,
      expiringSoonCount: this.reportData.filter(b => {
        const expiry = new Date(b.expiryDate);
        return expiry >= today && expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      }).length,
      totalValue: 0 // Backend doesn't provide batch value
    };
  }

  getExpiryStatus(expiryDate: string): string {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expiring Soon';
    return 'Safe';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Expired': return 'status-danger';
      case 'Expiring Soon': return 'status-warning';
      case 'Safe': return 'status-success';
      default: return '';
    }
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
      'Batch Number': item.batchNumber || '',
      'Item': item.itemName || '',
      'Expiry Date': item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '',
      'Quantity': item.quantity || 0,
      'Status': this.getExpiryStatus(item.expiryDate)
    }));
  }

  get exportColumns(): string[] {
    return ['Batch Number', 'Item', 'Expiry Date', 'Quantity', 'Status'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('batch-expiry-content', 'Batch Expiry Report');
  }
}
