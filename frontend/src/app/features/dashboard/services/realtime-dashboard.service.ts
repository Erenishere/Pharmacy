import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { map, catchError, tap, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface DashboardUpdate {
  type: 'dashboard' | 'sales' | 'inventory' | 'customers' | 'financial';
  data: any;
  timestamp: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate?: Date;
  error?: string;
}

export interface DashboardData {
  kpis: any;
  salesTrend: any[];
  inventoryMetrics: any;
  customerInsights: any;
  operationalMetrics: any;
  financialHealth: any;
  period: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeDashboardService implements OnDestroy {
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    status: 'disconnected'
  });
  private dashboardDataSubject = new BehaviorSubject<DashboardData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();
  private pollingInterval = 30000; // 30 seconds
  private isPolling = false;

  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public dashboardData$ = this.dashboardDataSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private readonly API_ENDPOINTS = {
    ENHANCED_DASHBOARD: `${environment.apiUrl}/dashboard/enhanced`,
    SALES_ANALYTICS: `${environment.apiUrl}/reports/analytics/sales-trends`,
    INVENTORY_PERFORMANCE: `${environment.apiUrl}/reports/analytics/inventory-turnover`,
    CUSTOMER_BEHAVIOR: `${environment.apiUrl}/reports/analytics/top-customers`,
    OPERATIONAL_METRICS: `${environment.apiUrl}/reports/analytics/dashboard`,
    FINANCIAL_HEALTH: `${environment.apiUrl}/reports/financial/summary`
  };

  constructor(private http: HttpClient) {}

  private withDefaultDateRange(filters: any = {}): any {
    if (filters?.startDate && filters?.endDate) {
      return filters;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    return {
      ...filters,
      startDate: filters?.startDate || startDate.toISOString().slice(0, 10),
      endDate: filters?.endDate || endDate.toISOString().slice(0, 10),
    };
  }

  connect(): void {
    if (this.isPolling) {
      console.log('Dashboard polling already active');
      return;
    }

    this.startPolling();
  }

  private startPolling(): void {
    this.isPolling = true;
    this.connectionStatusSubject.next({
      isConnected: true,
      status: 'connected',
      lastUpdate: new Date()
    });

    // Start polling interval
    timer(0, this.pollingInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchLatestDashboardData();
      });
  }

  private fetchLatestDashboardData(): void {
    if (this.loadingSubject.value) return; // Don't fetch if already loading

    this.loadingSubject.next(true);
    
    // Fetch current dashboard data
    this.getEnhancedDashboard().subscribe({
      next: (data) => {
        this.dashboardDataSubject.next(data);
        this.connectionStatusSubject.next({
          isConnected: true,
          status: 'connected',
          lastUpdate: new Date()
        });
        this.loadingSubject.next(false);
      },
      error: (error: Error) => {
        console.error('Dashboard polling error:', error);
        this.connectionStatusSubject.next({
          isConnected: false,
          status: 'error',
          error: error.message || 'Failed to fetch dashboard data'
        });
        this.errorSubject.next(error.message || 'Failed to fetch dashboard data');
        this.loadingSubject.next(false);
      }
    });
  }

  getEnhancedDashboard(filters?: any): Observable<DashboardData> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params = filters ? { params: filters } : {};

    return this.http.get<any>(this.API_ENDPOINTS.ENHANCED_DASHBOARD, params).pipe(
      map(response => {
        if (response.success && response.data) {
          this.dashboardDataSubject.next(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to fetch dashboard data');
        }
      }),
      catchError((error: Error) => {
        const errorMessage = error.message || 'Failed to fetch dashboard data';
        this.errorSubject.next(errorMessage);
        throw error;
      }),
      tap(() => {
        this.loadingSubject.next(false);
      })
    );
  }

  getSalesAnalytics(filters?: any): Observable<any> {
    return this.http.get<any>(this.API_ENDPOINTS.SALES_ANALYTICS, { params: this.withDefaultDateRange(filters) }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to fetch sales analytics');
        }
      }),
      catchError((error: Error) => {
        const errorMessage = error.message || 'Failed to fetch sales analytics';
        this.errorSubject.next(errorMessage);
        throw error;
      })
    );
  }

  getInventoryPerformance(filters?: any): Observable<any> {
    return this.http.get<any>(this.API_ENDPOINTS.INVENTORY_PERFORMANCE, { params: this.withDefaultDateRange(filters) }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to fetch inventory performance');
        }
      }),
      catchError((error: Error) => {
        const errorMessage = error.message || 'Failed to fetch inventory performance';
        this.errorSubject.next(errorMessage);
        throw error;
      })
    );
  }

  getCustomerBehavior(filters?: any): Observable<any> {
    return this.http.get<any>(this.API_ENDPOINTS.CUSTOMER_BEHAVIOR, { params: this.withDefaultDateRange(filters) }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to fetch customer behavior');
        }
      }),
      catchError((error: Error) => {
        const errorMessage = error.message || 'Failed to fetch customer behavior';
        this.errorSubject.next(errorMessage);
        throw error;
      })
    );
  }

  refreshDashboard(filters?: any): void {
    this.getEnhancedDashboard(filters).subscribe({
      next: (data) => {
        console.log('Dashboard refreshed successfully');
      },
      error: (error: Error) => {
        console.error('Failed to refresh dashboard:', error);
      }
    });
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  disconnect(): void {
    this.isPolling = false;
    this.destroy$.next();
    this.connectionStatusSubject.next({
      isConnected: false,
      status: 'disconnected'
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  isConnected(): boolean {
    return this.connectionStatusSubject.value.isConnected;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }
}
