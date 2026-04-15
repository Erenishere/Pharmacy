import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Analytics Interfaces
export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category?: string;
  itemId?: string;
  customerId?: string;
  salesmanId?: string;
}

export interface SalesAnalytics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByPeriod: SalesTrend[];
  topProducts: ProductPerformance[];
  topCustomers: CustomerPerformance[];
  salesByCategory: CategoryPerformance[];
  salesByRegion: RegionalPerformance[];
}

export interface SalesTrend {
  period: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface ProductPerformance {
  itemId: string;
  itemName: string;
  totalSold: number;
  revenue: number;
  profit: number;
  margin: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CustomerPerformance {
  customerId: string;
  customerName: string;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate: string;
  loyaltyTier: 'platinum' | 'gold' | 'silver' | 'bronze';
}

export interface CategoryPerformance {
  category: string;
  sales: number;
  percentage: number;
  growth: number;
}

export interface RegionalPerformance {
  region: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface InventoryAnalytics {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  inventoryValue: number;
  turnoverRate: number;
  stockMovement: InventoryMovement[];
  demandForecast: DemandForecast[];
}

export interface InventoryMovement {
  itemId: string;
  itemName: string;
  currentStock: number;
  monthlyMovement: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface DemandForecast {
  itemId: string;
  itemName: string;
  currentStock: number;
  forecastedDemand: number;
  recommendedStock: number;
  confidence: number;
  forecastPeriod: string;
}

export interface OperationalAnalytics {
  orderFulfillmentTime: number;
  customerSatisfaction: number;
  employeeProductivity: EmployeeProductivity[];
  processEfficiency: ProcessEfficiency[];
  qualityMetrics: QualityMetrics;
}

export interface EmployeeProductivity {
  employeeId: string;
  employeeName: string;
  salesTarget: number;
  salesAchieved: number;
  achievementPercentage: number;
  efficiency: number;
}

export interface ProcessEfficiency {
  processName: string;
  averageTime: number;
  targetTime: number;
  efficiency: number;
  bottlenecks: string[];
}

export interface QualityMetrics {
  returnRate: number;
  customerComplaints: number;
  productQualityScore: number;
  serviceQualityScore: number;
}

export interface BusinessIntelligence {
  kpiDashboard: KPIDashboard;
  trendAnalysis: TrendAnalysis;
  predictiveInsights: PredictiveInsights;
  competitiveAnalysis: CompetitiveAnalysis;
}

export interface KPIDashboard {
  revenue: KPIMetric;
  profit: KPIMetric;
  customers: KPIMetric;
  orders: KPIMetric;
  inventory: KPIMetric;
  efficiency: KPIMetric;
}

export interface KPIMetric {
  current: number;
  target: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'average' | 'poor';
}

export interface TrendAnalysis {
  revenueTrend: number[];
  profitTrend: number[];
  customerGrowth: number[];
  seasonalPatterns: SeasonalPattern[];
}

export interface SeasonalPattern {
  period: string;
  peakMonths: string[];
  lowMonths: string[];
  seasonalityIndex: number;
}

export interface PredictiveInsights {
  revenueForecast: ForecastData;
  demandForecast: ForecastData;
  customerChurnRisk: ChurnRisk[];
  marketOpportunities: MarketOpportunity[];
}

export interface ForecastData {
  period: string;
  predicted: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface ChurnRisk {
  customerId: string;
  customerName: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface MarketOpportunity {
  opportunity: string;
  potentialValue: number;
  confidence: number;
  recommendedAction: string;
}

export interface CompetitiveAnalysis {
  marketShare: number;
  competitorComparison: CompetitorData[];
  pricingAnalysis: PricingAnalysis;
  customerSatisfaction: number;
}

export interface CompetitorData {
  competitor: string;
  marketShare: number;
  strength: string[];
  weakness: string[];
}

export interface PricingAnalysis {
  currentPricing: PricingData;
  optimalPricing: PricingData;
  priceElasticity: number;
}

export interface PricingData {
  averagePrice: number;
  priceRange: { min: number; max: number };
  margin: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  // Sales Analytics
  getSalesAnalytics(params: AnalyticsQueryParams = {}): Observable<ApiResponse<SalesAnalytics>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<SalesAnalytics>>(`${this.baseUrl}/sales`, { params: httpParams });
  }

  // Inventory Analytics
  getInventoryAnalytics(params: AnalyticsQueryParams = {}): Observable<ApiResponse<InventoryAnalytics>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<InventoryAnalytics>>(`${this.baseUrl}/inventory`, { params: httpParams });
  }

  // Operational Analytics
  getOperationalAnalytics(params: AnalyticsQueryParams = {}): Observable<ApiResponse<OperationalAnalytics>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<OperationalAnalytics>>(`${this.baseUrl}/operational`, { params: httpParams });
  }

  // Business Intelligence Dashboard
  getBusinessIntelligence(params: AnalyticsQueryParams = {}): Observable<ApiResponse<BusinessIntelligence>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<BusinessIntelligence>>(`${this.baseUrl}/business-intelligence`, { params: httpParams });
  }

  // Demand Forecasting
  getDemandForecast(params: { itemId?: string; period?: string } = {}): Observable<ApiResponse<DemandForecast[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<DemandForecast[]>>(`${this.baseUrl}/demand-forecast`, { params: httpParams });
  }

  // Customer Insights
  getCustomerInsights(params: AnalyticsQueryParams = {}): Observable<ApiResponse<CustomerPerformance[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<CustomerPerformance[]>>(`${this.baseUrl}/customer-insights`, { params: httpParams });
  }

  // Predictive Analytics
  getPredictiveAnalytics(params: AnalyticsQueryParams = {}): Observable<ApiResponse<PredictiveInsights>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<ApiResponse<PredictiveInsights>>(`${this.baseUrl}/predictive`, { params: httpParams });
  }

  // Custom Analytics Report
  generateCustomReport(reportConfig: {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    period: AnalyticsQueryParams['period'];
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/custom-report`, reportConfig);
  }

  // Export Analytics Data
  exportAnalyticsData(params: {
    type: 'sales' | 'inventory' | 'operational' | 'bi';
    format: 'csv' | 'excel' | 'pdf';
    filters?: AnalyticsQueryParams;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'filters') {
        const stringValue = value.toString();
        if (stringValue.length > 0) {
          httpParams = httpParams.set(key, stringValue);
        }
      }
    });

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const stringValue = String(value);
          if (stringValue.length > 0) {
            httpParams = httpParams.set(`filters.${key}`, stringValue);
          }
        }
      });
    }

    return this.http.get(`${this.baseUrl}/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
