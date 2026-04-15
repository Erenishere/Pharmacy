import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartData, ChartType } from 'chart.js';

export interface InventoryPerformanceData {
  month: string;
  turnoverRate: number;
  stockValue: number;
  lowStockItems: number;
  overstockItems: number;
  optimalStock: number;
}

export interface FilterOptions {
  period?: string;
  category?: string;
  warehouse?: string;
}

@Component({
  selector: 'app-inventory-performance-graph',
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
    MatTooltipModule,
    BaseChartDirective
  ],
  templateUrl: './inventory-performance-graph.component.html',
  styleUrls: ['./inventory-performance-graph.component.scss']
})
export class InventoryPerformanceGraphComponent implements OnInit {
  @Input() data: InventoryPerformanceData[] = [];
  @Input() filters: FilterOptions = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() filterChange = new EventEmitter<FilterOptions>();
  @Output() drillDown = new EventEmitter<{ data: InventoryPerformanceData; type: string }>();

  public chartType: 'line' = 'line';
  public chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  
  public chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inventory Performance Metrics'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('Rate')) {
              return `${label}: ${value}%`;
            } else if (label.includes('Value')) {
              return `${label}: ${this.formatCurrency(value)}`;
            } else {
              return `${label}: ${value}`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Performance Metrics'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time Period'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const dataIndex = element.index;
        const datasetIndex = element.datasetIndex;
        const clickedData = this.data[dataIndex];
        
        if (clickedData) {
          this.onDrillDown(clickedData, 'inventory');
        }
      }
    }
  };

  selectedPeriod = '30d';
  selectedCategory = 'all';
  selectedWarehouse = 'all';

  ngOnInit(): void {
    this.updateChartData();
  }

  ngOnChanges(): void {
    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.data || this.data.length === 0) return;

    this.chartData = {
      labels: this.data.map(item => item.month),
      datasets: [
        {
          label: 'Turnover Rate (%)',
          data: this.data.map(item => item.turnoverRate),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Stock Value',
          data: this.data.map(item => item.stockValue),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        },
        {
          label: 'Low Stock Items',
          data: this.data.map(item => item.lowStockItems),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Overstock Items',
          data: this.data.map(item => item.overstockItems),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    // Create new chart options with proper typing
    const newScales: any = {
      ...this.chartOptions.scales,
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Performance Metrics'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Stock Value (PKR)'
        }
      }
    };

    this.chartOptions = {
      ...this.chartOptions,
      scales: newScales
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.filterChange.emit({
      ...this.filters,
      period
    });
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterChange.emit({
      ...this.filters,
      category
    });
  }

  onWarehouseChange(warehouse: string): void {
    this.selectedWarehouse = warehouse;
    this.filterChange.emit({
      ...this.filters,
      warehouse
    });
  }

  onDrillDown(data: InventoryPerformanceData, type: string): void {
    this.drillDown.emit({ data, type });
  }

  onRefresh(): void {
    this.filterChange.emit({
      ...this.filters,
      period: this.selectedPeriod,
      category: this.selectedCategory,
      warehouse: this.selectedWarehouse
    });
  }

  onDownload(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['Month', 'Turnover Rate (%)', 'Stock Value (PKR)', 'Low Stock Items', 'Overstock Items', 'Optimal Stock'];
    const rows = this.data.map(item => [
      item.month,
      item.turnoverRate.toString(),
      item.stockValue.toString(),
      item.lowStockItems.toString(),
      item.overstockItems.toString(),
      item.optimalStock.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}