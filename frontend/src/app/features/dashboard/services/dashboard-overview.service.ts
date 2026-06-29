import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'mtd' | 'qtd' | 'ytd' | 'custom';
export type DashboardGranularity = 'daily' | 'weekly' | 'monthly';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface MetricValue<TMeta extends Record<string, number> = Record<string, number>> {
  value: number;
  previousValue: number;
  deltaPercent: number;
  route: string;
  meta?: TMeta;
}

export interface DueMetric {
  value: number;
  count: number;
  route: string;
}

export interface SnapshotMetric {
  value: number;
  route: string;
  count?: number;
  quantity?: number;
  totalItems?: number;
  lowStockCount?: number;
}

export interface DashboardScope {
  period: DashboardPeriod;
  startDate: string;
  endDate: string;
  granularity: DashboardGranularity;
  warehouseId: string | null;
  salesmanId: string | null;
}

export interface DashboardTrendPoint {
  label: string;
  revenue: number;
  invoices: number;
  averageInvoiceValue: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  value: number;
  route: string;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  code: string;
  revenue: number;
  invoiceCount: number;
  averageOrderValue: number;
  overdueExposure: number;
  route: string;
}

export interface TopItem {
  itemId: string;
  name: string;
  code: string;
  quantity: number;
  revenue: number;
  route: string;
}

export interface SalesmanPerformance {
  salesmanId: string;
  name: string;
  code: string;
  totalSales: number;
  invoiceCount: number;
  recovery: number;
  target: number;
  achievementPercent: number | null;
  route: string;
}

export interface LowStockItem {
  itemId: string | null;
  name: string;
  code: string;
  warehouseName: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
  severity: 'critical' | 'warning' | 'watch';
  route: string;
}

export interface ExpiryItem {
  _id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batchNumber: string;
  warehouseName: string;
  remainingQuantity: number;
  expiryDate: string;
  value: number;
  daysLeft: number;
  route: string;
}

export interface WarehouseDistribution {
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  totalValue: number;
  itemCount: number;
}

export interface CashFlowTrendPoint {
  label: string;
  receipts: number;
  payments: number;
}

export interface ExpenseCategoryBreakdown {
  categoryId: string;
  name: string;
  amount: number;
  route: string;
}

export interface PdcMetrics {
  dueToday: number;
  upcoming: number;
  overdue: number;
  bounced: number;
  totalPendingAmount: number;
  route: string;
}

export interface InvestorMetrics {
  totalCapital: number;
  activeInvestors: number;
  profitShareDue: number;
  route: string;
}

export interface TaxMetrics {
  gstSales: number;
  gstPurchases: number;
  withholding: number;
  complianceIssues: number;
}

export interface OperationsMetrics {
  pendingPurchaseOrders: number;
  dispatchBacklog: number;
  routeCoverage: number;
  draftQuotations: number;
  pendingOrders: number;
  salesReturnsRate: number;
}

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  route: string;
  value: number;
}

export interface DashboardOverview {
  scope: DashboardScope;
  summary: {
    netSales: MetricValue<{ invoiceCount: number; returnsValue: number }>;
    grossMargin: MetricValue<{ marginPercent: number }>;
    collections: MetricValue<{ receiptCount: number }>;
    receivablesDue: DueMetric;
    payablesDue: DueMetric;
    cashBank: SnapshotMetric;
    inventoryValue: SnapshotMetric;
    expiryExposure: SnapshotMetric;
  };
  commercial: {
    salesTrend: DashboardTrendPoint[];
    funnel: FunnelStage[];
    topCustomers: TopCustomer[];
    topItems: TopItem[];
    salesmen: SalesmanPerformance[];
  };
  inventory: {
    lowStock: LowStockItem[];
    expiry: ExpiryItem[];
    warehouseDistribution: WarehouseDistribution[];
  };
  finance: {
    cashFlowTrend: CashFlowTrendPoint[];
    expenseByCategory: ExpenseCategoryBreakdown[];
    pdc: PdcMetrics;
    investors: InvestorMetrics;
    tax: TaxMetrics;
  };
  operations: OperationsMetrics;
  alerts: DashboardAlert[];
  generatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardOverviewService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;
  private readonly overviewCache = new Map<string, Observable<ApiResponse<DashboardOverview>>>();

  constructor(private readonly http: HttpClient) {}

  getOverview(params: {
    period: DashboardPeriod;
    warehouseId?: string | null;
    salesmanId?: string | null;
    refresh?: boolean;
  }): Observable<ApiResponse<DashboardOverview>> {
    const cacheKey = this.getOverviewCacheKey(params);

    if (params.refresh) {
      this.overviewCache.delete(cacheKey);
    }

    if (!params.refresh && this.overviewCache.has(cacheKey)) {
      return this.overviewCache.get(cacheKey)!;
    }

    let httpParams = new HttpParams().set('period', params.period);

    if (params.warehouseId) {
      httpParams = httpParams.set('warehouseId', params.warehouseId);
    }

    if (params.salesmanId) {
      httpParams = httpParams.set('salesmanId', params.salesmanId);
    }

    if (params.refresh) {
      httpParams = httpParams.set('refresh', 'true');
    }

    const request$ = this.http.get<ApiResponse<DashboardOverview>>(`${this.baseUrl}/overview`, {
      params: httpParams,
    }).pipe(
      catchError((error) => {
        this.overviewCache.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.overviewCache.set(cacheKey, request$);
    return request$;
  }

  invalidateOverviewCache(): void {
    this.overviewCache.clear();
  }

  private getOverviewCacheKey(params: {
    period: DashboardPeriod;
    warehouseId?: string | null;
    salesmanId?: string | null;
  }): string {
    return [
      params.period,
      params.warehouseId || 'all-warehouses',
      params.salesmanId || 'all-salesmen',
    ].join(':');
  }
}
