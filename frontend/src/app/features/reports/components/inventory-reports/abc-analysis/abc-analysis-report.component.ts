import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryReportService, ABCAnalysisReport } from '../../../services/inventory-report.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-abc-analysis-report',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './abc-analysis-report.component.html',
  styleUrl: './abc-analysis-report.component.scss'
})
export class ABCAnalysisReportComponent implements OnInit {
  loading = false;
  reportData: any[] = [];

  summary = {
    categoryA: 0,
    categoryB: 0,
    categoryC: 0,
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
    this.inventoryReportService.getABCAnalysisReport().subscribe({
      next: (response) => {
        if (response.data && response.data.items) {
          this.reportData = response.data.items;
          
          // Use backend-provided summary
          if (response.data.summary) {
            this.summary = {
              categoryA: response.data.summary.classA.count,
              categoryB: response.data.summary.classB.count,
              categoryC: response.data.summary.classC.count,
              totalValue: response.data.summary.classA.value + 
                         response.data.summary.classB.value + 
                         response.data.summary.classC.value
            };
          }
        } else {
          this.reportData = [];
        }
        this.loading = false;
      },
      error: () => {
        this.reportData = [];
        this.loading = false;
      }
    });
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'A': return 'category-a';
      case 'B': return 'category-b';
      case 'C': return 'category-c';
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

  formatPercent(value: number): string {
    return (value || 0).toFixed(2) + '%';
  }

  // Export functionality
  get exportData(): any[] {
    return this.reportData.map(item => ({
      'Item Code': item.itemCode || '',
      'Item Name': item.itemName || '',
      'Annual Value': this.formatCurrency(item.annualValue || 0),
      'Category': item.category || '',
      'Value %': this.formatPercent(item.valuePercentage || 0),
      'Cumulative %': this.formatPercent(item.cumulativePercentage || 0)
    }));
  }

  get exportColumns(): string[] {
    return ['Item Code', 'Item Name', 'Annual Value', 'Category', 'Value %', 'Cumulative %'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('abc-analysis-content', 'ABC Analysis Report');
  }
}
