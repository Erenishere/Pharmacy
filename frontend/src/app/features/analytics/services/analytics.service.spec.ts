import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AnalyticsService, SalesAnalytics, InventoryAnalytics } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService]
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getSalesAnalytics', () => {
    it('should fetch sales analytics data', () => {
      const mockParams = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const mockResponse = {
        success: true,
        data: {
          totalSales: 50000,
          totalOrders: 250,
          averageOrderValue: 200,
          salesByPeriod: [
            { period: '2024-01-01', sales: 1000, orders: 5, customers: 3 },
            { period: '2024-01-02', sales: 1500, orders: 7, customers: 4 }
          ],
          topProducts: [
            { itemId: 1, itemName: 'Product A', totalSold: 50, revenue: 5000, profit: 1000, margin: 0.2, trend: 'up' }
          ],
          topCustomers: [
            { customerId: 1, customerName: 'Customer A', totalPurchases: 10, totalSpent: 2000, averageOrderValue: 200, lastPurchaseDate: '2024-01-30', loyaltyTier: 'gold' }
          ],
          salesByCategory: [
            { category: 'Medicines', sales: 30000, percentage: 60, growth: 15 }
          ],
          salesByRegion: [
            { region: 'Lahore', sales: 25000, orders: 125, customers: 80 }
          ]
        } as SalesAnalytics,
        generatedAt: '2024-01-31T10:00:00Z'
      };

      service.getSalesAnalytics(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalSales).toBe(50000);
        expect(response.data.totalOrders).toBe(250);
        expect(response.data.salesByPeriod.length).toBe(2);
        expect(response.data.topProducts.length).toBe(1);
        expect(response.data.topCustomers.length).toBe(1);
        expect(response.data.salesByCategory.length).toBe(1);
        expect(response.data.salesByRegion.length).toBe(1);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/sales'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-01-31');
      req.flush(mockResponse);
    });

    it('should handle API errors', () => {
      const mockParams = { period: 'monthly' };
      const mockError = { success: false, message: 'Server error' };

      service.getSalesAnalytics(mockParams).subscribe(
        () => fail('Should have failed'),
        error => expect(error.error).toEqual(mockError)
      );

      const req = httpMock.expectOne(req => req.url.includes('/analytics/sales'));
      req.flush(mockError, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should fetch inventory analytics data', () => {
      const mockResponse = {
        success: true,
        data: {
          totalItems: 1000,
          lowStockItems: 50,
          outOfStockItems: 20,
          overStockItems: 10,
          inventoryValue: 500000,
          turnoverRate: 4.5,
          stockMovement: [
            { itemId: 1, itemName: 'Item A', currentStock: 100, monthlyMovement: 25, trend: 'increasing' }
          ],
          demandForecast: [
            { itemId: 1, itemName: 'Item A', currentStock: 100, forecastedDemand: 120, recommendedStock: 130, confidence: 0.85, forecastPeriod: 'Next Month' }
          ]
        } as InventoryAnalytics,
        generatedAt: '2024-01-31T10:00:00Z'
      };

      service.getInventoryAnalytics().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalItems).toBe(1000);
        expect(response.data.lowStockItems).toBe(50);
        expect(response.data.outOfStockItems).toBe(20);
        expect(response.data.inventoryValue).toBe(500000);
        expect(response.data.turnoverRate).toBe(4.5);
        expect(response.data.stockMovement.length).toBe(1);
        expect(response.data.demandForecast.length).toBe(1);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/inventory'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getBusinessIntelligence', () => {
    it('should fetch business intelligence data', () => {
      const mockResponse = {
        success: true,
        data: {
          kpiDashboard: {
            revenue: { current: 100000, target: 120000, change: 8.33, trend: 'up', status: 'good' },
            profit: { current: 25000, target: 30000, change: 5.26, trend: 'up', status: 'average' },
            customers: { current: 500, target: 600, change: -4.17, trend: 'down', status: 'average' },
            orders: { current: 1200, target: 1500, change: 15.38, trend: 'up', status: 'excellent' },
            inventory: { current: 95, target: 100, change: 0, trend: 'stable', status: 'good' },
            efficiency: { current: 85, target: 90, change: 2.94, trend: 'up', status: 'good' }
          },
          trendAnalysis: {
            revenueTrend: [95000, 98000, 102000, 105000, 100000],
            profitTrend: [22000, 23000, 24500, 25500, 25000],
            customerGrowth: [480, 485, 490, 495, 500],
            seasonalPatterns: [
              { period: 'Q1', peakMonths: ['March'], lowMonths: ['January'], seasonalityIndex: 1.2 }
            ]
          },
          predictiveInsights: {
            revenueForecast: {
              period: 'Next Quarter',
              predicted: 125000,
              confidence: 0.78,
              upperBound: 140000,
              lowerBound: 110000
            },
            demandForecast: {
              period: 'Next Month',
              predicted: 1500,
              confidence: 0.82,
              upperBound: 1650,
              lowerBound: 1350
            },
            customerChurnRisk: [
              { customerId: 1, customerName: 'Customer A', riskScore: 0.75, riskLevel: 'high', reasons: ['Low engagement', 'Decreasing purchases'] }
            ],
            marketOpportunities: [
              { opportunity: 'New Product Line', potentialValue: 50000, confidence: 0.7, recommendedAction: 'Market research and product development' }
            ]
          },
          competitiveAnalysis: {
            marketShare: 15.5,
            competitorComparison: [
              { competitor: 'PharmaCorp', marketShare: 25.0, strength: ['Brand recognition'], weakness: ['High prices'] }
            ],
            pricingAnalysis: {
              currentPricing: { averagePrice: 150, priceRange: { min: 50, max: 300 }, margin: 0.25 },
              optimalPricing: { averagePrice: 165, priceRange: { min: 55, max: 330 }, margin: 0.28 },
              priceElasticity: -1.2
            },
            customerSatisfaction: 4.2
          }
        },
        generatedAt: '2024-01-31T10:00:00Z'
      };

      service.getBusinessIntelligence().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.kpiDashboard.revenue.current).toBe(100000);
        expect(response.data.trendAnalysis.revenueTrend.length).toBe(5);
        expect(response.data.predictiveInsights.revenueForecast.predicted).toBe(125000);
        expect(response.data.competitiveAnalysis.marketShare).toBe(15.5);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/business-intelligence'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getDemandForecast', () => {
    it('should fetch demand forecast data', () => {
      const mockParams = { itemId: 1, period: 'monthly' };
      const mockResponse = {
        success: true,
        data: [
          {
            itemId: 1,
            itemName: 'Paracetamol 500mg',
            currentStock: 150,
            forecastedDemand: 180,
            recommendedStock: 200,
            confidence: 0.85,
            forecastPeriod: 'Next Month'
          }
        ],
        generatedAt: '2024-01-31T10:00:00Z'
      };

      service.getDemandForecast(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.length).toBe(1);
        expect(response.data[0].itemId).toBe(1);
        expect(response.data[0].forecastedDemand).toBe(180);
        expect(response.data[0].recommendedStock).toBe(200);
        expect(response.data[0].confidence).toBe(0.85);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/demand-forecast'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('itemId')).toBe('1');
      expect(req.request.params.get('period')).toBe('monthly');
      req.flush(mockResponse);
    });
  });

  describe('generateCustomReport', () => {
    it('should generate custom analytics report', () => {
      const reportConfig = {
        metrics: ['revenue', 'profit', 'customers'],
        dimensions: ['category', 'region'],
        filters: { startDate: '2024-01-01', endDate: '2024-01-31' },
        period: 'monthly' as const
      };

      const mockResponse = {
        success: true,
        data: {
          reportData: [],
          summary: {
            totalRevenue: 100000,
            totalProfit: 25000,
            totalCustomers: 500
          }
        },
        generatedAt: '2024-01-31T10:00:00Z'
      };

      service.generateCustomReport(reportConfig).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.summary.totalRevenue).toBe(100000);
        expect(response.data.summary.totalProfit).toBe(25000);
        expect(response.data.summary.totalCustomers).toBe(500);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/custom-report'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(reportConfig);
      req.flush(mockResponse);
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export analytics data', () => {
      const exportParams = {
        type: 'sales' as const,
        format: 'csv' as const,
        filters: { startDate: '2024-01-01', endDate: '2024-01-31' }
      };

      const mockBlob = new Blob(['mock,csv,data'], { type: 'text/csv' });

      service.exportAnalyticsData(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/analytics/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('type')).toBe('sales');
      expect(req.request.params.get('format')).toBe('csv');
      expect(req.request.params.get('filters.startDate')).toBe('2024-01-01');
      expect(req.request.params.get('filters.endDate')).toBe('2024-01-31');
      req.flush(mockBlob);
    });
  });
});
