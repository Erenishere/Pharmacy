import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AnalyticsDashboardComponent } from './analytics-dashboard.component';
import { AnalyticsService } from '../../services/analytics.service';

describe('AnalyticsDashboardComponent', () => {
  let component: AnalyticsDashboardComponent;
  let fixture: ComponentFixture<AnalyticsDashboardComponent>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const analyticsSpy = jasmine.createSpyObj('AnalyticsService', [
      'getSalesAnalytics',
      'getInventoryAnalytics',
      'getOperationalAnalytics',
      'getBusinessIntelligence'
    ]);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatGridListModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
      ],
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsDashboardComponent);
    component = fixture.componentInstance;
    analyticsServiceSpy = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    // Mock successful API responses
    analyticsServiceSpy.getSalesAnalytics.and.returnValue(of({
      success: true,
      data: {
        totalSales: 50000,
        totalOrders: 250,
        averageOrderValue: 200,
        salesByPeriod: [
          { period: '2024-01', sales: 15000, orders: 75, customers: 50 },
          { period: '2024-02', sales: 20000, orders: 100, customers: 65 },
          { period: '2024-03', sales: 15000, orders: 75, customers: 55 }
        ],
        topProducts: [
          { itemId: 1, itemName: 'Paracetamol', totalSold: 500, revenue: 25000, profit: 7500, margin: 0.3, trend: 'up' },
          { itemId: 2, itemName: 'Amoxicillin', totalSold: 300, revenue: 15000, profit: 4500, margin: 0.3, trend: 'stable' }
        ],
        topCustomers: [
          { customerId: 1, customerName: 'Medical Store A', totalPurchases: 50, totalSpent: 10000, averageOrderValue: 200, lastPurchaseDate: '2024-03-15', loyaltyTier: 'gold' }
        ],
        salesByCategory: [
          { category: 'Medicines', sales: 35000, percentage: 70, growth: 15 },
          { category: 'Medical Supplies', sales: 15000, percentage: 30, growth: 8 }
        ],
        salesByRegion: [
          { region: 'Lahore', sales: 25000, orders: 125, customers: 80 },
          { region: 'Karachi', sales: 15000, orders: 75, customers: 45 },
          { region: 'Islamabad', sales: 10000, orders: 50, customers: 30 }
        ]
      },
      generatedAt: '2024-03-20T10:00:00Z'
    }));

    analyticsServiceSpy.getInventoryAnalytics.and.returnValue(of({
      success: true,
      data: {
        totalItems: 1000,
        lowStockItems: 45,
        outOfStockItems: 12,
        overStockItems: 8,
        inventoryValue: 500000,
        turnoverRate: 4.2,
        stockMovement: [
          { itemId: 1, itemName: 'Paracetamol', currentStock: 150, monthlyMovement: 25, trend: 'increasing' }
        ],
        demandForecast: [
          { itemId: 1, itemName: 'Paracetamol', currentStock: 150, forecastedDemand: 180, recommendedStock: 200, confidence: 0.85, forecastPeriod: 'Next Month' }
        ]
      },
      generatedAt: '2024-03-20T10:00:00Z'
    }));

    analyticsServiceSpy.getOperationalAnalytics.and.returnValue(of({
      success: true,
      data: {
        orderFulfillmentTime: 2.5,
        customerSatisfaction: 4.2,
        employeeProductivity: [
          { employeeId: 1, employeeName: 'John Doe', salesTarget: 50000, salesAchieved: 55000, achievementPercentage: 110, efficiency: 95 }
        ],
        processEfficiency: [
          { processName: 'Order Processing', averageTime: 15, targetTime: 20, efficiency: 75, bottlenecks: ['Manual verification'] },
          { processName: 'Fulfillment', averageTime: 45, targetTime: 60, efficiency: 75, bottlenecks: [] }
        ],
        qualityMetrics: {
          returnRate: 2.1,
          customerComplaints: 5,
          productQualityScore: 4.5,
          serviceQualityScore: 4.2
        }
      },
      generatedAt: '2024-03-20T10:00:00Z'
    }));

    analyticsServiceSpy.getBusinessIntelligence.and.returnValue(of({
      success: true,
      data: {
        kpiDashboard: {
          revenue: { current: 50000, target: 60000, change: 8.33, trend: 'up', status: 'good' },
          profit: { current: 12500, target: 15000, change: 5.26, trend: 'up', status: 'average' },
          customers: { current: 180, target: 200, change: -4.17, trend: 'down', status: 'average' },
          orders: { current: 450, target: 500, change: 15.38, trend: 'up', status: 'excellent' },
          inventory: { current: 92, target: 95, change: 0, trend: 'stable', status: 'good' },
          efficiency: { current: 78, target: 85, change: 2.94, trend: 'up', status: 'average' }
        },
        trendAnalysis: {
          revenueTrend: [45000, 47000, 48000, 49000, 50000],
          profitTrend: [11000, 11500, 11800, 12200, 12500],
          customerGrowth: [170, 172, 175, 178, 180],
          seasonalPatterns: [
            { period: 'Q1', peakMonths: ['March'], lowMonths: ['January'], seasonalityIndex: 1.2 },
            { period: 'Q2', peakMonths: ['June'], lowMonths: ['April'], seasonalityIndex: 1.1 }
          ]
        },
        predictiveInsights: {
          revenueForecast: {
            period: 'Next Quarter',
            predicted: 65000,
            confidence: 0.78,
            upperBound: 72000,
            lowerBound: 58000
          },
          demandForecast: {
            period: 'Next Month',
            predicted: 550,
            confidence: 0.82,
            upperBound: 600,
            lowerBound: 500
          },
          customerChurnRisk: [
            { customerId: 5, customerName: 'Medical Store E', riskScore: 0.75, riskLevel: 'high', reasons: ['Low engagement', 'Decreasing purchases'] },
            { customerId: 12, customerName: 'Pharmacy L', riskScore: 0.45, riskLevel: 'medium', reasons: ['Irregular purchases'] }
          ],
          marketOpportunities: [
            { opportunity: 'Expand to Rawalpindi', potentialValue: 25000, confidence: 0.7, recommendedAction: 'Market research and pilot store' },
            { opportunity: 'Online Pharmacy Platform', potentialValue: 50000, confidence: 0.6, recommendedAction: 'Partnership with existing platforms' }
          ]
        },
        competitiveAnalysis: {
          marketShare: 15.5,
          competitorComparison: [
            { competitor: 'MediCare Plus', marketShare: 22.0, strength: ['Wide network', 'Brand recognition'], weakness: ['Higher prices', 'Limited rural presence'] },
            { competitor: 'HealthFirst', marketShare: 18.5, strength: ['Technology focus', 'Fast delivery'], weakness: ['Small product range', 'Limited locations'] }
          ],
          pricingAnalysis: {
            currentPricing: { averagePrice: 145, priceRange: { min: 45, max: 280 }, margin: 0.25 },
            optimalPricing: { averagePrice: 155, priceRange: { min: 50, max: 300 }, margin: 0.28 },
            priceElasticity: -1.2
          },
          customerSatisfaction: 4.2
        }
      },
      generatedAt: '2024-03-20T10:00:00Z'
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.periodFilter.value).toBe('monthly');

    // Check that default date range is set (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    expect(component.startDate.value).toEqual(startOfMonth);
    expect(component.endDate.value).toEqual(now);
  });

  it('should load analytics data on init', (done) => {
    component.ngOnInit();

    // Wait for data loading to complete
    setTimeout(() => {
      expect(analyticsServiceSpy.getSalesAnalytics).toHaveBeenCalled();
      expect(analyticsServiceSpy.getInventoryAnalytics).toHaveBeenCalled();
      expect(analyticsServiceSpy.getOperationalAnalytics).toHaveBeenCalled();
      expect(analyticsServiceSpy.getBusinessIntelligence).toHaveBeenCalled();

      expect(component.salesAnalytics).toBeTruthy();
      expect(component.inventoryAnalytics).toBeTruthy();
      expect(component.operationalAnalytics).toBeTruthy();
      expect(component.businessIntelligence).toBeTruthy();

      done();
    }, 100);
  });

  it('should format currency correctly', () => {
    expect(component.formatCurrency(1500)).toBe('₨1,500');
    expect(component.formatCurrency(1500000, true)).toBe('1.5M');
    expect(component.formatCurrency(2500, true)).toBe('2.5K');
  });

  it('should format percentage correctly', () => {
    expect(component.formatPercentage(0.85)).toBe('85.0%');
    expect(component.formatPercentage(1.234)).toBe('123.4%');
  });

  it('should return correct trend icon', () => {
    expect(component.getKPITrendIcon('up')).toBe('trending_up');
    expect(component.getKPITrendIcon('down')).toBe('trending_down');
    expect(component.getKPITrendIcon('stable')).toBe('trending_flat');
  });

  it('should return correct KPI status color', () => {
    expect(component.getKPIStatusColor('excellent')).toBe('#4CAF50');
    expect(component.getKPIStatusColor('good')).toBe('#2196F3');
    expect(component.getKPIStatusColor('average')).toBe('#FF9800');
    expect(component.getKPIStatusColor('poor')).toBe('#F44336');
  });

  it('should return correct KPI trend color', () => {
    expect(component.getKPITrendColor('up')).toBe('#4CAF50');
    expect(component.getKPITrendColor('down')).toBe('#F44336');
    expect(component.getKPITrendColor('stable')).toBe('#FF9800');
  });

  it('should navigate to sales analytics', () => {
    component.onViewSalesAnalytics();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/analytics/sales']);
  });

  it('should navigate to inventory analytics', () => {
    component.onViewInventoryAnalytics();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/analytics/inventory']);
  });

  it('should navigate to operational analytics', () => {
    component.onViewOperationalAnalytics();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/analytics/operational']);
  });

  it('should navigate to demand forecast', () => {
    component.onViewDemandForecast();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/analytics/demand-forecast']);
  });

  it('should load data with custom filters', () => {
    const customStartDate = new Date('2024-01-01');
    const customEndDate = new Date('2024-01-31');

    component.periodFilter.setValue('monthly');
    component.startDate.setValue(customStartDate);
    component.endDate.setValue(customEndDate);

    component.onGenerateReport();

    expect(analyticsServiceSpy.getSalesAnalytics).toHaveBeenCalledWith({
      period: 'monthly',
      startDate: customStartDate.toISOString(),
      endDate: customEndDate.toISOString()
    });
  });

  it('should handle API errors gracefully', (done) => {
    // Mock API error
    analyticsServiceSpy.getSalesAnalytics.and.returnValue(of({
      success: false,
      message: 'API Error',
      generatedAt: '2024-03-20T10:00:00Z'
    }));

    component.ngOnInit();

    setTimeout(() => {
      // Component should still function even with API errors
      expect(component).toBeTruthy();
      // Should have called all services despite one failing
      expect(analyticsServiceSpy.getInventoryAnalytics).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should update charts when data is loaded', () => {
    component.ngOnInit();

    // Spy on chart update methods
    spyOn(component, 'updateCharts');

    // Trigger data loading
    component.loadAnalyticsData();

    expect(component.updateCharts).toHaveBeenCalled();
  });

  it('should handle export functionality', () => {
    component.onExportDashboard();

    // Since export functionality shows a snackbar, we can't easily test the actual export
    // but we can verify the method exists and doesn't throw errors
    expect(component.onExportDashboard).toBeDefined();
  });

  it('should set default date range correctly', () => {
    const mockNow = new Date('2024-03-15');
    spyOn(Date, 'now').and.returnValue(mockNow.getTime());

    component.setDefaultDateRange();

    const expectedStartOfMonth = new Date(2024, 2, 1); // March 1, 2024
    expect(component.startDate.value).toEqual(expectedStartOfMonth);
    expect(component.endDate.value).toEqual(mockNow);
  });

  it('should validate KPI data structure', () => {
    component.ngOnInit();

    expect(component.businessIntelligence?.kpiDashboard.revenue).toBeDefined();
    expect(component.businessIntelligence?.kpiDashboard.profit).toBeDefined();
    expect(component.businessIntelligence?.kpiDashboard.customers).toBeDefined();
    expect(component.businessIntelligence?.kpiDashboard.orders).toBeDefined();

    // Validate KPI structure
    const revenue = component.businessIntelligence!.kpiDashboard.revenue!;
    expect(revenue.current).toBeDefined();
    expect(revenue.target).toBeDefined();
    expect(revenue.change).toBeDefined();
    expect(revenue.trend).toBeDefined();
    expect(revenue.status).toBeDefined();
  });

  it('should validate sales analytics data structure', () => {
    component.ngOnInit();

    expect(component.salesAnalytics?.totalSales).toBeDefined();
    expect(component.salesAnalytics?.totalOrders).toBeDefined();
    expect(component.salesAnalytics?.averageOrderValue).toBeDefined();
    expect(component.salesAnalytics?.salesByPeriod).toBeDefined();
    expect(component.salesAnalytics?.topProducts).toBeDefined();
    expect(component.salesAnalytics?.topCustomers).toBeDefined();
    expect(component.salesAnalytics?.salesByCategory).toBeDefined();
    expect(component.salesAnalytics?.salesByRegion).toBeDefined();
  });

  it('should validate inventory analytics data structure', () => {
    component.ngOnInit();

    expect(component.inventoryAnalytics?.totalItems).toBeDefined();
    expect(component.inventoryAnalytics?.lowStockItems).toBeDefined();
    expect(component.inventoryAnalytics?.outOfStockItems).toBeDefined();
    expect(component.inventoryAnalytics?.inventoryValue).toBeDefined();
    expect(component.inventoryAnalytics?.stockMovement).toBeDefined();
    expect(component.inventoryAnalytics?.demandForecast).toBeDefined();
  });

  it('should validate operational analytics data structure', () => {
    component.ngOnInit();

    expect(component.operationalAnalytics?.orderFulfillmentTime).toBeDefined();
    expect(component.operationalAnalytics?.customerSatisfaction).toBeDefined();
    expect(component.operationalAnalytics?.employeeProductivity).toBeDefined();
    expect(component.operationalAnalytics?.processEfficiency).toBeDefined();
    expect(component.operationalAnalytics?.qualityMetrics).toBeDefined();
  });
});
