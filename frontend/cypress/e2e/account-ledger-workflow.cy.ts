describe('Account Ledger Complete Workflow E2E Tests', () => {
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

    // Mock chart of accounts for ledger operations
    cy.intercept('GET', '**/accounting/accounts*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'ACC001',
            accountNumber: '1001-01',
            name: 'Cash in Hand',
            type: 'asset',
            subtype: 'current_asset',
            level: 3,
            isActive: true,
            openingBalance: 50000,
            currentBalance: 50000,
            debitTotal: 75000,
            creditTotal: 25000,
            createdDate: '2024-01-01',
            lastUpdated: '2024-03-20',
            createdBy: 'admin'
          },
          {
            id: 'ACC002',
            accountNumber: '2001',
            name: 'Accounts Payable',
            type: 'liability',
            subtype: 'current_liability',
            level: 1,
            isActive: true,
            openingBalance: 0,
            currentBalance: 15000,
            debitTotal: 0,
            creditTotal: 15000,
            createdDate: '2024-01-01',
            lastUpdated: '2024-03-20',
            createdBy: 'admin'
          }
        ]
      }
    }).as('getAccounts');

    // Mock initial ledger entries
    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC001',
            accountNumber: '1001-01',
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
            reconciliationId: 'REC001',
            reconciliationDate: '2024-03-01T00:00:00Z',
            sourceModule: 'manual',
            sourceId: 'OPEN001',
            createdBy: 'admin',
            createdDate: '2024-03-01T00:00:00Z',
            lastModified: '2024-03-01T00:00:00Z'
          }
        ]
      }
    }).as('getInitialLedger');

    // Login and navigate to account ledger
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('accountant1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should record transactions and calculate running balances correctly', () => {
    // Navigate to account ledger
    cy.visit('/accounting/ledger');
    cy.wait('@getAccounts');

    // Select account for ledger view
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Verify initial ledger entry
    cy.wait('@getInitialLedger');
    cy.get('[data-cy="ledger-entry"]').should('have.length', 1);
    cy.get('[data-cy="ledger-balance"]').should('contain', '₨50,000');

    // Click add transaction
    cy.get('[data-cy="add-transaction-button"]').click();

    // Fill transaction details - Debit (cash received)
    cy.get('input[formControlName="transactionDate"]').type('2024-03-15');
    cy.get('input[formControlName="transactionId"]').type('PAY001');
    cy.get('[data-cy="transaction-type-select"]').click();
    cy.get('mat-option').contains('Payment').click();
    cy.get('input[formControlName="referenceNumber"]').type('PAY-2024-001');
    cy.get('textarea[formControlName="description"]').type('Cash payment received from customer');
    cy.get('input[formControlName="debit"]').type('3000');
    cy.get('[data-cy="source-module-select"]').click();
    cy.get('mat-option').contains('Sales').click();
    cy.get('input[formControlName="sourceId"]').type('PAY001');

    // Mock transaction creation API
    cy.intercept('POST', '**/accounting/ledger', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'LED002',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          transactionDate: '2024-03-15',
          transactionId: 'PAY001',
          transactionType: 'payment',
          referenceNumber: 'PAY-2024-001',
          description: 'Cash payment received from customer',
          debit: 3000,
          credit: 0,
          balance: 53000,
          reconciled: false,
          sourceModule: 'sales',
          sourceId: 'PAY001',
          createdBy: 'accountant1',
          createdDate: '2024-03-15T10:00:00Z',
          lastModified: '2024-03-15T10:00:00Z'
        }
      }
    }).as('createTransaction');

    // Save transaction
    cy.get('[data-cy="save-transaction-button"]').click();

    cy.wait('@createTransaction');

    // Verify transaction added and balance updated
    cy.get('[data-cy="ledger-entry"]').should('have.length', 2);
    cy.get('[data-cy="ledger-debit"]').last().should('contain', '₨3,000');
    cy.get('[data-cy="ledger-balance"]').last().should('contain', '₨53,000');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Transaction recorded successfully');

    // Add another transaction - Credit (cash paid out)
    cy.get('[data-cy="add-transaction-button"]').click();
    cy.get('input[formControlName="transactionDate"]').type('2024-03-16');
    cy.get('input[formControlName="transactionId"]').type('EXP001');
    cy.get('[data-cy="transaction-type-select"]').click();
    cy.get('mat-option').contains('Journal Entry').click();
    cy.get('input[formControlName="referenceNumber"]').type('EXP-2024-001');
    cy.get('textarea[formControlName="description"]').type('Office supplies payment');
    cy.get('input[formControlName="credit"]').type('500');
    cy.get('[data-cy="source-module-select"]').click();
    cy.get('mat-option').contains('Manual').click();

    // Mock second transaction
    cy.intercept('POST', '**/accounting/ledger', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'LED003',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          transactionDate: '2024-03-16',
          transactionId: 'EXP001',
          transactionType: 'journal',
          referenceNumber: 'EXP-2024-001',
          description: 'Office supplies payment',
          debit: 0,
          credit: 500,
          balance: 52500,
          reconciled: false,
          sourceModule: 'manual',
          sourceId: 'EXP001',
          createdBy: 'accountant1',
          createdDate: '2024-03-16T11:00:00Z',
          lastModified: '2024-03-16T11:00:00Z'
        }
      }
    }).as('createSecondTransaction');

    cy.get('[data-cy="save-transaction-button"]').click();
    cy.wait('@createSecondTransaction');

    // Verify running balance calculation
    cy.get('[data-cy="ledger-entry"]').should('have.length', 3);
    cy.get('[data-cy="ledger-balance"]').eq(0).should('contain', '₨50,000'); // Opening
    cy.get('[data-cy="ledger-balance"]').eq(1).should('contain', '₨53,000'); // +3000
    cy.get('[data-cy="ledger-balance"]').eq(2).should('contain', '₨52,500'); // -500

    // Verify account balance updated
    cy.get('[data-cy="account-current-balance"]').should('contain', '₨52,500');
    cy.get('[data-cy="account-debit-total"]').should('contain', '₨80,000'); // 75000 + 3000 + 0
    cy.get('[data-cy="account-credit-total"]').should('contain', '₨27,500'); // 25000 + 0 + 500
  });

  it('should perform bank reconciliation and update entry status', () => {
    // Navigate to reconciliations
    cy.visit('/accounting/reconciliations');
    cy.wait('@getAccounts');

    // Click create reconciliation
    cy.get('[data-cy="create-reconciliation-button"]').click();

    // Select account
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Set reconciliation period
    cy.get('input[formControlName="startDate"]').type('2024-03-01');
    cy.get('input[formControlName="endDate"]').type('2024-03-31');

    // Mock reconciliation creation with ledger entries
    cy.intercept('POST', '**/accounting/ledger/reconciliations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC002',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          reconciliationPeriod: {
            startDate: '2024-03-01',
            endDate: '2024-03-31'
          },
          openingBalance: 50000,
          closingBalance: 52500,
          adjustmentAmount: 0,
          status: 'draft',
          entries: [
            {
              id: 'ENTRY001',
              ledgerEntryId: 'LED001',
              transactionDate: '2024-03-01',
              description: 'Opening balance',
              amount: 50000,
              type: 'debit',
              reconciled: true
            },
            {
              id: 'ENTRY002',
              ledgerEntryId: 'LED002',
              transactionDate: '2024-03-15',
              description: 'Cash payment received',
              amount: 3000,
              type: 'debit',
              reconciled: false
            },
            {
              id: 'ENTRY003',
              ledgerEntryId: 'LED003',
              transactionDate: '2024-03-16',
              description: 'Office supplies payment',
              amount: 500,
              type: 'credit',
              reconciled: false
            }
          ],
          createdBy: 'accountant1',
          createdDate: '2024-03-31T14:00:00Z'
        }
      }
    }).as('createReconciliation');

    // Create reconciliation
    cy.get('[data-cy="save-reconciliation-button"]').click();

    cy.wait('@createReconciliation');

    // Verify reconciliation created
    cy.url().should('include', '/accounting/reconciliations/REC002');
    cy.get('[data-cy="reconciliation-status"]').should('contain', 'Draft');
    cy.get('[data-cy="opening-balance"]').should('contain', '₨50,000');
    cy.get('[data-cy="closing-balance"]').should('contain', '₨52,500');

    // Start reconciliation process
    cy.get('[data-cy="start-reconciliation-button"]').click();

    // Mark entries as reconciled
    cy.get('[data-cy="reconcile-entry"]').first().check(); // Opening balance already reconciled
    cy.get('[data-cy="reconcile-entry"]').eq(1).check(); // Payment received
    cy.get('[data-cy="reconcile-entry"]').eq(2).check(); // Supplies payment

    // Enter bank statement balance
    cy.get('input[formControlName="bankStatementBalance"]').type('52500');

    // Verify difference is zero
    cy.get('[data-cy="reconciliation-difference"]').should('contain', '₨0');

    // Mock reconciliation completion
    cy.intercept('POST', '**/accounting/ledger/reconciliations/REC002/complete', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC002',
          status: 'completed',
          reconciledBy: 'accountant1',
          reconciledDate: '2024-03-31T15:00:00Z',
          bankStatementBalance: 52500,
          adjustmentAmount: 0
        }
      }
    }).as('completeReconciliation');

    // Complete reconciliation
    cy.get('[data-cy="complete-reconciliation-button"]').click();
    cy.get('textarea[placeholder*="reconciliation notes"]').type('All entries matched bank statement perfectly');
    cy.get('.mat-mdc-button').contains('Complete').click();

    cy.wait('@completeReconciliation');

    // Verify reconciliation completed
    cy.get('[data-cy="reconciliation-status"]').should('contain', 'Completed');
    cy.get('[data-cy="reconciled-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="reconciled-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Reconciliation completed successfully');

    // Verify ledger entries marked as reconciled
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Mock updated ledger with reconciled status
    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC001',
            accountNumber: '1001-01',
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
            reconciliationId: 'REC002',
            reconciliationDate: '2024-03-31T15:00:00Z',
            sourceModule: 'manual',
            sourceId: 'OPEN001',
            createdBy: 'admin',
            createdDate: '2024-03-01T00:00:00Z',
            lastModified: '2024-03-31T15:00:00Z'
          },
          {
            id: 'LED002',
            accountId: 'ACC001',
            accountNumber: '1001-01',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-15',
            transactionId: 'PAY001',
            transactionType: 'payment',
            referenceNumber: 'PAY-2024-001',
            description: 'Cash payment received from customer',
            debit: 3000,
            credit: 0,
            balance: 53000,
            reconciled: true,
            reconciliationId: 'REC002',
            reconciliationDate: '2024-03-31T15:00:00Z',
            sourceModule: 'sales',
            sourceId: 'PAY001',
            createdBy: 'accountant1',
            createdDate: '2024-03-15T10:00:00Z',
            lastModified: '2024-03-31T15:00:00Z'
          },
          {
            id: 'LED003',
            accountId: 'ACC001',
            accountNumber: '1001-01',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-16',
            transactionId: 'EXP001',
            transactionType: 'journal',
            referenceNumber: 'EXP-2024-001',
            description: 'Office supplies payment',
            debit: 0,
            credit: 500,
            balance: 52500,
            reconciled: true,
            reconciliationId: 'REC002',
            reconciliationDate: '2024-03-31T15:00:00Z',
            sourceModule: 'manual',
            sourceId: 'EXP001',
            createdBy: 'accountant1',
            createdDate: '2024-03-16T11:00:00Z',
            lastModified: '2024-03-31T15:00:00Z'
          }
        ]
      }
    }).as('getReconciledLedger');

    cy.wait('@getReconciledLedger');

    // Verify all entries are reconciled
    cy.get('[data-cy="ledger-entry"]').each(($entry) => {
      cy.wrap($entry).find('[data-cy="reconciled-status"]').should('contain', 'Reconciled');
    });

    cy.get('[data-cy="unreconciled-count"]').should('contain', '0');
  });

  it('should maintain comprehensive audit trail for all operations', () => {
    // Navigate to ledger and add transaction
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Add a transaction
    cy.get('[data-cy="add-transaction-button"]').click();
    cy.get('input[formControlName="transactionDate"]').type('2024-03-20');
    cy.get('input[formControlName="transactionId"]').type('ADJ001');
    cy.get('[data-cy="transaction-type-select"]').click();
    cy.get('mat-option').contains('Adjustment').click();
    cy.get('input[formControlName="referenceNumber"]').type('ADJ-2024-001');
    cy.get('textarea[formControlName="description"]').type('Bank fee adjustment');
    cy.get('input[formControlName="credit"]').type('25');

    cy.intercept('POST', '**/accounting/ledger', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'LED004',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          transactionDate: '2024-03-20',
          transactionId: 'ADJ001',
          transactionType: 'adjustment',
          referenceNumber: 'ADJ-2024-001',
          description: 'Bank fee adjustment',
          debit: 0,
          credit: 25,
          balance: 52475,
          reconciled: false,
          sourceModule: 'manual',
          sourceId: 'ADJ001',
          createdBy: 'accountant1',
          createdDate: '2024-03-20T12:00:00Z',
          lastModified: '2024-03-20T12:00:00Z'
        }
      }
    }).as('createAdjustment');

    cy.get('[data-cy="save-transaction-button"]').click();
    cy.wait('@createAdjustment');

    // View audit trail
    cy.get('[data-cy="view-audit-trail-button"]').click();

    // Mock audit trail data
    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001/audit-trail*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            timestamp: '2024-03-20T12:00:00Z',
            action: 'CREATE_TRANSACTION',
            user: 'accountant1',
            details: 'Created transaction LED004: Bank fee adjustment',
            oldValue: null,
            newValue: { transactionId: 'ADJ001', amount: 25, type: 'credit' },
            ipAddress: '192.168.1.100'
          },
          {
            timestamp: '2024-03-16T11:00:00Z',
            action: 'CREATE_TRANSACTION',
            user: 'accountant1',
            details: 'Created transaction LED003: Office supplies payment',
            oldValue: null,
            newValue: { transactionId: 'EXP001', amount: 500, type: 'credit' },
            ipAddress: '192.168.1.100'
          },
          {
            timestamp: '2024-03-15T10:00:00Z',
            action: 'CREATE_TRANSACTION',
            user: 'accountant1',
            details: 'Created transaction LED002: Cash payment received from customer',
            oldValue: null,
            newValue: { transactionId: 'PAY001', amount: 3000, type: 'debit' },
            ipAddress: '192.168.1.100'
          }
        ]
      }
    }).as('getAuditTrail');

    cy.wait('@getAuditTrail');

    // Verify audit trail entries
    cy.get('[data-cy="audit-entry"]').should('have.length', 3);

    // Verify most recent entry
    cy.get('[data-cy="audit-entry"]').first().within(() => {
      cy.get('[data-cy="audit-action"]').should('contain', 'CREATE_TRANSACTION');
      cy.get('[data-cy="audit-user"]').should('contain', 'accountant1');
      cy.get('[data-cy="audit-details"]').should('contain', 'Created transaction LED004: Bank fee adjustment');
      cy.get('[data-cy="audit-timestamp"]').should('exist');
    });

    // Perform reconciliation and check audit trail updates
    cy.visit('/accounting/reconciliations');
    cy.get('[data-cy="create-reconciliation-button"]').click();
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('input[formControlName="startDate"]').type('2024-03-01');
    cy.get('input[formControlName="endDate"]').type('2024-03-31');

    cy.intercept('POST', '**/accounting/ledger/reconciliations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC003',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          reconciliationPeriod: { startDate: '2024-03-01', endDate: '2024-03-31' },
          openingBalance: 50000,
          closingBalance: 52475,
          adjustmentAmount: 0,
          status: 'draft',
          entries: [],
          createdBy: 'accountant1',
          createdDate: '2024-03-31T16:00:00Z'
        }
      }
    }).as('createReconciliation2');

    cy.get('[data-cy="save-reconciliation-button"]').click();
    cy.wait('@createReconciliation2');

    // Complete reconciliation
    cy.get('[data-cy="start-reconciliation-button"]').click();
    cy.get('input[formControlName="bankStatementBalance"]').type('52475');
    cy.get('[data-cy="reconcile-entry"]').each(($checkbox) => {
      cy.wrap($checkbox).check();
    });

    cy.intercept('POST', '**/accounting/ledger/reconciliations/REC003/complete', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC003',
          status: 'completed',
          reconciledBy: 'accountant1',
          reconciledDate: '2024-03-31T17:00:00Z'
        }
      }
    }).as('completeReconciliation2');

    cy.get('[data-cy="complete-reconciliation-button"]').click();
    cy.get('textarea').type('Final reconciliation for March 2024');
    cy.get('.mat-mdc-button').contains('Complete').click();
    cy.wait('@completeReconciliation2');

    // Check updated audit trail
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('[data-cy="view-audit-trail-button"]').click();

    // Mock updated audit trail with reconciliation entries
    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001/audit-trail*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            timestamp: '2024-03-31T17:00:00Z',
            action: 'COMPLETE_RECONCILIATION',
            user: 'accountant1',
            details: 'Completed reconciliation REC003 for period 2024-03-01 to 2024-03-31',
            oldValue: { status: 'draft' },
            newValue: { status: 'completed', reconciledEntries: 4 },
            ipAddress: '192.168.1.100'
          },
          {
            timestamp: '2024-03-31T16:00:00Z',
            action: 'CREATE_RECONCILIATION',
            user: 'accountant1',
            details: 'Created reconciliation REC003 for account Cash in Hand',
            oldValue: null,
            newValue: { reconciliationId: 'REC003', period: '2024-03-01 to 2024-03-31' },
            ipAddress: '192.168.1.100'
          },
          {
            timestamp: '2024-03-20T12:00:00Z',
            action: 'CREATE_TRANSACTION',
            user: 'accountant1',
            details: 'Created transaction LED004: Bank fee adjustment',
            oldValue: null,
            newValue: { transactionId: 'ADJ001', amount: 25, type: 'credit' },
            ipAddress: '192.168.1.100'
          }
        ]
      }
    }).as('getUpdatedAuditTrail');

    cy.wait('@getUpdatedAuditTrail');

    // Verify reconciliation audit entries
    cy.get('[data-cy="audit-entry"]').should('have.length', 3);
    cy.get('[data-cy="audit-action"]').first().should('contain', 'COMPLETE_RECONCILIATION');
    cy.get('[data-cy="audit-action"]').eq(1).should('contain', 'CREATE_RECONCILIATION');
  });

  it('should validate data integrity throughout ledger workflow', () => {
    // Test transaction validation
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('[data-cy="add-transaction-button"]').click();

    // Try to save without required fields
    cy.get('[data-cy="save-transaction-button"]').click();

    // Should show validation errors
    cy.get('mat-error').should('contain', 'Transaction date is required');
    cy.get('mat-error').should('contain', 'Transaction type is required');
    cy.get('mat-error').should('contain', 'Description is required');

    // Fill invalid data
    cy.get('input[formControlName="transactionDate"]').type('2024-03-20');
    cy.get('[data-cy="transaction-type-select"]').click();
    cy.get('mat-option').contains('Invoice').click();
    cy.get('textarea[formControlName="description"]').type('Test transaction');
    cy.get('input[formControlName="debit"]').type('1000');
    cy.get('input[formControlName="credit"]').type('500'); // Both debit and credit

    cy.get('[data-cy="save-transaction-button"]').click();
    cy.get('mat-error').should('contain', 'Cannot have both debit and credit amounts');

    // Clear credit and try zero amounts
    cy.get('input[formControlName="credit"]').clear();
    cy.get('[data-cy="save-transaction-button"]').click();
    cy.get('mat-error').should('not.contain', 'Cannot have both debit and credit amounts');
    cy.get('mat-error').should('contain', 'Must have either debit or credit amount');

    // Test negative amounts
    cy.get('input[formControlName="debit"]').clear().type('-100');
    cy.get('[data-cy="save-transaction-button"]').click();
    cy.get('mat-error').should('contain', 'Amounts cannot be negative');

    // Test reconciliation validation
    cy.visit('/accounting/reconciliations');
    cy.get('[data-cy="create-reconciliation-button"]').click();

    // Try to save without required fields
    cy.get('[data-cy="save-reconciliation-button"]').click();
    cy.get('mat-error').should('contain', 'Account is required');

    // Add account but invalid dates
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('input[formControlName="startDate"]').type('2024-03-31');
    cy.get('input[formControlName="endDate"]').type('2024-03-01'); // Start after end

    cy.get('[data-cy="save-reconciliation-button"]').click();
    cy.get('mat-error').should('contain', 'Start date must be before end date');

    // Test running balance integrity
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Mock ledger with incorrect balances
    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC001',
            accountNumber: '1001-01',
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
          },
          {
            id: 'LED002',
            accountId: 'ACC001',
            accountNumber: '1001-01',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-15',
            transactionId: 'PAY001',
            transactionType: 'payment',
            referenceNumber: 'PAY-2024-001',
            description: 'Cash payment received',
            debit: 3000,
            credit: 0,
            balance: 48000, // Incorrect - should be 53000
            reconciled: false,
            sourceModule: 'sales',
            sourceId: 'PAY001',
            createdBy: 'accountant1',
            createdDate: '2024-03-15T10:00:00Z',
            lastModified: '2024-03-15T10:00:00Z'
          }
        ]
      }
    }).as('getIncorrectLedger');

    cy.wait('@getIncorrectLedger');

    // Should show balance integrity warning
    cy.get('[data-cy="balance-integrity-warning"]').should('be.visible');
    cy.get('[data-cy="balance-integrity-warning"]').should('contain', 'Balance calculation mismatch detected');

    // Test export functionality maintains data integrity
    cy.get('[data-cy="export-ledger-button"]').click();
    cy.get('mat-option').contains('Excel').click();

    cy.intercept('GET', '**/accounting/ledger/accounts/ACC001/export*', {
      statusCode: 200,
      body: new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }).as('exportLedger');

    cy.wait('@exportLedger');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Ledger export completed successfully');
  });

  it('should handle workflow errors and edge cases gracefully', () => {
    // Test duplicate transaction ID
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('[data-cy="add-transaction-button"]').click();

    cy.get('input[formControlName="transactionDate"]').type('2024-03-20');
    cy.get('input[formControlName="transactionId"]').type('PAY001'); // Duplicate
    cy.get('[data-cy="transaction-type-select"]').click();
    cy.get('mat-option').contains('Payment').click();
    cy.get('textarea[formControlName="description"]').type('Duplicate transaction');
    cy.get('input[formControlName="debit"]').type('1000');

    cy.intercept('POST', '**/accounting/ledger', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Transaction ID already exists for this account'
      }
    }).as('duplicateTransaction');

    cy.get('[data-cy="save-transaction-button"]').click();
    cy.wait('@duplicateTransaction');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Transaction ID already exists for this account');

    // Test reconciliation with outstanding items
    cy.visit('/accounting/reconciliations');
    cy.get('[data-cy="create-reconciliation-button"]').click();
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('input[formControlName="startDate"]').type('2024-03-01');
    cy.get('input[formControlName="endDate"]').type('2024-03-31');

    cy.intercept('POST', '**/accounting/ledger/reconciliations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC004',
          accountId: 'ACC001',
          accountNumber: '1001-01',
          accountName: 'Cash in Hand',
          reconciliationPeriod: { startDate: '2024-03-01', endDate: '2024-03-31' },
          openingBalance: 50000,
          closingBalance: 52475,
          status: 'draft',
          entries: [
            { id: 'ENTRY001', ledgerEntryId: 'LED001', reconciled: true },
            { id: 'ENTRY002', ledgerEntryId: 'LED002', reconciled: false }, // Unreconciled
            { id: 'ENTRY003', ledgerEntryId: 'LED003', reconciled: true },
            { id: 'ENTRY004', ledgerEntryId: 'LED004', reconciled: false }  // Unreconciled
          ]
        }
      }
    }).as('createReconciliationWithOutstanding');

    cy.get('[data-cy="save-reconciliation-button"]').click();
    cy.wait('@createReconciliationWithOutstanding');

    // Start reconciliation
    cy.get('[data-cy="start-reconciliation-button"]').click();

    // Mark only some entries as reconciled
    cy.get('[data-cy="reconcile-entry"]').eq(0).should('be.checked'); // Already reconciled
    cy.get('[data-cy="reconcile-entry"]').eq(1).check(); // Mark as reconciled
    cy.get('[data-cy="reconcile-entry"]').eq(2).should('be.checked'); // Already reconciled
    // Leave entry 3 unreconciled

    cy.get('input[formControlName="bankStatementBalance"]').type('52475');

    // Try to complete with unreconciled items
    cy.get('[data-cy="complete-reconciliation-button"]').click();

    // Should show warning about unreconciled items
    cy.get('[data-cy="unreconciled-warning"]').should('be.visible');
    cy.get('[data-cy="unreconciled-warning"]').should('contain', '2 items remain unreconciled');

    // Add adjustment for unreconciled items
    cy.get('input[formControlName="adjustmentAmount"]').type('50');
    cy.get('textarea[placeholder*="adjustment notes"]').type('Bank fee adjustment for unreconciled items');

    cy.intercept('POST', '**/accounting/ledger/reconciliations/REC004/complete', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC004',
          status: 'completed',
          reconciledBy: 'accountant1',
          reconciledDate: '2024-03-31T18:00:00Z',
          bankStatementBalance: 52475,
          adjustmentAmount: 50
        }
      }
    }).as('completeReconciliationWithAdjustment');

    cy.get('.mat-mdc-button').contains('Complete').click();
    cy.wait('@completeReconciliationWithAdjustment');

    // Verify reconciliation completed with adjustment
    cy.get('[data-cy="reconciliation-status"]').should('contain', 'Completed');
    cy.get('[data-cy="adjustment-amount"]').should('contain', '₨50');

    // Test transaction deletion with reconciled entries
    cy.visit('/accounting/ledger');
    cy.get('[data-cy="account-select"]').click();
    cy.get('mat-option').contains('Cash in Hand').click();

    // Try to delete reconciled transaction
    cy.get('[data-cy="delete-transaction-button"]').first().click();

    cy.intercept('DELETE', '**/accounting/ledger/LED001', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Cannot delete reconciled transaction'
      }
    }).as('deleteReconciledTransaction');

    cy.get('.mat-mdc-button').contains('Delete').click();
    cy.wait('@deleteReconciledTransaction');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Cannot delete reconciled transaction');

    // Test bulk operations
    cy.get('[data-cy="bulk-reconcile-button"]').click();
    cy.get('[data-cy="select-all-entries"]').check();
    cy.get('[data-cy="confirm-bulk-reconcile"]').click();

    cy.intercept('POST', '**/accounting/ledger/accounts/ACC001/bulk-reconcile', {
      statusCode: 200,
      body: { success: true, data: null }
    }).as('bulkReconcile');

    cy.wait('@bulkReconcile');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Bulk reconciliation completed successfully');
  });
});
