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
  selector: 'app-stock-level-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './stock-level-report.component.html',
  styleUrl: './stock-level-report.component.scss'
})
export class StockLevelReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  warehouseFilter = '';
  statusFilter = '';

  summary: any = {
    totalItems: 0,
    totalStock: 0,
    totalValue: 0,
    lowStockCount: 0
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
    const params: any = {};
    if (this.warehouseFilter) params.warehouseId = this.warehouseFilter;
    if (this.statusFilter) params.status = this.statusFilter;

    this.inventoryReportService.getStockLevelReport(params).subscribe({
      next: (response) => {
        const data: any = response.data;
        // Map items to include stockValue
        this.reportData = (data.items || []).map((item: any) => ({
          ...item,
          stockValue: item.totalValue
        }));

        this.summary = data.summary || {
          totalItems: 0,
          totalStock: 0,
          totalValue: 0,
          lowStockCount: 0
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
    this.summary = {
      totalItems: this.reportData.length,
      totalStock: this.reportData.reduce((sum, item) => sum + (item.currentStock || 0), 0),
      totalValue: this.reportData.reduce((sum, item) => sum + (item.stockValue || 0), 0),
      lowStockCount: this.reportData.filter(item => item.status === 'Low Stock').length
    };
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.warehouseFilter = '';
    this.statusFilter = '';
    this.loadReport();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'In Stock': return 'status-success';
      case 'Low Stock': return 'status-warning';
      case 'Out of Stock': return 'status-danger';
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
      'Item Code': item.itemCode || '',
      'Item Name': item.itemName || '',
      'Warehouse': item.warehouseName || '',
      'Current Stock': item.currentStock || 0,
      'Reorder Level': item.reorderLevel || 0,
      'Stock Value': this.formatCurrency(item.stockValue || 0),
      'Status': item.status || ''
    }));
  }

  get exportColumns(): string[] {
    return ['Item Code', 'Item Name', 'Warehouse', 'Current Stock', 'Reorder Level', 'Stock Value', 'Status'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('stock-report-content', 'Stock Level Report');
  }
}
