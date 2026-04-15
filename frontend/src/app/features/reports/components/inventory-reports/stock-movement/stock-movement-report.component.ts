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
  selector: 'app-stock-movement-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './stock-movement-report.component.html',
  styleUrl: './stock-movement-report.component.scss'
})
export class StockMovementReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  movementTypeFilter = '';

  summary: any = {
    totalMovements: 0,
    totalIn: 0,
    totalOut: 0,
    netChange: 0
  };

  constructor(
    private inventoryReportService: InventoryReportService,
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
    const startDateStr = this.startDate ? this.startDate.toISOString().split('T')[0] : '';
    const endDateStr = this.endDate ? this.endDate.toISOString().split('T')[0] : '';
    const filters = this.movementTypeFilter ? { movementType: this.movementTypeFilter } : {};

    this.inventoryReportService.getStockMovementReport(startDateStr, endDateStr, filters).subscribe({
      next: (response) => {
        const data: any = response.data;
        // Map items to include movementType
        this.reportData = (data.movements || []).map((m: any) => ({
          ...m,
          movementType: m.type
        }));

        this.summary = {
          totalMovements: data.summary?.totalMovements || 0,
          totalIn: data.summary?.totalIn || 0,
          totalOut: data.summary?.totalOut || 0,
          netChange: (data.summary?.totalIn || 0) - (data.summary?.totalOut || 0)
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
      totalMovements: this.reportData.length,
      totalIn: this.reportData.filter(m => m.movementType === 'In').reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalOut: this.reportData.filter(m => m.movementType === 'Out').reduce((sum, m) => sum + (m.quantity || 0), 0),
      netChange: 0
    };
    this.summary.netChange = this.summary.totalIn - this.summary.totalOut;
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    const today = new Date();
    this.endDate = today;
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.movementTypeFilter = '';
    this.loadReport();
  }

  getMovementTypeClass(type: string): string {
    switch (type) {
      case 'In': return 'movement-in';
      case 'Out': return 'movement-out';
      case 'Transfer': return 'movement-transfer';
      case 'Adjustment': return 'movement-adjustment';
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

  get exportData(): any[] {
    return this.reportData.map(item => ({
      'Date': item.date ? new Date(item.date).toLocaleDateString() : '',
      'Item': item.itemName || '',
      'Movement Type': item.movementType || '',
      'Quantity': item.quantity || 0,
      'Warehouse': item.warehouseName || '',
      'Reference': item.reference || ''
    }));
  }

  get exportColumns(): string[] {
    return ['Date', 'Item', 'Movement Type', 'Quantity', 'Warehouse', 'Reference'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('movement-report-content', 'Stock Movement Report');
  }
}
