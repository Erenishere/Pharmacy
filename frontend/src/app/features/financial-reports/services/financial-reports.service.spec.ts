import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { FinancialReportsService, ProfitLossStatement, BalanceSheet, CashFlowStatement, FinancialSummary, TaxComplianceItem } from './financial-reports.service';

describe('FinancialReportsService', () => {
  let service: FinancialReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FinancialReportsService]
    });

    service = TestBed.inject(FinancialReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getProfitLossStatement', () => {
    it('should fetch profit and loss statement with query parameters', () => {
      const mockParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockResponse = {
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
      };

      service.getProfitLossStatement(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.period).toBe('Q1 2024');
        expect(response.data.revenue.totalRevenue).toBe(168000);
        expect(response.data.expenses.totalExpenses).toBe(152000);
        expect(response.data.netProfit).toBe(12000);
        expect(response.generatedAt).toBe('2024-04-01T10:00:00Z');
      });

      const req = httpMock.expectOne(req => req.url.includes('/profit-loss'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockResponse);
    });
  });

  describe('getBalanceSheet', () => {
    it('should fetch balance sheet with query parameters', () => {
      const mockParams = { startDate: '2024-03-31', endDate: '2024-03-31', period: 'monthly' as const };
      const mockResponse = {
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
      };

      service.getBalanceSheet(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.period).toBe('March 2024');
        expect(response.data.assets.totalAssets).toBe(500000);
        expect(response.data.liabilities.totalLiabilities).toBe(240000);
        expect(response.data.equity.totalEquity).toBe(260000);
        expect(response.generatedAt).toBe('2024-04-01T10:00:00Z');
      });

      const req = httpMock.expectOne(req => req.url.includes('/balance-sheet'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-03-31');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('monthly');
      req.flush(mockResponse);
    });
  });

  describe('getCashFlowStatement', () => {
    it('should fetch cash flow statement with query parameters', () => {
      const mockParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockResponse = {
        success: true,
        data: {
          period: 'Q1 2024',
          operatingActivities: [
            { category: 'Net Income', amount: 25000, type: 'operating' as const },
            { category: 'Depreciation', amount: 5000, type: 'operating' as const },
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
      };

      service.getCashFlowStatement(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.period).toBe('Q1 2024');
        expect(response.data.netCashFlow).toBe(2000);
        expect(response.data.openingCashBalance).toBe(48000);
        expect(response.data.closingCashBalance).toBe(50000);
        expect(response.data.operatingActivities).toHaveLength(4);
        expect(response.data.investingActivities).toHaveLength(2);
        expect(response.data.financingActivities).toHaveLength(2);
      });

      const req = httpMock.expectOne(req => req.url.includes('/cash-flow'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockResponse);
    });
  });

  describe('getTaxComplianceReport', () => {
    it('should fetch tax compliance report with query parameters', () => {
      const mockParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockResponse = {
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
          },
          {
            taxType: 'Withholding Tax',
            period: 'Q1 2024',
            amount: 3000,
            status: 'overdue' as const,
            dueDate: '2024-04-10'
          }
        ],
        message: 'Tax compliance report generated successfully',
        generatedAt: '2024-04-01T10:00:00Z'
      };

      service.getTaxComplianceReport(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(3);
        expect(response.data[0].taxType).toBe('Sales Tax');
        expect(response.data[0].status).toBe('compliant');
        expect(response.data[1].status).toBe('pending');
        expect(response.data[2].status).toBe('overdue');
        expect(response.generatedAt).toBe('2024-04-01T10:00:00Z');
      });

      const req = httpMock.expectOne(req => req.url.includes('/tax-compliance'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockResponse);
    });
  });

  describe('getFinancialSummary', () => {
    it('should fetch financial summary dashboard data', () => {
      const mockParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockResponse = {
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
      };

      service.getFinancialSummary(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalRevenue).toBe(168000);
        expect(response.data.totalExpenses).toBe(152000);
        expect(response.data.netProfit).toBe(16000);
        expect(response.data.totalAssets).toBe(500000);
        expect(response.data.totalLiabilities).toBe(240000);
        expect(response.data.totalEquity).toBe(260000);
        expect(response.data.profitMargin).toBe(9.52);
        expect(response.data.returnOnAssets).toBe(3.2);
      });

      const req = httpMock.expectOne(req => req.url.includes('/summary'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockResponse);
    });
  });

  describe('exportProfitLoss', () => {
    it('should export profit and loss statement in PDF format', () => {
      const exportParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockBlob = new Blob(['mock,pdf,data'], { type: 'application/pdf' });

      service.exportProfitLoss(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/profit-loss/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockBlob);
    });
  });

  describe('exportBalanceSheet', () => {
    it('should export balance sheet in Excel format', () => {
      const exportParams = { startDate: '2024-03-31', endDate: '2024-03-31', period: 'monthly' as const };
      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportBalanceSheet(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/balance-sheet/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-03-31');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('monthly');
      req.flush(mockBlob);
    });
  });

  describe('exportCashFlow', () => {
    it('should export cash flow statement in CSV format', () => {
      const exportParams = { startDate: '2024-01-01', endDate: '2024-03-31', period: 'quarterly' as const };
      const mockBlob = new Blob(['mock,csv,data'], { type: 'text/csv' });

      service.exportCashFlow(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/cash-flow/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('period')).toBe('quarterly');
      req.flush(mockBlob);
    });
  });
});
