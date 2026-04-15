import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AccountingService, Account, LedgerEntry, JournalEntry, JournalEntryLine } from './accounting.service';

describe('AccountingService', () => {
  let service: AccountingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AccountingService]
    });

    service = TestBed.inject(AccountingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAccounts', () => {
    it('should fetch accounts with query parameters', () => {
      const mockParams = { type: 'asset', subtype: 'current_asset', isActive: true, page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'ACC001',
            accountNumber: '1001',
            name: 'Cash in Hand',
            type: 'asset',
            subtype: 'current_asset',
            level: 1,
            isActive: true,
            openingBalance: 0,
            currentBalance: 50000,
            debitTotal: 75000,
            creditTotal: 25000,
            createdDate: '2024-01-01',
            lastUpdated: '2024-03-20',
            createdBy: 'admin'
          },
          {
            id: 'ACC002',
            accountNumber: '1002',
            name: 'Bank Account',
            type: 'asset',
            subtype: 'current_asset',
            level: 1,
            isActive: true,
            openingBalance: 100000,
            currentBalance: 150000,
            debitTotal: 200000,
            creditTotal: 150000,
            createdDate: '2024-01-01',
            lastUpdated: '2024-03-20',
            createdBy: 'admin'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      service.getAccounts(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].accountNumber).toBe('1001');
        expect(response.data[0].type).toBe('asset');
        expect(response.data[0].currentBalance).toBe(50000);
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/accounts'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('type')).toBe('asset');
      expect(req.request.params.get('subtype')).toBe('current_asset');
      expect(req.request.params.get('isActive')).toBe('true');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getAccountById', () => {
    it('should fetch a single account by ID', () => {
      const mockAccount: Account = {
        id: 'ACC001',
        accountNumber: '1001',
        name: 'Cash in Hand',
        type: 'asset',
        subtype: 'current_asset',
        level: 1,
        isActive: true,
        description: 'Physical cash maintained for daily operations',
        openingBalance: 0,
        currentBalance: 50000,
        debitTotal: 75000,
        creditTotal: 25000,
        createdDate: '2024-01-01',
        lastUpdated: '2024-03-20',
        createdBy: 'admin'
      };

      const mockResponse = { success: true, data: mockAccount };

      service.getAccountById('ACC001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('ACC001');
        expect(response.data.accountNumber).toBe('1001');
        expect(response.data.type).toBe('asset');
        expect(response.data.currentBalance).toBe(50000);
        expect(response.data.description).toBe('Physical cash maintained for daily operations');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/accounts/ACC001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createAccount', () => {
    it('should create a new account', () => {
      const newAccount = {
        accountNumber: '2001',
        name: 'Accounts Payable',
        type: 'liability' as const,
        subtype: 'current_liability' as const,
        description: 'Amounts owed to suppliers',
        openingBalance: 0
      };

      const mockCreatedAccount: Account = {
        ...newAccount,
        id: 'ACC003',
        level: 1,
        isActive: true,
        currentBalance: 0,
        debitTotal: 0,
        creditTotal: 0,
        createdDate: '2024-03-20',
        lastUpdated: '2024-03-20',
        createdBy: 'accountant'
      };

      const mockResponse = { success: true, data: mockCreatedAccount };

      service.createAccount(newAccount).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('ACC003');
        expect(response.data.accountNumber).toBe('2001');
        expect(response.data.type).toBe('liability');
        expect(response.data.currentBalance).toBe(0);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/accounts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newAccount);
      req.flush(mockResponse);
    });
  });

  describe('getAccountHierarchy', () => {
    it('should fetch account hierarchy', () => {
      const mockHierarchy: Account[] = [
        {
          id: 'ACC001',
          accountNumber: '1000',
          name: 'Assets',
          type: 'asset',
          subtype: 'current_asset',
          level: 1,
          isActive: true,
          openingBalance: 0,
          currentBalance: 200000,
          debitTotal: 275000,
          creditTotal: 75000,
          createdDate: '2024-01-01',
          lastUpdated: '2024-03-20',
          createdBy: 'admin'
        },
        {
          id: 'ACC002',
          accountNumber: '1001',
          name: 'Current Assets',
          type: 'asset',
          subtype: 'current_asset',
          parentId: 'ACC001',
          parentAccount: 'Assets',
          level: 2,
          isActive: true,
          openingBalance: 0,
          currentBalance: 150000,
          debitTotal: 200000,
          creditTotal: 50000,
          createdDate: '2024-01-01',
          lastUpdated: '2024-03-20',
          createdBy: 'admin'
        }
      ];

      const mockResponse = { success: true, data: mockHierarchy };

      service.getAccountHierarchy().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].level).toBe(1);
        expect(response.data[1].parentId).toBe('ACC001');
        expect(response.data[1].level).toBe(2);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/accounts/hierarchy`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getLedgerEntries', () => {
    it('should fetch ledger entries with filters', () => {
      const mockParams = { accountId: 'ACC001', startDate: '2024-03-01', endDate: '2024-03-31', transactionType: 'invoice', page: 1, limit: 20 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC001',
            accountNumber: '1001',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-15',
            transactionId: 'INV001',
            transactionType: 'invoice',
            referenceNumber: 'INV-2024-001',
            description: 'Sale of medicines',
            debit: 0,
            credit: 5000,
            balance: 45000,
            sourceModule: 'sales',
            sourceId: 'INV001',
            createdBy: 'salesman1',
            createdDate: '2024-03-15T10:00:00Z'
          },
          {
            id: 'LED002',
            accountId: 'ACC001',
            accountNumber: '1001',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-20',
            transactionId: 'PAY001',
            transactionType: 'payment',
            referenceNumber: 'PAY-2024-001',
            description: 'Cash payment received',
            debit: 3000,
            credit: 0,
            balance: 48000,
            sourceModule: 'sales',
            sourceId: 'PAY001',
            createdBy: 'cashier',
            createdDate: '2024-03-20T14:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };

      service.getLedgerEntries(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].transactionType).toBe('invoice');
        expect(response.data[0].credit).toBe(5000);
        expect(response.data[1].debit).toBe(3000);
        expect(response.data[1].balance).toBe(48000);
      });

      const req = httpMock.expectOne(req => req.url.includes('/ledger'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('accountId')).toBe('ACC001');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      expect(req.request.params.get('transactionType')).toBe('invoice');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockResponse);
    });
  });

  describe('createJournalEntry', () => {
    it('should create a new journal entry', () => {
      const newEntry = {
        entryDate: '2024-03-20',
        description: 'Monthly depreciation expense',
        referenceNumber: 'DEP-2024-03',
        lines: [
          {
            accountId: 'ACC004',
            accountNumber: '5001',
            accountName: 'Depreciation Expense',
            description: 'Equipment depreciation',
            debit: 5000,
            credit: 0
          },
          {
            accountId: 'ACC005',
            accountNumber: '1301',
            accountName: 'Accumulated Depreciation',
            description: 'Equipment depreciation',
            debit: 0,
            credit: 5000
          }
        ]
      };

      const mockCreatedEntry: JournalEntry = {
        ...newEntry,
        id: 'JE001',
        entryNumber: 'JE-2024-001',
        totalDebit: 5000,
        totalCredit: 5000,
        status: 'draft',
        createdBy: 'accountant'
      };

      const mockResponse = { success: true, data: mockCreatedEntry };

      service.createJournalEntry(newEntry).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('JE001');
        expect(response.data.entryNumber).toBe('JE-2024-001');
        expect(response.data.totalDebit).toBe(5000);
        expect(response.data.totalCredit).toBe(5000);
        expect(response.data.status).toBe('draft');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/journal-entries`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newEntry);
      req.flush(mockResponse);
    });
  });

  describe('postJournalEntry', () => {
    it('should post a journal entry', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'JE001',
          status: 'posted',
          postedBy: 'accountant',
          postedDate: '2024-03-20T15:00:00Z'
        }
      };

      service.postJournalEntry('JE001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('posted');
        expect(response.data.postedBy).toBe('accountant');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/journal-entries/JE001/post`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getAccountBalances', () => {
    it('should fetch account balances', () => {
      const mockParams = { asOfDate: '2024-03-31', accountType: 'asset' };
      const mockResponse = {
        success: true,
        data: {
          totalAssets: 200000,
          totalLiabilities: 75000,
          totalEquity: 125000,
          accounts: [
            {
              accountId: 'ACC001',
              accountNumber: '1001',
              accountName: 'Cash in Hand',
              type: 'asset',
              balance: 50000
            },
            {
              accountId: 'ACC002',
              accountNumber: '1002',
              accountName: 'Bank Account',
              type: 'asset',
              balance: 150000
            }
          ]
        }
      };

      service.getAccountBalances(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalAssets).toBe(200000);
        expect(response.data.accounts).toHaveLength(2);
        expect(response.data.accounts[0].balance).toBe(50000);
      });

      const req = httpMock.expectOne(req => req.url.includes('/balances'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('asOfDate')).toBe('2024-03-31');
      expect(req.request.params.get('accountType')).toBe('asset');
      req.flush(mockResponse);
    });
  });

  describe('validateJournalEntry', () => {
    it('should validate a correct journal entry', () => {
      const validEntry = {
        description: 'Valid journal entry',
        lines: [
          { accountId: 'ACC001', debit: 1000, credit: 0 },
          { accountId: 'ACC002', debit: 0, credit: 1000 }
        ]
      };

      const result = service.validateJournalEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidEntry = {
        description: '',
        lines: [
          { accountId: '', debit: 1000, credit: 500 }, // Missing account and both debit/credit
          { accountId: 'ACC002', debit: 0, credit: 0 }, // No amounts
          { accountId: 'ACC003', debit: 2000, credit: 0 } // Unbalanced
        ]
      };

      const result = service.validateJournalEntry(invalidEntry);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain('Total debits must equal total credits');
      expect(result.errors).toContain('Line 1: Account is required');
      expect(result.errors).toContain('Line 1: Cannot have both debit and credit amounts');
      expect(result.errors).toContain('Line 2: Must have either debit or credit amount');
    });
  });

  describe('validateAccount', () => {
    it('should validate a correct account', () => {
      const validAccount = {
        name: 'Test Account',
        type: 'asset' as const,
        accountNumber: '1003',
        openingBalance: 1000
      };

      const result = service.validateAccount(validAccount);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidAccount = {
        name: '',
        type: undefined,
        accountNumber: '',
        openingBalance: -100
      };

      const result = service.validateAccount(invalidAccount);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Account name is required');
      expect(result.errors).toContain('Account type is required');
      expect(result.errors).toContain('Account number is required');
      expect(result.errors).toContain('Opening balance cannot be negative');
    });
  });

  describe('calculateAccountBalance', () => {
    it('should calculate balance correctly for asset accounts', () => {
      expect(service.calculateAccountBalance(1000, 500, 'asset')).toBe(500); // Debit - Credit
    });

    it('should calculate balance correctly for liability accounts', () => {
      expect(service.calculateAccountBalance(300, 800, 'liability')).toBe(500); // Credit - Debit
    });

    it('should calculate balance correctly for expense accounts', () => {
      expect(service.calculateAccountBalance(2000, 500, 'expense')).toBe(1500); // Debit - Credit
    });

    it('should calculate balance correctly for revenue accounts', () => {
      expect(service.calculateAccountBalance(100, 1500, 'revenue')).toBe(1400); // Credit - Debit
    });
  });

  describe('generateAccountNumber', () => {
    it('should generate account numbers correctly', () => {
      expect(service.generateAccountNumber()).toBe('1000');
      expect(service.generateAccountNumber(undefined, 5)).toBe('0005');
      expect(service.generateAccountNumber('1000')).toBe('1000-01');
      expect(service.generateAccountNumber('1000', 5)).toBe('1000-05');
    });
  });

  describe('getAccountLevel', () => {
    it('should return correct account level', () => {
      expect(service.getAccountLevel('1000')).toBe(1);
      expect(service.getAccountLevel('1000-01')).toBe(2);
      expect(service.getAccountLevel('1000-01-05')).toBe(3);
    });
  });

  describe('getAccountTypeColor', () => {
    it('should return correct colors for account types', () => {
      expect(service.getAccountTypeColor('asset')).toBe('#4CAF50');
      expect(service.getAccountTypeColor('liability')).toBe('#FF9800');
      expect(service.getAccountTypeColor('equity')).toBe('#2196F3');
      expect(service.getAccountTypeColor('revenue')).toBe('#9C27B0');
      expect(service.getAccountTypeColor('expense')).toBe('#F44336');
    });
  });

  describe('getAccountTypeText', () => {
    it('should return correct text for account types', () => {
      expect(service.getAccountTypeText('asset')).toBe('Asset');
      expect(service.getAccountTypeText('liability')).toBe('Liability');
      expect(service.getAccountTypeText('equity')).toBe('Equity');
      expect(service.getAccountTypeText('revenue')).toBe('Revenue');
      expect(service.getAccountTypeText('expense')).toBe('Expense');
    });
  });

  describe('getSubtypeText', () => {
    it('should return correct text for account subtypes', () => {
      expect(service.getSubtypeText('current_asset')).toBe('Current Asset');
      expect(service.getSubtypeText('fixed_asset')).toBe('Fixed Asset');
      expect(service.getSubtypeText('current_liability')).toBe('Current Liability');
      expect(service.getSubtypeText('long_term_liability')).toBe('Long-term Liability');
      expect(service.getSubtypeText('capital')).toBe('Capital');
      expect(service.getSubtypeText('sales')).toBe('Sales');
      expect(service.getSubtypeText('cost_of_goods_sold')).toBe('Cost of Goods Sold');
    });
  });

  describe('exportChartOfAccounts', () => {
    it('should export chart of accounts in specified format', () => {
      const exportParams = { format: 'excel' as const };
      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportChartOfAccounts(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/export/chart-of-accounts'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('excel');
      req.flush(mockBlob);
    });
  });
});
