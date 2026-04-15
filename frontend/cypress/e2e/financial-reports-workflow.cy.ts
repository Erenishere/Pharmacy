describe('Financial Reports Complete Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login as accountant for full access
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'accountant1', role: 'accountant', permissions: ['read', 'write', 'accounting'] }
        }
      }
    }).as('login');

    // Mock profit & loss data
    cy.intercept('GET', '**/financial-reports/profit-loss*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          period: 'Q1 2024',
          revenue: {
            sales: [
              { category: 'Medicine Sales', amount: 150000, percentage: 90 },
              { category: 'Equipment Sales', amount: 15000, percentage: 9 },
              { category: 'Other Sales', amount: 1000, percentage: 1 }
            ],
            otherIncome: [
              { category: 'Interest Income', amount: 2000, percentage: 100 }
            ],
            totalRevenue: 168000
          },
          expenses: {
            costOfGoodsSold: [
              { category: 'Medicine COGS', amount: 90000, percentage: 75 },
              { category: 'Equipment COGS', amount: 10000, percentage: 8.3 }
            ],
            operatingExpenses: [
              { category: 'Salaries', amount: 25000, percentage: 32.5 },
              { category: 'Rent', amount: 15000, percentage: 19.5 },
              { category: 'Utilities', amount: 5000, percentage: 6.5 },
              { category: 'Marketing', amount: 8000, percentage: 10.4 },
              { category: 'Depreciation', amount: 3000, percentage: 3.9 }
            ],
            otherExpenses: [
              { category: 'Interest Expense', amount: 2000, percentage: 100 }
            ],
            totalExpenses: 152000
          },
          profitBeforeTax: 16000,
          taxExpense: 4000,
          netProfit: 12000
        },
        message: 'Profit & Loss statement generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getProfitLoss');

    // Mock balance sheet data
    cy.intercept('GET', '**/financial-reports/balance-sheet*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          period: 'March 2024',
          assets: {
            currentAssets: [
              { category: 'Cash and Cash Equivalents', amount: 50000, percentage: 25 },
              { category: 'Accounts Receivable', amount: 75000, percentage: 37.5 },
              { category: 'Inventory', amount: 60000, percentage: 30 },
              { category: 'Prepaid Expenses', amount: 15000, percentage: 7.5 }
            ],
            fixedAssets: [
              { category: 'Property, Plant & Equipment', subCategory: 'Buildings', amount: 200000, percentage: 66.7 },
              { category: 'Property, Plant & Equipment', subCategory: 'Equipment', amount: 100000, percentage: 33.3 }
            ],
            totalAssets: 500000
          },
          liabilities: {
            currentLiabilities: [
              { category: 'Accounts Payable', amount: 80000, percentage: 57.1 },
              { category: 'Short-term Loans', amount: 30000, percentage: 21.4 },
              { category: 'Accrued Expenses', amount: 30000, percentage: 21.4 }
            ],
            longTermLiabilities: [
              { category: 'Long-term Loans', amount: 100000, percentage: 100 }
            ],
            totalLiabilities: 240000
          },
          equity: {
            capital: [
              { category: 'Share Capital', amount: 200000, percentage: 80 }
            ],
            retainedEarnings: [
              { category: 'Retained Earnings', amount: 60000, percentage: 24 }
            ],
            totalEquity: 260000
          }
        },
        message: 'Balance sheet generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getBalanceSheet');

    // Mock cash flow data
    cy.intercept('GET', '**/financial-reports/cash-flow*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          period: 'Q1 2024',
          operatingActivities: [
            { category: 'Net Income', amount: 12000, type: 'operating' as const },
            { category: 'Depreciation', amount: 3000, type: 'operating' as const },
            { category: 'Increase in Accounts Receivable', amount: -15000, type: 'operating' as const },
            { category: 'Increase in Accounts Payable', amount: 8000, type: 'operating' as const }
          ],
          investingActivities: [
            { category: 'Purchase of Equipment', amount: -30000, type: 'investing' as const },
            { category: 'Sale of Investments', amount: 5000, type: 'investing' as const }
          ],
          financingActivities: [
            { category: 'Loan Proceeds', amount: 20000, type: 'financing' as const },
            { category: 'Dividend Payments', amount: -5000, type: 'financing' as const }
          ],
          netCashFlow: 2000,
          openingCashBalance: 48000,
          closingCashBalance: 50000
        },
        message: 'Cash flow statement generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getCashFlow');

    // Mock tax compliance data
    cy.intercept('GET', '**/financial-reports/tax-compliance*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            taxType: 'Sales Tax',
            period: 'Q1 2024',
            amount: 12000,
            status: 'compliant' as const,
            dueDate: '2024-04-15'
          },
          {
            taxType: 'Income Tax',
            period: 'Q1 2024',
            amount: 8000,
            status: 'pending' as const,
            dueDate: '2024-04-30'
          }
        ],
        message: 'Tax compliance report generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getTaxCompliance');

    // Mock financial summary data
    cy.intercept('GET', '**/financial-reports/summary*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          totalRevenue: 168000,
          totalExpenses: 152000,
          netProfit: 16000,
          totalAssets: 500000,
          totalLiabilities: 240000,
          totalEquity: 260000,
          cashPosition: 50000,
          accountsReceivable: 75000,
          accountsPayable: 80000,
          profitMargin: 9.52,
          returnOnAssets: 3.2
        },
        message: 'Financial summary generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getFinancialSummary');

    // Login and navigate to financial reports
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('accountant1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should generate and display profit & loss statement with accurate calculations', () => {
    // Navigate to financial reports
    cy.visit('/financial-reports');
    cy.wait('@getFinancialSummary');

    // Click on Profit & Loss tab or navigate to P&L report
    cy.get('[data-cy="profit-loss-tab"]').click();
    cy.wait('@getProfitLoss');

    // Verify report header
    cy.get('[data-cy="report-title"]').should('contain', 'Profit & Loss Statement');
    cy.get('[data-cy="report-period"]').should('contain', 'Q1 2024');
    cy.get('[data-cy="generated-at"]').should('exist');

    // Verify revenue section
    cy.get('[data-cy="revenue-section"]').within(() => {
      cy.get('[data-cy="sales-revenue"]').should('contain', '₨150,000');
      cy.get('[data-cy="equipment-sales"]').should('contain', '₨15,000');
      cy.get('[data-cy="other-sales"]').should('contain', '₨1,000');
      cy.get('[data-cy="interest-income"]').should('contain', '₨2,000');
      cy.get('[data-cy="total-revenue"]').should('contain', '₨168,000');
    });

    // Verify expenses section
    cy.get('[data-cy="expenses-section"]').within(() => {
      cy.get('[data-cy="medicine-cogs"]').should('contain', '₨90,000');
      cy.get('[data-cy="equipment-cogs"]').should('contain', '₨10,000');
      cy.get('[data-cy="salaries"]').should('contain', '₨25,000');
      cy.get('[data-cy="rent"]').should('contain', '₨15,000');
      cy.get('[data-cy="utilities"]').should('contain', '₨5,000');
      cy.get('[data-cy="marketing"]').should('contain', '₨8,000');
      cy.get('[data-cy="depreciation"]').should('contain', '₨3,000');
      cy.get('[data-cy="interest-expense"]').should('contain', '₨2,000');
      cy.get('[data-cy="total-expenses"]').should('contain', '₨152,000');
    });

    // Verify profit calculations
    cy.get('[data-cy="gross-profit"]').should('contain', '₨16,000'); // 168000 - 152000
    cy.get('[data-cy="profit-before-tax"]').should('contain', '₨16,000');
    cy.get('[data-cy="tax-expense"]').should('contain', '₨4,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨12,000');

    // Test export functionality
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('PDF').click();

    cy.intercept('GET', '**/financial-reports/profit-loss/export*', {
      statusCode: 200,
      body: new Blob(['mock,pdf,data'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' }
    }).as('exportPL');

    cy.wait('@exportPL');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Export completed successfully');
  });

  it('should generate and display balance sheet with proper asset/liability/equity breakdown', () => {
    // Navigate to balance sheet
    cy.visit('/financial-reports');
    cy.get('[data-cy="balance-sheet-tab"]').click();
    cy.wait('@getBalanceSheet');

    // Verify report header
    cy.get('[data-cy="report-title"]').should('contain', 'Balance Sheet');
    cy.get('[data-cy="report-period"]').should('contain', 'March 2024');

    // Verify assets section
    cy.get('[data-cy="assets-section"]').within(() => {
      // Current assets
      cy.get('[data-cy="cash-equivalents"]').should('contain', '₨50,000');
      cy.get('[data-cy="accounts-receivable"]').should('contain', '₨75,000');
      cy.get('[data-cy="inventory"]').should('contain', '₨60,000');
      cy.get('[data-cy="prepaid-expenses"]').should('contain', '₨15,000');
      cy.get('[data-cy="total-current-assets"]').should('contain', '₨200,000');

      // Fixed assets
      cy.get('[data-cy="buildings"]').should('contain', '₨200,000');
      cy.get('[data-cy="equipment"]').should('contain', '₨100,000');
      cy.get('[data-cy="total-fixed-assets"]').should('contain', '₨300,000');

      // Total assets
      cy.get('[data-cy="total-assets"]').should('contain', '₨500,000');
    });

    // Verify liabilities section
    cy.get('[data-cy="liabilities-section"]').within(() => {
      // Current liabilities
      cy.get('[data-cy="accounts-payable"]').should('contain', '₨80,000');
      cy.get('[data-cy="short-term-loans"]').should('contain', '₨30,000');
      cy.get('[data-cy="accrued-expenses"]').should('contain', '₨30,000');
      cy.get('[data-cy="total-current-liabilities"]').should('contain', '₨140,000');

      // Long-term liabilities
      cy.get('[data-cy="long-term-loans"]').should('contain', '₨100,000');
      cy.get('[data-cy="total-long-term-liabilities"]').should('contain', '₨100,000');

      // Total liabilities
      cy.get('[data-cy="total-liabilities"]').should('contain', '₨240,000');
    });

    // Verify equity section
    cy.get('[data-cy="equity-section"]').within(() => {
      cy.get('[data-cy="share-capital"]').should('contain', '₨200,000');
      cy.get('[data-cy="retained-earnings"]').should('contain', '₨60,000');
      cy.get('[data-cy="total-equity"]').should('contain', '₨260,000');
    });

    // Verify balance equation
    cy.get('[data-cy="total-liabilities-equity"]').should('contain', '₨500,000'); // Should equal total assets

    // Test export functionality
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('Excel').click();

    cy.intercept('GET', '**/financial-reports/balance-sheet/export*', {
      statusCode: 200,
      body: new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }).as('exportBS');

    cy.wait('@exportBS');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Export completed successfully');
  });

  it('should generate cash flow statement with operating/investing/financing activities', () => {
    // Navigate to cash flow statement
    cy.visit('/financial-reports');
    cy.get('[data-cy="cash-flow-tab"]').click();
    cy.wait('@getCashFlow');

    // Verify report header
    cy.get('[data-cy="report-title"]').should('contain', 'Cash Flow Statement');
    cy.get('[data-cy="report-period"]').should('contain', 'Q1 2024');

    // Verify operating activities
    cy.get('[data-cy="operating-activities"]').within(() => {
      cy.get('[data-cy="net-income"]').should('contain', '₨12,000');
      cy.get('[data-cy="depreciation"]').should('contain', '₨3,000');
      cy.get('[data-cy="increase-accounts-receivable"]').should('contain', '₨-15,000');
      cy.get('[data-cy="increase-accounts-payable"]').should('contain', '₨8,000');
      cy.get('[data-cy="net-cash-operating"]').should('contain', '₨8,000');
    });

    // Verify investing activities
    cy.get('[data-cy="investing-activities"]').within(() => {
      cy.get('[data-cy="purchase-equipment"]').should('contain', '₨-30,000');
      cy.get('[data-cy="sale-investments"]').should('contain', '₨5,000');
      cy.get('[data-cy="net-cash-investing"]').should('contain', '₨-25,000');
    });

    // Verify financing activities
    cy.get('[data-cy="financing-activities"]').within(() => {
      cy.get('[data-cy="loan-proceeds"]').should('contain', '₨20,000');
      cy.get('[data-cy="dividend-payments"]').should('contain', '₨-5,000');
      cy.get('[data-cy="net-cash-financing"]').should('contain', '₨15,000');
    });

    // Verify cash flow summary
    cy.get('[data-cy="net-cash-flow"]').should('contain', '₨2,000'); // 8000 - 25000 + 15000
    cy.get('[data-cy="opening-cash-balance"]').should('contain', '₨48,000');
    cy.get('[data-cy="closing-cash-balance"]').should('contain', '₨50,000');

    // Test export functionality
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('CSV').click();

    cy.intercept('GET', '**/financial-reports/cash-flow/export*', {
      statusCode: 200,
      body: new Blob(['mock,csv,data'], { type: 'text/csv' }),
      headers: { 'content-type': 'text/csv' }
    }).as('exportCF');

    cy.wait('@exportCF');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Export completed successfully');
  });

  it('should display tax compliance report with status tracking', () => {
    // Navigate to tax compliance report
    cy.visit('/financial-reports');
    cy.get('[data-cy="tax-compliance-tab"]').click();
    cy.wait('@getTaxCompliance');

    // Verify report header
    cy.get('[data-cy="report-title"]').should('contain', 'Tax Compliance Report');

    // Verify tax items
    cy.get('[data-cy="tax-item"]').should('have.length', 2);

    // First tax item - compliant
    cy.get('[data-cy="tax-item"]').first().within(() => {
      cy.get('[data-cy="tax-type"]').should('contain', 'Sales Tax');
      cy.get('[data-cy="tax-period"]').should('contain', 'Q1 2024');
      cy.get('[data-cy="tax-amount"]').should('contain', '₨12,000');
      cy.get('[data-cy="tax-status"]').should('contain', 'Compliant');
      cy.get('[data-cy="tax-due-date"]').should('contain', '2024-04-15');
      cy.get('[data-cy="status-indicator"]').should('have.class', 'compliant');
    });

    // Second tax item - pending
    cy.get('[data-cy="tax-item"]').last().within(() => {
      cy.get('[data-cy="tax-type"]').should('contain', 'Income Tax');
      cy.get('[data-cy="tax-period"]').should('contain', 'Q1 2024');
      cy.get('[data-cy="tax-amount"]').should('contain', '₨8,000');
      cy.get('[data-cy="tax-status"]').should('contain', 'Pending');
      cy.get('[data-cy="tax-due-date"]').should('contain', '2024-04-30');
      cy.get('[data-cy="status-indicator"]').should('have.class', 'pending');
    });

    // Verify summary statistics
    cy.get('[data-cy="total-taxes"]').should('contain', '₨20,000');
    cy.get('[data-cy="compliant-count"]').should('contain', '1');
    cy.get('[data-cy="pending-count"]').should('contain', '1');
    cy.get('[data-cy="overdue-count"]').should('contain', '0');
  });

  it('should display financial summary dashboard with key metrics and KPIs', () => {
    // Navigate to financial reports dashboard
    cy.visit('/financial-reports');
    cy.wait('@getFinancialSummary');

    // Verify dashboard title
    cy.get('[data-cy="dashboard-title"]').should('contain', 'Financial Summary Dashboard');

    // Verify key financial metrics
    cy.get('[data-cy="total-revenue"]').should('contain', '₨168,000');
    cy.get('[data-cy="total-expenses"]').should('contain', '₨152,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨16,000');
    cy.get('[data-cy="total-assets"]').should('contain', '₨500,000');
    cy.get('[data-cy="total-liabilities"]').should('contain', '₨240,000');
    cy.get('[data-cy="total-equity"]').should('contain', '₨260,000');

    // Verify working capital metrics
    cy.get('[data-cy="cash-position"]').should('contain', '₨50,000');
    cy.get('[data-cy="accounts-receivable"]').should('contain', '₨75,000');
    cy.get('[data-cy="accounts-payable"]').should('contain', '₨80,000');

    // Verify profitability ratios
    cy.get('[data-cy="profit-margin"]').should('contain', '9.52%');
    cy.get('[data-cy="return-on-assets"]').should('contain', '3.20%');

    // Verify chart visualizations (assuming charts are present)
    cy.get('[data-cy="revenue-expenses-chart"]').should('be.visible');
    cy.get('[data-cy="assets-liabilities-chart"]').should('be.visible');
    cy.get('[data-cy="profit-trend-chart"]').should('be.visible');

    // Test period selection
    cy.get('[data-cy="period-selector"]').click();
    cy.get('mat-option').contains('Yearly').click();

    // Should reload data for yearly period
    cy.intercept('GET', '**/financial-reports/summary*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          totalRevenue: 650000,
          totalExpenses: 580000,
          netProfit: 70000,
          totalAssets: 520000,
          totalLiabilities: 250000,
          totalEquity: 270000,
          cashPosition: 55000,
          accountsReceivable: 80000,
          accountsPayable: 85000,
          profitMargin: 10.77,
          returnOnAssets: 13.46
        },
        message: 'Financial summary generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getYearlySummary');

    cy.wait('@getYearlySummary');

    // Verify updated metrics for yearly period
    cy.get('[data-cy="total-revenue"]').should('contain', '₨650,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨70,000');
    cy.get('[data-cy="profit-margin"]').should('contain', '10.77%');
  });

  it('should handle report generation errors and edge cases gracefully', () => {
    // Test invalid date range
    cy.visit('/financial-reports');
    cy.get('[data-cy="profit-loss-tab"]').click();

    // Try to generate report with invalid dates
    cy.intercept('GET', '**/financial-reports/profit-loss*', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Invalid date range: Start date must be before end date'
      }
    }).as('invalidDateRange');

    cy.get('[data-cy="custom-date-range"]').click();
    cy.get('input[formControlName="startDate"]').type('2024-12-31');
    cy.get('input[formControlName="endDate"]').type('2024-01-01');
    cy.get('[data-cy="generate-report-button"]').click();

    cy.wait('@invalidDateRange');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invalid date range: Start date must be before end date');

    // Test report generation timeout
    cy.intercept('GET', '**/financial-reports/profit-loss*', {
      statusCode: 504,
      body: {
        success: false,
        message: 'Report generation timed out. Please try again.'
      }
    }).as('reportTimeout');

    cy.get('input[formControlName="startDate"]').clear().type('2024-01-01');
    cy.get('input[formControlName="endDate"]').clear().type('2024-03-31');
    cy.get('[data-cy="generate-report-button"]').click();

    cy.wait('@reportTimeout');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Report generation timed out. Please try again.');

    // Test no data available
    cy.intercept('GET', '**/financial-reports/profit-loss*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          period: 'Q1 2024',
          revenue: {
            sales: [],
            otherIncome: [],
            totalRevenue: 0
          },
          expenses: {
            costOfGoodsSold: [],
            operatingExpenses: [],
            otherExpenses: [],
            totalExpenses: 0
          },
          profitBeforeTax: 0,
          taxExpense: 0,
          netProfit: 0
        },
        message: 'No financial data available for the selected period',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('noDataAvailable');

    cy.get('[data-cy="generate-report-button"]').click();
    cy.wait('@noDataAvailable');

    // Should show no data message
    cy.get('[data-cy="no-data-message"]').should('be.visible');
    cy.get('[data-cy="no-data-message"]').should('contain', 'No financial data available for the selected period');
  });

  it('should maintain data integrity across all reports and calculations', () => {
    // Generate all reports and verify cross-report consistency
    cy.visit('/financial-reports');

    // Wait for all initial data loads
    cy.wait(['@getFinancialSummary', '@getProfitLoss', '@getBalanceSheet', '@getCashFlow', '@getTaxCompliance']);

    // Verify P&L totals match summary
    cy.get('[data-cy="profit-loss-tab"]').click();
    cy.get('[data-cy="total-revenue"]').should('contain', '₨168,000');
    cy.get('[data-cy="total-expenses"]').should('contain', '₨152,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨12,000');

    // Verify balance sheet balances
    cy.get('[data-cy="balance-sheet-tab"]').click();
    cy.get('[data-cy="total-assets"]').should('contain', '₨500,000');
    cy.get('[data-cy="total-liabilities"]').should('contain', '₨240,000');
    cy.get('[data-cy="total-equity"]').should('contain', '₨260,000');
    cy.get('[data-cy="total-liabilities-equity"]').should('contain', '₨500,000');

    // Verify cash flow reconciliation
    cy.get('[data-cy="cash-flow-tab"]').click();
    cy.get('[data-cy="opening-cash-balance"]').should('contain', '₨48,000');
    cy.get('[data-cy="net-cash-flow"]').should('contain', '₨2,000');
    cy.get('[data-cy="closing-cash-balance"]').should('contain', '₨50,000');

    // Verify cash balance matches balance sheet
    cy.get('[data-cy="balance-sheet-tab"]').click();
    cy.get('[data-cy="cash-equivalents"]').should('contain', '₨50,000');

    // Verify tax amounts are consistent
    cy.get('[data-cy="tax-compliance-tab"]').click();
    cy.get('[data-cy="tax-amount"]').first().should('contain', '₨12,000'); // Sales tax

    // Verify summary dashboard matches detailed reports
    cy.get('[data-cy="dashboard-tab"]').click();
    cy.get('[data-cy="total-revenue"]').should('contain', '₨168,000');
    cy.get('[data-cy="total-expenses"]').should('contain', '₨152,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨16,000');
    cy.get('[data-cy="total-assets"]').should('contain', '₨500,000');
    cy.get('[data-cy="total-liabilities"]').should('contain', '₨240,000');
    cy.get('[data-cy="total-equity"]').should('contain', '₨260,000');
  });

  it('should export reports in multiple formats with proper data formatting', () => {
    // Navigate to profit & loss report
    cy.visit('/financial-reports');
    cy.get('[data-cy="profit-loss-tab"]').click();
    cy.wait('@getProfitLoss');

    // Test PDF export
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('PDF').click();

    cy.intercept('GET', '**/financial-reports/profit-loss/export*', {
      statusCode: 200,
      body: new Blob(['mock,pdf,data'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' }
    }).as('exportPLPDF');

    cy.wait('@exportPLPDF');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'PDF export completed successfully');

    // Test Excel export
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('Excel').click();

    cy.intercept('GET', '**/financial-reports/profit-loss/export*', {
      statusCode: 200,
      body: new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }).as('exportPLExcel');

    cy.wait('@exportPLExcel');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Excel export completed successfully');

    // Test CSV export
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('CSV').click();

    cy.intercept('GET', '**/financial-reports/profit-loss/export*', {
      statusCode: 200,
      body: new Blob(['mock,csv,data'], { type: 'text/csv' }),
      headers: { 'content-type': 'text/csv' }
    }).as('exportPLCSV');

    cy.wait('@exportPLCSV');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'CSV export completed successfully');

    // Test export with custom date range
    cy.get('[data-cy="custom-date-range"]').click();
    cy.get('input[formControlName="startDate"]').type('2024-01-01');
    cy.get('input[formControlName="endDate"]').type('2024-06-30');
    cy.get('[data-cy="period-selector"]').click();
    cy.get('mat-option').contains('Custom').click();

    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('PDF').click();

    cy.intercept('GET', '**/financial-reports/profit-loss/export*', {
      statusCode: 200,
      body: new Blob(['mock,custom,pdf,data'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' }
    }).as('exportCustomRange');

    cy.wait('@exportCustomRange');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'PDF export completed successfully');
  });

  it('should handle comparative analysis and trend reporting', () => {
    // Navigate to comparative reports
    cy.visit('/financial-reports');
    cy.get('[data-cy="comparative-analysis-tab"]').click();

    // Mock comparative data for balance sheets
    cy.intercept('GET', '**/financial-reports/comparative*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          reportType: 'balance_sheet',
          periods: [
            {
              label: 'Q1 2024',
              data: {
                totalAssets: 500000,
                totalLiabilities: 240000,
                totalEquity: 260000,
                currentRatio: 1.43
              }
            },
            {
              label: 'Q1 2023',
              data: {
                totalAssets: 450000,
                totalLiabilities: 220000,
                totalEquity: 230000,
                currentRatio: 1.35
              }
            }
          ],
          variances: {
            totalAssets: { amount: 50000, percentage: 11.11 },
            totalLiabilities: { amount: 20000, percentage: 9.09 },
            totalEquity: { amount: 30000, percentage: 13.04 },
            currentRatio: { amount: 0.08, percentage: 5.93 }
          }
        },
        message: 'Comparative analysis generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getComparativeData');

    // Select report type and periods
    cy.get('[data-cy="report-type-selector"]').click();
    cy.get('mat-option').contains('Balance Sheet').click();
    cy.get('[data-cy="period-1"]').type('2024-01-01 to 2024-03-31');
    cy.get('[data-cy="period-2"]').type('2023-01-01 to 2023-03-31');
    cy.get('[data-cy="generate-comparative-button"]').click();

    cy.wait('@getComparativeData');

    // Verify comparative data display
    cy.get('[data-cy="comparative-table"]').within(() => {
      cy.get('[data-cy="period-column"]').should('contain', 'Q1 2024').and('contain', 'Q1 2023');
      cy.get('[data-cy="variance-column"]').should('contain', 'Variance');
    });

    // Verify variance calculations
    cy.get('[data-cy="total-assets-variance"]').should('contain', '₨50,000').and('contain', '11.11%');
    cy.get('[data-cy="total-equity-variance"]').should('contain', '₨30,000').and('contain', '13.04%');

    // Test trend analysis
    cy.get('[data-cy="trend-analysis-tab"]').click();

    // Mock trend data
    cy.intercept('GET', '**/financial-reports/trends*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          metric: 'revenue',
          periodType: 'quarterly',
          periods: 4,
          trend: [
            { period: 'Q1 2023', value: 140000, change: 0, changePercent: 0 },
            { period: 'Q2 2023', value: 155000, change: 15000, changePercent: 10.71 },
            { period: 'Q3 2023', value: 162000, change: 7000, changePercent: 4.52 },
            { period: 'Q4 2023', value: 168000, change: 6000, changePercent: 3.70 }
          ],
          averageGrowth: 4.73,
          volatility: 3.45
        },
        message: 'Trend analysis generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      }
    }).as('getTrendData');

    cy.get('[data-cy="metric-selector"]').click();
    cy.get('mat-option').contains('Revenue').click();
    cy.get('[data-cy="period-type-selector"]').click();
    cy.get('mat-option').contains('Quarterly').click();
    cy.get('input[formControlName="periods"]').type('4');
    cy.get('[data-cy="generate-trend-button"]').click();

    cy.wait('@getTrendData');

    // Verify trend chart and statistics
    cy.get('[data-cy="trend-chart"]').should('be.visible');
    cy.get('[data-cy="average-growth"]').should('contain', '4.73%');
    cy.get('[data-cy="volatility"]').should('contain', '3.45%');

    // Verify trend data points
    cy.get('[data-cy="trend-data-point"]').should('have.length', 4);
    cy.get('[data-cy="trend-data-point"]').first().should('contain', 'Q1 2023').and('contain', '₨140,000');
    cy.get('[data-cy="trend-data-point"]').last().should('contain', 'Q4 2023').and('contain', '₨168,000');
  });
});
