import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import {
  DashboardAlert,
  DashboardGranularity,
  DashboardOverview,
  DashboardOverviewService,
  DashboardPeriod,
  LowStockItem,
} from '../services/dashboard-overview.service';

Chart.register(...registerables);

interface PeriodOption {
  label: string;
  value: DashboardPeriod;
}

interface DashboardCardView {
  label: string;
  value: number;
  icon: string;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'danger';
  route: string;
  delta?: number | null;
  meta?: string;
}

interface HeroHighlightView {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'danger';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  readonly periodOptions: PeriodOption[] = [
    { label: 'Today', value: 'today' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'MTD', value: 'mtd' },
    { label: 'QTD', value: 'qtd' },
    { label: 'YTD', value: 'ytd' },
  ];

  selectedPeriod: DashboardPeriod = 'mtd';
  overview: DashboardOverview | null = null;
  loading = true;
  refreshing = false;
  error: string | null = null;

  salesTrendData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Net Sales',
        data: [],
        borderColor: '#7367F0',
        backgroundColor: 'rgba(115, 103, 240, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  salesTrendOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Sales: ${this.formatCurrency(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6E6B7B' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(115, 103, 240, 0.08)' },
        ticks: {
          color: '#6E6B7B',
          callback: (value) => this.formatCompactCurrency(Number(value)),
        },
      },
    },
  };

  cashFlowData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Receipts',
        data: [],
        backgroundColor: 'rgba(40, 199, 111, 0.86)',
        borderRadius: 8,
        maxBarThickness: 24,
      },
      {
        label: 'Payments',
        data: [],
        backgroundColor: 'rgba(234, 84, 85, 0.76)',
        borderRadius: 8,
        maxBarThickness: 24,
      },
    ],
  };

  cashFlowOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#6E6B7B',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6E6B7B' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(115, 103, 240, 0.08)' },
        ticks: {
          color: '#6E6B7B',
          callback: (value) => this.formatCompactCurrency(Number(value)),
        },
      },
    },
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dashboardOverviewService: DashboardOverviewService,
  ) {
    const user = this.authService.currentUserValue;
    if (user && (user.role === 'sales' || user.role === 'salesman')) {
      this.router.navigate(['/salesman/pos']);
    }
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user && (user.role === 'sales' || user.role === 'salesman')) {
      return;
    }

    this.loadOverview();
  }

  get granularityLabel(): string {
    if (!this.overview) {
      return 'daily';
    }

    const labels: Record<DashboardGranularity, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
    };

    return labels[this.overview.scope.granularity];
  }

  get selectedPeriodLabel(): string {
    return this.periodOptions.find((option) => option.value === this.selectedPeriod)?.label || this.selectedPeriod;
  }

  get heroHighlights(): HeroHighlightView[] {
    if (!this.overview) {
      return [];
    }

    const { summary, finance } = this.overview;

    return [
      {
        label: 'Net Sales',
        value: this.formatCompactCurrency(summary.netSales.value),
        hint: `${summary.netSales.meta?.['invoiceCount'] || 0} confirmed invoices`,
        icon: 'monitoring',
        tone: 'primary',
      },
      {
        label: 'Collections',
        value: this.formatCompactCurrency(summary.collections.value),
        hint: `${summary.collections.meta?.['receiptCount'] || 0} cleared receipts`,
        icon: 'payments',
        tone: 'success',
      },
      {
        label: 'Low Stock',
        value: this.formatNumber(summary.inventoryValue.lowStockCount || 0),
        hint: 'items below safe level',
        icon: 'inventory_2',
        tone: 'warning',
      },
      {
        label: 'Receivables',
        value: this.formatCompactCurrency(summary.receivablesDue.value),
        hint: `${summary.receivablesDue.count} overdue invoices`,
        icon: 'account_balance_wallet',
        tone: finance.pdc.overdue > 0 ? 'danger' : 'info',
      },
    ];
  }

  get summaryCards(): DashboardCardView[] {
    if (!this.overview) {
      return [];
    }

    const { summary } = this.overview;

    return [
      {
        label: 'Net Sales',
        value: summary.netSales.value,
        icon: 'monitoring',
        tone: 'primary',
        route: summary.netSales.route,
        delta: summary.netSales.deltaPercent,
        meta: `${summary.netSales.meta?.['invoiceCount'] || 0} invoices`,
      },
      {
        label: 'Gross Margin',
        value: summary.grossMargin.value,
        icon: 'insights',
        tone: 'success',
        route: summary.grossMargin.route,
        delta: summary.grossMargin.deltaPercent,
        meta: `${this.formatPercent(summary.grossMargin.meta?.['marginPercent'] || 0)} margin`,
      },
      {
        label: 'Collections',
        value: summary.collections.value,
        icon: 'payments',
        tone: 'info',
        route: summary.collections.route,
        delta: summary.collections.deltaPercent,
        meta: `${summary.collections.meta?.['receiptCount'] || 0} receipts`,
      },
      {
        label: 'Receivables Due',
        value: summary.receivablesDue.value,
        icon: 'account_balance_wallet',
        tone: 'warning',
        route: summary.receivablesDue.route,
        meta: `${summary.receivablesDue.count} overdue invoices`,
      },
      {
        label: 'Payables Due',
        value: summary.payablesDue.value,
        icon: 'receipt_long',
        tone: 'danger',
        route: summary.payablesDue.route,
        meta: `${summary.payablesDue.count} supplier dues`,
      },
      {
        label: 'Cash + Bank',
        value: summary.cashBank.value,
        icon: 'account_balance',
        tone: 'info',
        route: summary.cashBank.route,
        meta: `${summary.cashBank.count || 0} accounts`,
      },
      {
        label: 'Inventory Value',
        value: summary.inventoryValue.value,
        icon: 'inventory_2',
        tone: 'success',
        route: summary.inventoryValue.route,
        meta: `${summary.inventoryValue.totalItems || 0} items, ${summary.inventoryValue.lowStockCount || 0} low`,
      },
      {
        label: 'Expiry Exposure',
        value: summary.expiryExposure.value,
        icon: 'schedule',
        tone: 'warning',
        route: summary.expiryExposure.route,
        meta: `${summary.expiryExposure.count || 0} active batch alerts`,
      },
    ];
  }

  loadOverview(refresh = false): void {
    this.error = null;

    if (this.overview && !refresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.dashboardOverviewService
      .getOverview({
        period: this.selectedPeriod,
        refresh,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.overview = response.data;
          this.updateCharts();
        },
        error: (error) => {
          this.error = error?.error?.message || 'Failed to load the dashboard overview.';
        },
      });
  }

  onPeriodChange(period: DashboardPeriod): void {
    if (this.selectedPeriod === period) {
      return;
    }

    this.selectedPeriod = period;
    this.loadOverview();
  }

  refreshOverview(): void {
    this.loadOverview(true);
  }

  updateCharts(): void {
    if (!this.overview) {
      return;
    }

    this.salesTrendData = {
      labels: this.overview.commercial.salesTrend.map((point) => point.label),
      datasets: [
        {
          label: 'Net Sales',
          data: this.overview.commercial.salesTrend.map((point) => point.revenue),
          borderColor: '#7367F0', // Brand Primary Purple
          backgroundColor: 'rgba(115, 103, 240, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#7367F0',
          borderWidth: 3,
        },
      ],
    };

    this.cashFlowData = {
      labels: this.overview.finance.cashFlowTrend.map((point) => point.label),
      datasets: [
        {
          label: 'Receipts',
          data: this.overview.finance.cashFlowTrend.map((point) => point.receipts),
          backgroundColor: '#28C76F', // Brand Success Green
          borderRadius: 4,
          maxBarThickness: 32,
        },
        {
          label: 'Payments',
          data: this.overview.finance.cashFlowTrend.map((point) => point.payments),
          backgroundColor: '#EA5455', // Brand Danger Red
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackAlert(_index: number, alert: DashboardAlert): string {
    return alert.id;
  }

  trackLowStock(_index: number, item: LowStockItem): string {
    return `${item.itemId || item.code}-${item.warehouseName}`;
  }

  alertIcon(severity: DashboardAlert['severity']): string {
    if (severity === 'critical') {
      return 'error';
    }

    if (severity === 'warning') {
      return 'warning';
    }

    return 'info';
  }

  toneClass(delta?: number | null): string {
    if (delta === undefined || delta === null) {
      return 'neutral';
    }

    if (delta > 0) {
      return 'positive';
    }

    if (delta < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  stockFillPercent(item: LowStockItem): number {
    if (!item.reorderLevel) {
      return 0;
    }

    return Math.max(0, Math.min(100, (item.currentStock / item.reorderLevel) * 100));
  }

  formatAlertValue(alert: DashboardAlert): string {
    if (alert.id.startsWith('low-stock')) {
      return `${this.formatNumber(alert.value)} units`;
    }

    if (alert.id === 'pending-po') {
      return this.formatNumber(alert.value);
    }

    return this.formatCompactCurrency(alert.value);
  }

  formatCurrency(value: number): string {
    return `Rs. ${new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)}`;
  }

  formatCompactCurrency(value: number): string {
    return `Rs. ${new Intl.NumberFormat('en-PK', {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value || 0)}`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }

  formatPercent(value: number): string {
    return `${(value || 0).toFixed(1)}%`;
  }

  formatChange(delta?: number | null): string {
    if (delta === undefined || delta === null) {
      return 'Live snapshot';
    }

    const prefix = delta > 0 ? '+' : '';
    return `${prefix}${delta.toFixed(1)}% vs previous`;
  }
}
