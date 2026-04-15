import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AccountLedgerService, LedgerEntry, Reconciliation, LedgerSummary } from './account-ledger.service';

describe('AccountLedgerService', () => {
  let service: AccountLedgerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AccountLedgerService]
    });

    service = TestBed.inject(AccountLedgerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getLedgerEntries', () => {
    it('should fetch ledger entries with query parameters', () => {
      const mockParams = { accountId: 'ACC001', transactionType: 'invoice', reconciled: false, page: 1, limit: 20 };
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
            reconciled: false,
            sourceModule: 'sales',
            sourceId: 'INV001',
            createdBy: 'salesman1',
            createdDate: '2024-03-15T10:00:00Z',
            lastModified: '2024-03-15T10:00:00Z'
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
            reconciled: true,
            reconciliationId: 'REC001',
            reconciliationDate: '2024-03-25T14:00:00Z',
            sourceModule: 'sales',
            sourceId: 'PAY001',
            createdBy: 'cashier',
            createdDate: '2024-03-20T14:00:00Z',
            lastModified: '2024-03-25T14:00:00Z'
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
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].transactionType).toBe('invoice');
        expect(response.data[0].reconciled).toBe(false);
        expect(response.data[1].reconciled).toBe(true);
        expect(response.data[1].reconciliationId).toBe('REC001');
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/ledger'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('accountId')).toBe('ACC001');
      expect(req.request.params.get('transactionType')).toBe('invoice');
      expect(req.request.params.get('reconciled')).toBe('false');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockResponse);
    });
  });

  describe('getAccountLedger', () => {
    it('should fetch ledger entries for a specific account', () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC001',
            accountNumber: '1001',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-01',
            transactionId: 'OPEN001',
            transactionType: 'adjustment',
            referenceNumber: 'OPEN-001',
            description: 'Opening balance',
            debit: 50000,
            credit: 0,
            balance: 50000,
            reconciled: true,
            sourceModule: 'manual',
            sourceId: 'OPEN001',
            createdBy: 'admin',
            createdDate: '2024-03-01T00:00:00Z',
            lastModified: '2024-03-01T00:00:00Z'
          }
        ]
      };

      service.getAccountLedger('ACC001', { startDate: '2024-03-01', endDate: '2024-03-31' }).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(1);
        expect(response.data[0].accountId).toBe('ACC001');
        expect(response.data[0].balance).toBe(50000);
      });

      const req = httpMock.expectOne(req => req.url.includes('/ledger/accounts/ACC001'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockResponse);
    });
  });

  describe('createLedgerEntry', () => {
    it('should create a new ledger entry', () => {
      const newEntry = {
        accountId: 'ACC001',
        transactionDate: '2024-03-20',
        transactionId: 'ADJ001',
        transactionType: 'adjustment',
        referenceNumber: 'ADJ-2024-001',
        description: 'Bank fee adjustment',
        debit: 0,
        credit: 50,
        sourceModule: 'manual',
        sourceId: 'ADJ001',
        createdBy: 'accountant1'
      };

      const mockCreatedEntry: LedgerEntry = {
        ...newEntry,
        id: 'LED003',
        accountNumber: '1001',
        accountName: 'Cash in Hand',
        balance: 49950,
        reconciled: false,
        createdDate: '2024-03-20T10:00:00Z',
        lastModified: '2024-03-20T10:00:00Z'
      };

      const mockResponse = { success: true, data: mockCreatedEntry };

      service.createLedgerEntry(newEntry).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('LED003');
        expect(response.data.balance).toBe(49950);
        expect(response.data.reconciled).toBe(false);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newEntry);
      req.flush(mockResponse);
    });
  });

  describe('createReconciliation', () => {
    it('should create a new reconciliation', () => {
      const newReconciliation = {
        accountId: 'ACC001',
        reconciliationPeriod: {
          startDate: '2024-03-01',
          endDate: '2024-03-31'
        },
        openingBalance: 50000,
        closingBalance: 48000,
        bankStatementBalance: 47950,
        adjustmentAmount: -50,
        status: 'draft',
        createdBy: 'accountant1'
      };

      const mockCreatedReconciliation: Reconciliation = {
        ...newReconciliation,
        id: 'REC001',
        accountNumber: '1001',
        accountName: 'Cash in Hand',
        entries: [],
        createdDate: '2024-03-31T15:00:00Z'
      };

      const mockResponse = { success: true, data: mockCreatedReconciliation };

      service.createReconciliation(newReconciliation).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('REC001');
        expect(response.data.adjustmentAmount).toBe(-50);
        expect(response.data.status).toBe('draft');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/reconciliations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newReconciliation);
      req.flush(mockResponse);
    });
  });

  describe('completeReconciliation', () => {
    it('should complete a reconciliation with adjustments', () => {
      const completionData = {
        reconciledBy: 'accountant1',
        bankStatementBalance: 47950,
        adjustmentAmount: -50,
        notes: 'Bank fees adjustment required',
        reconciledEntries: ['LED001', 'LED002']
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'REC001',
          status: 'completed',
          reconciledBy: 'accountant1',
          reconciledDate: '2024-03-31T16:00:00Z',
          adjustmentAmount: -50,
          notes: 'Bank fees adjustment required'
        }
      };

      service.completeReconciliation('REC001', completionData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('completed');
        expect(response.data.adjustmentAmount).toBe(-50);
        expect(response.data.reconciledBy).toBe('accountant1');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/reconciliations/REC001/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(completionData);
      req.flush(mockResponse);
    });
  });

  describe('getLedgerSummary', () => {
    it('should fetch ledger summary for an account and period', () => {
      const mockSummary: LedgerSummary = {
        accountId: 'ACC001',
        accountNumber: '1001',
        accountName: 'Cash in Hand',
        period: {
          startDate: '2024-03-01',
          endDate: '2024-03-31'
        },
        openingBalance: 50000,
        totalDebits: 8000,
        totalCredits: 8500,
        netMovement: -500,
        closingBalance: 49500,
        reconciledBalance: 47950,
        unreconciledItems: 2,
        lastReconciliationDate: '2024-03-31'
      };

      const mockResponse = { success: true, data: mockSummary };

      service.getLedgerSummary('ACC001', { startDate: '2024-03-01', endDate: '2024-03-31' }).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.openingBalance).toBe(50000);
        expect(response.data.closingBalance).toBe(49500);
        expect(response.data.netMovement).toBe(-500);
        expect(response.data.unreconciledItems).toBe(2);
      });

      const req = httpMock.expectOne(req => req.url.includes('/accounts/ACC001/summary'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockResponse);
    });
  });

  describe('bulkReconcileEntries', () => {
    it('should bulk reconcile ledger entries', () => {
      const entryIds = ['LED001', 'LED002', 'LED003'];

      const mockResponse = { success: true, data: null };

      service.bulkReconcileEntries('ACC001', entryIds, 'REC001').subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/accounts/ACC001/bulk-reconcile`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ entryIds, reconciliationId: 'REC001' });
      req.flush(mockResponse);
    });
  });

  describe('calculateRunningBalance', () => {
    it('should calculate running balances correctly', () => {
      const entries: LedgerEntry[] = [
        { id: '1', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-01', transactionId: 'T1', transactionType: 'invoice', referenceNumber: 'R1', description: 'Sale', debit: 0, credit: 1000, balance: 0, reconciled: false, sourceModule: 'sales', sourceId: 'S1', createdBy: 'user', createdDate: '2024-03-01', lastModified: '2024-03-01' },
        { id: '2', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-02', transactionId: 'T2', transactionType: 'payment', referenceNumber: 'R2', description: 'Payment', debit: 500, credit: 0, balance: 0, reconciled: false, sourceModule: 'sales', sourceId: 'S2', createdBy: 'user', createdDate: '2024-03-02', lastModified: '2024-03-02' },
        { id: '3', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-03', transactionId: 'T3', transactionType: 'adjustment', referenceNumber: 'R3', description: 'Adjustment', debit: 0, credit: 200, balance: 0, reconciled: false, sourceModule: 'manual', sourceId: 'A1', createdBy: 'user', createdDate: '2024-03-03', lastModified: '2024-03-03' }
      ];

      const openingBalance = 10000;
      const result = service.calculateRunningBalance(entries, openingBalance);

      expect(result[0].balance).toBe(9000); // 10000 - 1000
      expect(result[1].balance).toBe(9500); // 9000 + 500
      expect(result[2].balance).toBe(9300); // 9500 - 200
    });
  });

  describe('validateLedgerEntry', () => {
    it('should validate a correct ledger entry', () => {
      const validEntry = {
        accountId: 'ACC001',
        transactionDate: '2024-03-20',
        transactionType: 'invoice',
        description: 'Valid entry',
        debit: 1000,
        credit: 0
      };

      const result = service.validateLedgerEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidEntry = {
        // Missing accountId
        transactionDate: '2024-03-20',
        transactionType: 'invoice',
        description: '', // Empty description
        debit: 1000,
        credit: 500 // Both debit and credit
      };

      const result = service.validateLedgerEntry(invalidEntry);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Account is required');
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain('Cannot have both debit and credit amounts');
    });
  });

  describe('validateReconciliation', () => {
    it('should validate a correct reconciliation', () => {
      const validReconciliation = {
        accountId: 'ACC001',
        reconciliationPeriod: {
          startDate: '2024-03-01',
          endDate: '2024-03-31'
        }
      };

      const result = service.validateReconciliation(validReconciliation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidReconciliation = {
        // Missing accountId
        reconciliationPeriod: {
          startDate: '2024-03-31',
          endDate: '2024-03-01' // Start after end
        }
      };

      const result = service.validateReconciliation(invalidReconciliation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Account is required');
      expect(result.errors).toContain('Start date must be before end date');
    });
  });

  describe('getTransactionTypeColor', () => {
    it('should return correct colors for transaction types', () => {
      expect(service.getTransactionTypeColor('invoice')).toBe('#2196F3');
      expect(service.getTransactionTypeColor('payment')).toBe('#4CAF50');
      expect(service.getTransactionTypeColor('journal')).toBe('#FF9800');
      expect(service.getTransactionTypeColor('adjustment')).toBe('#9C27B0');
      expect(service.getTransactionTypeColor('transfer')).toBe('#795548');
      expect(service.getTransactionTypeColor('reconciliation')).toBe('#607D8B');
    });
  });

  describe('getTransactionTypeText', () => {
    it('should return correct text for transaction types', () => {
      expect(service.getTransactionTypeText('invoice')).toBe('Invoice');
      expect(service.getTransactionTypeText('payment')).toBe('Payment');
      expect(service.getTransactionTypeText('journal')).toBe('Journal Entry');
      expect(service.getTransactionTypeText('adjustment')).toBe('Adjustment');
      expect(service.getTransactionTypeText('transfer')).toBe('Transfer');
      expect(service.getTransactionTypeText('reconciliation')).toBe('Reconciliation');
    });
  });

  describe('getReconciliationStatusColor', () => {
    it('should return correct colors for reconciliation status', () => {
      expect(service.getReconciliationStatusColor('draft')).toBe('#9E9E9E');
      expect(service.getReconciliationStatusColor('in_progress')).toBe('#FF9800');
      expect(service.getReconciliationStatusColor('completed')).toBe('#4CAF50');
      expect(service.getReconciliationStatusColor('cancelled')).toBe('#F44336');
    });
  });

  describe('getReconciliationStatusText', () => {
    it('should return correct text for reconciliation status', () => {
      expect(service.getReconciliationStatusText('draft')).toBe('Draft');
      expect(service.getReconciliationStatusText('in_progress')).toBe('In Progress');
      expect(service.getReconciliationStatusText('completed')).toBe('Completed');
      expect(service.getReconciliationStatusText('cancelled')).toBe('Cancelled');
    });
  });

  describe('calculateReconciliationDifference', () => {
    it('should calculate reconciliation difference correctly', () => {
      const reconciliation: Reconciliation = {
        id: 'REC001',
        accountId: 'ACC001',
        accountNumber: '1001',
        accountName: 'Cash in Hand',
        reconciliationPeriod: { startDate: '2024-03-01', endDate: '2024-03-31' },
        openingBalance: 50000,
        closingBalance: 48000,
        bankStatementBalance: 47950,
        adjustmentAmount: -50,
        status: 'completed',
        entries: [],
        createdBy: 'accountant1',
        createdDate: '2024-03-31'
      };

      const difference = service.calculateReconciliationDifference(reconciliation);
      expect(difference).toBe(0); // (50000 - 50) = 47950 matches bank statement
    });
  });

  describe('isEntryReconciled', () => {
    it('should return true for reconciled entries', () => {
      const reconciledEntry: LedgerEntry = {
        id: 'LED001',
        accountId: 'ACC001',
        accountNumber: '1001',
        accountName: 'Cash',
        transactionDate: '2024-03-01',
        transactionId: 'T1',
        transactionType: 'invoice',
        referenceNumber: 'R1',
        description: 'Test',
        debit: 0,
        credit: 1000,
        balance: 0,
        reconciled: true,
        sourceModule: 'sales',
        sourceId: 'S1',
        createdBy: 'user',
        createdDate: '2024-03-01',
        lastModified: '2024-03-01'
      };

      expect(service.isEntryReconciled(reconciledEntry)).toBe(true);
    });

    it('should return false for unreconciled entries', () => {
      const unreconciledEntry: LedgerEntry = {
        id: 'LED002',
        accountId: 'ACC001',
        accountNumber: '1001',
        accountName: 'Cash',
        transactionDate: '2024-03-01',
        transactionId: 'T2',
        transactionType: 'invoice',
        referenceNumber: 'R2',
        description: 'Test',
        debit: 0,
        credit: 1000,
        balance: 0,
        reconciled: false,
        sourceModule: 'sales',
        sourceId: 'S2',
        createdBy: 'user',
        createdDate: '2024-03-01',
        lastModified: '2024-03-01'
      };

      expect(service.isEntryReconciled(unreconciledEntry)).toBe(false);
    });
  });

  describe('getUnreconciledEntries', () => {
    it('should return only unreconciled entries', () => {
      const entries: LedgerEntry[] = [
        { id: '1', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-01', transactionId: 'T1', transactionType: 'invoice', referenceNumber: 'R1', description: 'Test 1', debit: 0, credit: 1000, balance: 0, reconciled: true, sourceModule: 'sales', sourceId: 'S1', createdBy: 'user', createdDate: '2024-03-01', lastModified: '2024-03-01' },
        { id: '2', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-02', transactionId: 'T2', transactionType: 'payment', referenceNumber: 'R2', description: 'Test 2', debit: 500, credit: 0, balance: 0, reconciled: false, sourceModule: 'sales', sourceId: 'S2', createdBy: 'user', createdDate: '2024-03-02', lastModified: '2024-03-02' },
        { id: '3', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-03', transactionId: 'T3', transactionType: 'adjustment', referenceNumber: 'R3', description: 'Test 3', debit: 0, credit: 200, balance: 0, reconciled: false, sourceModule: 'manual', sourceId: 'A1', createdBy: 'user', createdDate: '2024-03-03', lastModified: '2024-03-03' }
      ];

      const unreconciled = service.getUnreconciledEntries(entries);
      expect(unreconciled).toHaveLength(2);
      expect(unreconciled[0].id).toBe('2');
      expect(unreconciled[1].id).toBe('3');
    });
  });

  describe('calculatePeriodSummary', () => {
    it('should calculate period summary correctly', () => {
      const entries: LedgerEntry[] = [
        { id: '1', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-01', transactionId: 'T1', transactionType: 'invoice', referenceNumber: 'R1', description: 'Sale 1', debit: 0, credit: 1000, balance: 0, reconciled: true, sourceModule: 'sales', sourceId: 'S1', createdBy: 'user', createdDate: '2024-03-01', lastModified: '2024-03-01' },
        { id: '2', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-02', transactionId: 'T2', transactionType: 'payment', referenceNumber: 'R2', description: 'Payment', debit: 500, credit: 0, balance: 0, reconciled: true, sourceModule: 'sales', sourceId: 'S2', createdBy: 'user', createdDate: '2024-03-02', lastModified: '2024-03-02' },
        { id: '3', accountId: 'ACC001', accountNumber: '1001', accountName: 'Cash', transactionDate: '2024-03-03', transactionId: 'T3', transactionType: 'adjustment', referenceNumber: 'R3', description: 'Adjustment', debit: 0, credit: 200, balance: 0, reconciled: false, sourceModule: 'manual', sourceId: 'A1', createdBy: 'user', createdDate: '2024-03-03', lastModified: '2024-03-03' }
      ];

      const openingBalance = 10000;
      const summary = service.calculatePeriodSummary(entries, openingBalance);

      expect(summary.openingBalance).toBe(10000);
      expect(summary.totalDebits).toBe(500);
      expect(summary.totalCredits).toBe(1200);
      expect(summary.netMovement).toBe(-700);
      expect(summary.closingBalance).toBe(9300);
      expect(summary.unreconciledItems).toBe(1);
    });
  });

  describe('formatLedgerEntryDescription', () => {
    it('should format ledger entry description correctly', () => {
      const entry: LedgerEntry = {
        id: 'LED001',
        accountId: 'ACC001',
        accountNumber: '1001',
        accountName: 'Cash',
        transactionDate: '2024-03-01',
        transactionId: 'INV001',
        transactionType: 'invoice',
        referenceNumber: 'INV-2024-001',
        description: 'Sale of medicines',
        debit: 0,
        credit: 5000,
        balance: 0,
        reconciled: false,
        sourceModule: 'sales',
        sourceId: 'INV001',
        createdBy: 'salesman1',
        createdDate: '2024-03-01',
        lastModified: '2024-03-01'
      };

      const formatted = service.formatLedgerEntryDescription(entry);
      expect(formatted).toBe('Invoice - Sale of medicines (INV-2024-001)');
    });
  });

  describe('exportLedger', () => {
    it('should export ledger in specified format', () => {
      const exportParams = {
        format: 'excel' as const,
        accountId: 'ACC001',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportLedger('ACC001', exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/accounts/ACC001/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('excel');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockResponse);
    });
  });
});
