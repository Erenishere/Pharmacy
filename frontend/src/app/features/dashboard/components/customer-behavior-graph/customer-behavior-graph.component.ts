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

export interface CustomerBehaviorData {
  month: string;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  churnRate: number;
}

export interface FilterOptions {
  period?: string;
  customerSegment?: string;
  channel?: string;
}

@Component({
  selector: 'app-customer-behavior-graph',
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
  templateUrl: './customer-behavior-graph.component.html',
  styleUrls: ['./customer-behavior-graph.component.scss']
})
export class CustomerBehaviorGraphComponent implements OnInit {
  @Input() data: CustomerBehaviorData[] = [];
  @Input() filters: FilterOptions = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() filterChange = new EventEmitter<FilterOptions>();
  @Output() drillDown = new EventEmitter<{ data: CustomerBehaviorData; type: string }>();

  public chartType: 'bar' = 'bar';
  public chartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  
  public chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Customer Behavior Analytics'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('Value') || label.includes('Lifetime')) {
              return `${label}: ${this.formatCurrency(value)}`;
            } else if (label.includes('Rate')) {
              return `${label}: ${value}%`;
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
          text: 'Customer Metrics'
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
        const clickedData = this.data[dataIndex];
        
        if (clickedData) {
          this.onDrillDown(clickedData, 'customer');
        }
      }
    }
  };

  selectedPeriod = '30d';
  selectedSegment = 'all';
  selectedChannel = 'all';

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
          label: 'New Customers',
          data: this.data.map(item => item.newCustomers),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1
        },
        {
          label: 'Returning Customers',
          data: this.data.map(item => item.returningCustomers),
          backgroundColor: '#10b981',
          borderColor: '#059669',
          borderWidth: 1
        },
        {
          label: 'Average Order Value',
          data: this.data.map(item => item.averageOrderValue),
          backgroundColor: '#f59e0b',
          borderColor: '#d97706',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Customer Lifetime Value',
          data: this.data.map(item => item.customerLifetimeValue),
          backgroundColor: '#8b5cf6',
          borderColor: '#7c3aed',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Churn Rate (%)',
          data: this.data.map(item => item.churnRate),
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1
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
          text: 'Customer Metrics'
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
          text: 'Value (PKR)'
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

  onSegmentChange(segment: string): void {
    this.selectedSegment = segment;
    this.filterChange.emit({
      ...this.filters,
      customerSegment: segment
    });
  }

  onChannelChange(channel: string): void {
    this.selectedChannel = channel;
    this.filterChange.emit({
      ...this.filters,
      channel
    });
  }

  onDrillDown(data: CustomerBehaviorData, type: string): void {
    this.drillDown.emit({ data, type });
  }

  onRefresh(): void {
    this.filterChange.emit({
      ...this.filters,
      period: this.selectedPeriod,
      customerSegment: this.selectedSegment,
      channel: this.selectedChannel
    });
  }

  onDownload(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-behavior-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['Month', 'New Customers', 'Returning Customers', 'Average Order Value (PKR)', 'Customer Lifetime Value (PKR)', 'Churn Rate (%)'];
    const rows = this.data.map(item => [
      item.month,
      item.newCustomers.toString(),
      item.returningCustomers.toString(),
      item.averageOrderValue.toString(),
      item.customerLifetimeValue.toString(),
      item.churnRate.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}