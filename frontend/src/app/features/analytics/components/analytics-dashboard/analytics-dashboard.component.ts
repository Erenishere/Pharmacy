import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Router } from '@angular/router';

import {
  AnalyticsService,
  SalesAnalytics,
  InventoryAnalytics,
  OperationalAnalytics,
  BusinessIntelligence,
  AnalyticsQueryParams
} from '../../services/analytics.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatGridListModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    BaseChartDirective
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent implements OnInit {
  loading = false;
  salesAnalytics: SalesAnalytics | null = null;
  inventoryAnalytics: InventoryAnalytics | null = null;
  operationalAnalytics: OperationalAnalytics | null = null;
  businessIntelligence: BusinessIntelligence | null = null;

  // Filters
  periodFilter = new FormControl<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);

  // Chart configurations
  public salesTrendChart: any = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Sales Revenue',
        data: [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => this.formatCurrency(value as number, true)
          }
        }
      }
    }
  };

  public productPerformanceChart: any = {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Revenue',
        data: [],
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: '#4CAF50',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => this.formatCurrency(value as number, true)
          }
        }
      }
    }
  };

  public inventoryStatusChart: any = {
    type: 'doughnut',
    data: {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  };

  public operationalEfficiencyChart: any = {
    type: 'radar',
    data: {
      labels: ['Order Processing', 'Fulfillment', 'Delivery', 'Customer Service', 'Quality Control'],
      datasets: [{
        label: 'Efficiency Score',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(156, 39, 176, 0.2)',
        borderColor: '#9C27B0',
        borderWidth: 2,
        pointBackgroundColor: '#9C27B0'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  };

  constructor(
    private analyticsService: AnalyticsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadAnalyticsData();
  }

  setDefaultDateRange(): void {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.startDate.setValue(startOfMonth);
    this.endDate.setValue(now);
  }

  loadAnalyticsData(): void {
    this.loading = true;

    const params: AnalyticsQueryParams = {
      period: this.periodFilter.value || 'monthly'
    };

    if (this.startDate.value) {
      params.startDate = this.startDate.value.toISOString();
    }

    if (this.endDate.value) {
      params.endDate = this.endDate.value.toISOString();
    }

    // Load all analytics data in parallel
    Promise.all([
      this.loadSalesAnalytics(params),
      this.loadInventoryAnalytics(params),
      this.loadOperationalAnalytics(params),
      this.loadBusinessIntelligence(params)
    ]).finally(() => {
      this.loading = false;
      this.updateCharts();
    });
  }

  private async loadSalesAnalytics(params: AnalyticsQueryParams): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getSalesAnalytics(params).subscribe({
        next: (response) => {
          this.salesAnalytics = response.data;
          resolve();
        },
        error: (error) => {
          console.error('Error loading sales analytics:', error);
          resolve();
        }
      });
    });
  }

  private async loadInventoryAnalytics(params: AnalyticsQueryParams): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getInventoryAnalytics(params).subscribe({
        next: (response) => {
          this.inventoryAnalytics = response.data;
          resolve();
        },
        error: (error) => {
          console.error('Error loading inventory analytics:', error);
          resolve();
        }
      });
    });
  }

  private async loadOperationalAnalytics(params: AnalyticsQueryParams): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getOperationalAnalytics(params).subscribe({
        next: (response) => {
          this.operationalAnalytics = response.data;
          resolve();
        },
        error: (error) => {
          console.error('Error loading operational analytics:', error);
          resolve();
        }
      });
    });
  }

  private async loadBusinessIntelligence(params: AnalyticsQueryParams): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getBusinessIntelligence(params).subscribe({
        next: (response) => {
          this.businessIntelligence = response.data;
          resolve();
        },
        error: (error) => {
          console.error('Error loading business intelligence:', error);
          resolve();
        }
      });
    });
  }

  updateCharts(): void {
    if (this.salesAnalytics) {
      // Update sales trend chart
      this.salesTrendChart.data.labels = this.salesAnalytics.salesByPeriod.map(p => p.period);
      this.salesTrendChart.data.datasets[0].data = this.salesAnalytics.salesByPeriod.map(p => p.sales);

      // Update product performance chart
      const topProducts = this.salesAnalytics.topProducts.slice(0, 10);
      this.productPerformanceChart.data.labels = topProducts.map(p => p.itemName);
      this.productPerformanceChart.data.datasets[0].data = topProducts.map(p => p.revenue);
    }

    if (this.inventoryAnalytics) {
      // Update inventory status chart
      const totalItems = this.inventoryAnalytics.totalItems;
      const lowStock = this.inventoryAnalytics.lowStockItems;
      const outOfStock = this.inventoryAnalytics.outOfStockItems;
      const inStock = totalItems - lowStock - outOfStock;

      this.inventoryStatusChart.data.datasets[0].data = [inStock, lowStock, outOfStock];
    }

    if (this.operationalAnalytics) {
      // Update operational efficiency chart
      this.operationalEfficiencyChart.data.datasets[0].data = [
        this.operationalAnalytics.processEfficiency.find(p => p.processName === 'Order Processing')?.efficiency || 0,
        this.operationalAnalytics.processEfficiency.find(p => p.processName === 'Fulfillment')?.efficiency || 0,
        this.operationalAnalytics.processEfficiency.find(p => p.processName === 'Delivery')?.efficiency || 0,
        this.operationalAnalytics.customerSatisfaction,
        this.operationalAnalytics.qualityMetrics.productQualityScore
      ];
    }
  }

  onGenerateReport(): void {
    this.loadAnalyticsData();
  }

  onViewSalesAnalytics(): void {
    this.router.navigate(['/analytics/sales']);
  }

  onViewInventoryAnalytics(): void {
    this.router.navigate(['/analytics/inventory']);
  }

  onViewOperationalAnalytics(): void {
    this.router.navigate(['/analytics/operational']);
  }

  onViewDemandForecast(): void {
    this.router.navigate(['/analytics/demand-forecast']);
  }

  onExportDashboard(): void {
    if (!this.salesAnalytics || !this.inventoryAnalytics || !this.operationalAnalytics || !this.businessIntelligence) {
      this.snackBar.open('Generate analytics before exporting', 'Close', { duration: 3000 });
      return;
    }

    const rows = [
      ['Period', this.periodFilter.value || 'monthly'],
      ['Start Date', this.startDate.value?.toISOString() || ''],
      ['End Date', this.endDate.value?.toISOString() || ''],
      ['Total Sales', this.salesAnalytics.totalSales],
      ['Total Orders', this.salesAnalytics.totalOrders],
      ['Average Order Value', this.salesAnalytics.averageOrderValue],
      ['Inventory Items', this.inventoryAnalytics.totalItems],
      ['Low Stock Items', this.inventoryAnalytics.lowStockItems],
      ['Out Of Stock Items', this.inventoryAnalytics.outOfStockItems],
      ['Inventory Value', this.inventoryAnalytics.inventoryValue],
      ['Inventory Turnover Rate', this.inventoryAnalytics.turnoverRate],
      ['Fulfillment Time', this.operationalAnalytics.orderFulfillmentTime],
      ['Customer Satisfaction', this.operationalAnalytics.customerSatisfaction],
      ['Product Quality Score', this.operationalAnalytics.qualityMetrics.productQualityScore],
      ['Revenue KPI', this.businessIntelligence.kpiDashboard.revenue.current],
      ['Profit KPI', this.businessIntelligence.kpiDashboard.profit.current],
      ['Customer KPI', this.businessIntelligence.kpiDashboard.customers.current],
      ['Order KPI', this.businessIntelligence.kpiDashboard.orders.current]
    ];

    const csv = ['Metric,Value', ...rows.map(([metric, value]) => `${this.escapeCsv(String(metric))},${this.escapeCsv(String(value))}`)].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.snackBar.open('Analytics dashboard exported', 'Close', { duration: 3000 });
  }

  formatCurrency(amount: number, compact: boolean = false): string {
    if (compact) {
      if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
      } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
      }
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatPercentage(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  getKPITrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getKPIStatusColor(status: 'excellent' | 'good' | 'average' | 'poor'): string {
    switch (status) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#2196F3';
      case 'average': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#666';
    }
  }

  getKPITrendColor(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      default: return '#FF9800';
    }
  }

  getFulfillmentTargetTime(): string {
    if (!this.operationalAnalytics?.processEfficiency) {
      return 'N/A';
    }
    const fulfillment = this.operationalAnalytics.processEfficiency.find(p => p.processName === 'Fulfillment');
    return fulfillment?.targetTime?.toString() || 'N/A';
  }
}
