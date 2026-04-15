import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DrillDownDialogComponent } from '../drill-down-dialog/drill-down-dialog.component';

export interface SalesTrendData {
  date: string;
  totalSales: number;
  averageOrderValue: number;
  totalInvoices: number;
  totalQuantity: number;
}

export interface FilterOptions {
  period?: string;
  granularity?: string;
  refresh?: boolean;
}

@Component({
  selector: 'app-sales-trend-graph',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    BaseChartDirective
  ],
  templateUrl: './sales-trend-graph.component.html',
  styleUrls: ['./sales-trend-graph.component.scss']
})
export class SalesTrendGraphComponent implements OnInit {
  @Input() data: SalesTrendData[] = [];
  @Input() filters: FilterOptions = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() filterChange = new EventEmitter<FilterOptions>();

  selectedPeriod = '30d';
  selectedGranularity = 'daily';
  
  chartType: ChartType = 'line';
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const date = context[0].label;
            return `Sales Performance - ${date}`;
          },
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${this.formatCurrency(value)}`;
          },
          afterBody: () => 'Click for detailed view'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value) => this.formatCurrency(Number(value)),
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const dataPoint = this.data[element.index];
        this.openDrillDown(dataPoint);
      }
    }
  };

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.updateChartData();
  }

  ngOnChanges(): void {
    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.data || this.data.length === 0) return;

    this.chartData = {
      labels: this.data.map(item => this.formatDate(item.date)),
      datasets: [
        {
          label: 'Total Sales',
          data: this.data.map(item => item.totalSales),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        },
        {
          label: 'Average Order Value',
          data: this.data.map(item => item.averageOrderValue),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }
      ]
    };
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.filterChange.emit({ period });
  }

  onGranularityChange(granularity: string): void {
    this.selectedGranularity = granularity;
    this.filterChange.emit({ granularity });
  }

  onRefresh(): void {
    this.filterChange.emit({ refresh: true });
  }

  onDownload(): void {
    // Implement download functionality
    const csvData = this.convertToCSV(this.data);
    this.downloadFile(csvData, 'sales-trend-data.csv', 'text/csv');
  }

  private openDrillDown(dataPoint: SalesTrendData): void {
    const dialogRef = this.dialog.open(DrillDownDialogComponent, {
      width: '600px',
      data: {
        title: `Detailed View - ${this.formatDate(dataPoint.date)}`,
        data: [
          { label: 'Total Sales', value: this.formatCurrency(dataPoint.totalSales) },
          { label: 'Total Orders', value: dataPoint.totalInvoices.toString() },
          { label: 'Average Order Value', value: this.formatCurrency(dataPoint.averageOrderValue) },
          { label: 'Total Quantity', value: dataPoint.totalQuantity.toString() }
        ]
      }
    });
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private convertToCSV(data: SalesTrendData[]): string {
    const headers = ['Date', 'Total Sales', 'Average Order Value', 'Total Orders', 'Total Quantity'];
    const rows = data.map(item => [
      this.formatDate(item.date),
      item.totalSales.toString(),
      item.averageOrderValue.toString(),
      item.totalInvoices.toString(),
      item.totalQuantity.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private downloadFile(data: string, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  get totalSales(): number {
    return this.data.reduce((sum, item) => sum + item.totalSales, 0);
  }

  get averageOrderValue(): number {
    return this.data.length > 0 ? this.data.reduce((sum, item) => sum + item.averageOrderValue, 0) / this.data.length : 0;
  }

  get totalOrders(): number {
    return this.data.reduce((sum, item) => sum + item.totalInvoices, 0);
  }
}