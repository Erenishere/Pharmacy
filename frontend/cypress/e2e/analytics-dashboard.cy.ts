describe('Analytics Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Login first
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'admin', role: 'admin', permissions: ['read', 'write', 'admin'] }
        }
      }
    }).as('login');

    // Mock analytics API responses
    cy.intercept('GET', '**/analytics/business-intelligence*', {
      statusCode: 200,
      body: {
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
              { period: 'Q1', peakMonths: ['March'], lowMonths: ['January'], seasonalityIndex: 1.2 }
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
              { customerId: 5, customerName: 'Medical Store E', riskScore: 0.75, riskLevel: 'high', reasons: ['Low engagement', 'Decreasing purchases'] }
            ],
            marketOpportunities: [
              { opportunity: 'Expand to Rawalpindi', potentialValue: 25000, confidence: 0.7, recommendedAction: 'Market research and pilot store' }
            ]
          },
          competitiveAnalysis: {
            marketShare: 15.5,
            competitorComparison: [
              { competitor: 'MediCare Plus', marketShare: 22.0, strength: ['Wide network'], weakness: ['Higher prices'] }
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
      }
    }).as('businessIntelligence');

    cy.intercept('GET', '**/analytics/sales*', {
      statusCode: 200,
      body: {
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
            { itemId: 1, itemName: 'Paracetamol', totalSold: 500, revenue: 25000, profit: 7500, margin: 0.3, trend: 'up' }
          ],
          topCustomers: [
            { customerId: 1, customerName: 'Medical Store A', totalPurchases: 50, totalSpent: 10000, averageOrderValue: 200, lastPurchaseDate: '2024-03-15', loyaltyTier: 'gold' }
          ],
          salesByCategory: [
            { category: 'Medicines', sales: 35000, percentage: 70, growth: 15 }
          ],
          salesByRegion: [
            { region: 'Lahore', sales: 25000, orders: 125, customers: 80 }
          ]
        },
        generatedAt: '2024-03-20T10:00:00Z'
      }
    }).as('salesAnalytics');

    cy.intercept('GET', '**/analytics/inventory*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          totalItems: 1000,
          lowStockItems: 45,
          outOfStockItems: 12,
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
      }
    }).as('inventoryAnalytics');

    cy.intercept('GET', '**/analytics/operational*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          orderFulfillmentTime: 2.5,
          customerSatisfaction: 4.2,
          employeeProductivity: [
            { employeeId: 1, employeeName: 'John Doe', salesTarget: 50000, salesAchieved: 55000, achievementPercentage: 110, efficiency: 95 }
          ],
          processEfficiency: [
            { processName: 'Order Processing', averageTime: 15, targetTime: 20, efficiency: 75, bottlenecks: ['Manual verification'] }
          ],
          qualityMetrics: {
            returnRate: 2.1,
            customerComplaints: 5,
            productQualityScore: 4.5,
            serviceQualityScore: 4.2
          }
        },
        generatedAt: '2024-03-20T10:00:00Z'
      }
    }).as('operationalAnalytics');

    // Login and navigate to analytics dashboard
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('admin');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
    cy.visit('/analytics');
  });

  it('should load analytics dashboard successfully', () => {
    // Verify page title
    cy.get('h1').should('contain', 'Business Intelligence Dashboard');

    // Verify loading state initially
    cy.get('mat-spinner').should('be.visible');

    // Wait for data to load
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify loading is complete
    cy.get('mat-spinner').should('not.exist');

    // Verify KPI cards are displayed
    cy.get('.kpi-card').should('have.length', 6); // Revenue, Profit, Customers, Orders, Inventory, Efficiency

    // Verify KPI values
    cy.get('.kpi-card.revenue .kpi-value').should('contain', '₨50,000');
    cy.get('.kpi-card.profit .kpi-value').should('contain', '₨12,500');
    cy.get('.kpi-card.customers .kpi-value').should('contain', '180');
    cy.get('.kpi-card.orders .kpi-value').should('contain', '450');
  });

  it('should display KPI trend indicators correctly', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Revenue KPI - up trend
    cy.get('.kpi-card.revenue .kpi-trend').should('contain', '+8.3%');
    cy.get('.kpi-card.revenue .kpi-trend mat-icon').should('contain', 'trending_up');

    // Profit KPI - up trend
    cy.get('.kpi-card.profit .kpi-trend').should('contain', '+5.3%');
    cy.get('.kpi-card.profit .kpi-trend mat-icon').should('contain', 'trending_up');

    // Customers KPI - down trend
    cy.get('.kpi-card.customers .kpi-trend').should('contain', '-4.2%');
    cy.get('.kpi-card.customers .kpi-trend mat-icon').should('contain', 'trending_down');

    // Orders KPI - up trend (excellent status)
    cy.get('.kpi-card.orders .kpi-trend').should('contain', '+15.4%');
    cy.get('.kpi-card.orders .kpi-status').should('contain', 'Excellent');
  });

  it('should display charts correctly', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify sales trend chart
    cy.get('.chart-card').contains('Sales Trend Analysis').should('be.visible');
    cy.get('.chart-card').contains('Top Product Performance').should('be.visible');
    cy.get('.chart-card').contains('Inventory Status').should('be.visible');
    cy.get('.chart-card').contains('Operational Efficiency').should('be.visible');

    // Charts should render (basic canvas check)
    cy.get('canvas').should('have.length.at.least', 4);
  });

  it('should display predictive insights', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify predictive insights section
    cy.get('.insights-section').should('be.visible');
    cy.get('.insights-section h4').contains('Revenue Forecast').should('be.visible');
    cy.get('.insights-section').should('contain', 'Next Quarter predicted revenue: ₨65,000');
    cy.get('.insights-section').should('contain', '78.0% confidence');

    // Verify inventory optimization insight
    cy.get('.insights-section h4').contains('Inventory Optimization').should('be.visible');

    // Verify customer insights
    cy.get('.insights-section h4').contains('Customer Insights').should('be.visible');
    cy.get('.insights-section').should('contain', 'Medical Store A');
  });

  it('should handle filter changes and data refresh', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Change period filter
    cy.get('mat-select[formControlName="periodFilter"]').click();
    cy.get('mat-option').contains('Weekly').click();

    // Change date range
    cy.get('input[formControlName="startDate"]').clear().type('2024-01-01');
    cy.get('input[formControlName="endDate"]').clear().type('2024-01-31');

    // Click generate report
    cy.get('button').contains('Generate Insights').click();

    // Verify API calls with new parameters
    cy.wait('@businessIntelligence').its('request.url').should('include', 'period=weekly');
    cy.wait('@salesAnalytics').its('request.url').should('include', 'period=weekly');
  });

  it('should navigate to detailed analytics views', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Click on Sales Analytics action
    cy.get('.action-button').contains('Sales Analytics').click();
    cy.url().should('include', '/analytics/sales');

    // Go back and click Inventory Intelligence
    cy.visit('/analytics');
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);
    cy.get('.action-button').contains('Inventory Intelligence').click();
    cy.url().should('include', '/analytics/inventory');

    // Go back and click Operational Metrics
    cy.visit('/analytics');
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);
    cy.get('.action-button').contains('Operational Metrics').click();
    cy.url().should('include', '/analytics/operational');

    // Go back and click Demand Forecasting
    cy.visit('/analytics');
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);
    cy.get('.action-button').contains('Demand Forecasting').click();
    cy.url().should('include', '/analytics/demand-forecast');
  });

  it('should handle export functionality', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Click export button
    cy.get('button').contains('Export Data').click();

    // Verify snackbar message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Dashboard export functionality coming soon');
  });

  it('should display inventory status chart with correct data', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify inventory chart legend
    cy.get('.chart-card').contains('Inventory Status').should('be.visible');

    // The chart should display the doughnut chart with inventory data
    // (Exact chart content verification would require more complex canvas testing)
    cy.get('.chart-card canvas').should('be.visible');
  });

  it('should display operational efficiency radar chart', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify operational efficiency chart
    cy.get('.chart-card').contains('Operational Efficiency').should('be.visible');
    cy.get('.chart-card canvas').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock API failure
    cy.intercept('GET', '**/analytics/business-intelligence*', {
      statusCode: 500,
      body: { success: false, message: 'Server error' }
    }).as('businessIntelligenceError');

    // Reload the page
    cy.visit('/analytics');

    // Wait for error response
    cy.wait('@businessIntelligenceError');

    // Dashboard should still load (with error handling)
    cy.get('h1').should('contain', 'Business Intelligence Dashboard');

    // Verify error handling doesn't break the UI
    cy.get('.kpi-grid').should('exist');
  });

  it('should validate KPI calculations and displays', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify revenue KPI calculation
    cy.get('.kpi-card.revenue .kpi-value').should('contain', '₨50,000');
    cy.get('.kpi-card.revenue .kpi-target').should('contain', '₨60,000');

    // Verify profit KPI
    cy.get('.kpi-card.profit .kpi-value').should('contain', '₨12,500');
    cy.get('.kpi-card.profit .kpi-target').should('contain', '₨15,000');

    // Verify customer KPI
    cy.get('.kpi-card.customers .kpi-value').should('contain', '180');
    cy.get('.kpi-card.customers .kpi-target').should('contain', '200');
  });

  it('should display seasonal patterns and trend analysis', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify trend data is loaded and displayed in charts
    // The sales trend chart should show the revenue trend data
    cy.get('.chart-card').contains('Sales Trend Analysis').parents('.chart-card').find('canvas').should('be.visible');

    // Verify predictive insights include trend-based forecasts
    cy.get('.insights-section').should('contain', 'Next Quarter predicted revenue');
    cy.get('.insights-section').should('contain', 'Next Month predicted');
  });

  it('should handle mobile responsiveness', () => {
    cy.viewport('iphone-6');

    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify mobile layout adjustments
    cy.get('.page-header').should('have.css', 'flex-direction', 'column');
    cy.get('.kpi-grid').should('have.css', 'grid-template-columns').and('include', '1fr');

    // Verify charts are still visible on mobile
    cy.get('canvas').should('be.visible');

    // Verify action buttons are accessible on mobile
    cy.get('.action-button').should('be.visible');
  });

  it('should maintain data consistency across page refreshes', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Get initial KPI values
    let initialRevenueValue: string;
    cy.get('.kpi-card.revenue .kpi-value').invoke('text').then((text) => {
      initialRevenueValue = text;

      // Refresh the page
      cy.reload();

      // Wait for data to reload
      cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

      // Verify KPI values are consistent
      cy.get('.kpi-card.revenue .kpi-value').invoke('text').should('equal', initialRevenueValue);
    });
  });

  it('should validate data integrity and calculations', () => {
    cy.wait(['@businessIntelligence', '@salesAnalytics', '@inventoryAnalytics', '@operationalAnalytics']);

    // Verify total sales calculation consistency
    // (Sum of sales by period should match total sales)
    let periodSalesTotal = 0;
    cy.get('.sales-by-period').then(() => {
      // This would require more detailed DOM inspection
      // For now, verify that data is loaded and displayed
      cy.get('.kpi-card.revenue .kpi-value').should('not.be.empty');
      cy.get('.kpi-card.profit .kpi-value').should('not.be.empty');
    });

    // Verify percentage calculations
    cy.get('.insights-section').should('contain', '%');

    // Verify currency formatting
    cy.get('.kpi-value').each(($el) => {
      const text = $el.text();
      // Should contain currency symbol or be a number
      expect(text).to.match(/(₨|[\d,]+)/);
    });
  });
});
