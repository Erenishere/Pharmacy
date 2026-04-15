describe('Chart of Accounts Complete Workflow E2E Tests', () => {
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

    // Mock existing chart of accounts
    cy.intercept('GET', '**/accounting/accounts*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
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
          },
          {
            id: 'ACC003',
            accountNumber: '1001-01',
            name: 'Cash in Hand',
            type: 'asset',
            subtype: 'current_asset',
            parentId: 'ACC002',
            parentAccount: 'Current Assets',
            level: 3,
            isActive: true,
            openingBalance: 0,
            currentBalance: 50000,
            debitTotal: 75000,
            creditTotal: 25000,
            createdDate: '2024-01-01',
            lastUpdated: '2024-03-20',
            createdBy: 'admin'
          }
        ]
      }
    }).as('getAccounts');

    // Mock account hierarchy
    cy.intercept('GET', '**/accounting/accounts/hierarchy', {
      statusCode: 200,
      body: {
        success: true,
        data: [
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
        ]
      }
    }).as('getHierarchy');

    // Login and navigate to accounting
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('accountant1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create account and manage hierarchy correctly', () => {
    // Navigate to chart of accounts
    cy.visit('/accounting/chart-of-accounts');
    cy.wait('@getAccounts');

    // Click create new account button
    cy.get('[data-cy="create-account-button"]').click();

    // Verify we're on the account creation page
    cy.url().should('include', '/accounting/accounts/new');

    // Fill account details for a child account
    cy.get('[data-cy="parent-account-select"]').click();
    cy.get('mat-option').contains('Current Assets').click();

    cy.get('input[formControlName="accountNumber"]').should('have.value', '1001-02'); // Auto-generated
    cy.get('input[formControlName="name"]').type('Bank Account');
    cy.get('[data-cy="type-select"]').should('have.value', 'Asset'); // Auto-filled from parent
    cy.get('[data-cy="subtype-select"]').should('have.value', 'Current Asset'); // Auto-filled from parent
    cy.get('input[formControlName="openingBalance"]').type('100000');
    cy.get('textarea[formControlName="description"]').type('Main business bank account');

    // Mock account creation API
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'ACC004',
          accountNumber: '1001-02',
          name: 'Bank Account',
          type: 'asset',
          subtype: 'current_asset',
          parentId: 'ACC002',
          parentAccount: 'Current Assets',
          level: 3,
          isActive: true,
          description: 'Main business bank account',
          openingBalance: 100000,
          currentBalance: 100000,
          debitTotal: 100000,
          creditTotal: 0,
          createdDate: '2024-03-20',
          lastUpdated: '2024-03-20',
          createdBy: 'accountant1'
        }
      }
    }).as('createAccount');

    // Save the account
    cy.get('[data-cy="save-account-button"]').click();

    // Wait for API call and verify request
    cy.wait('@createAccount').its('request.body').should('deep.include', {
      accountNumber: '1001-02',
      name: 'Bank Account',
      type: 'asset',
      subtype: 'current_asset',
      parentId: 'ACC002',
      openingBalance: 100000,
      description: 'Main business bank account'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Account created successfully');
    cy.url().should('include', '/accounting/accounts/ACC004');

    // Verify account details page shows correct information
    cy.get('[data-cy="account-number"]').should('contain', '1001-02');
    cy.get('[data-cy="account-name"]').should('contain', 'Bank Account');
    cy.get('[data-cy="account-type"]').should('contain', 'Asset');
    cy.get('[data-cy="account-level"]').should('contain', '3');
    cy.get('[data-cy="parent-account"]').should('contain', 'Current Assets');
    cy.get('[data-cy="current-balance"]').should('contain', '₨100,000');
    cy.get('[data-cy="opening-balance"]').should('contain', '₨100,000');

    // Verify hierarchy is updated
    cy.visit('/accounting/chart-of-accounts');
    cy.wait('@getHierarchy');

    // Verify the new account appears in hierarchy
    cy.get('[data-cy="account-hierarchy"]').within(() => {
      cy.get('[data-cy="account-node"]').contains('Assets').should('exist');
      cy.get('[data-cy="account-node"]').contains('Current Assets').should('exist');
      cy.get('[data-cy="account-node"]').contains('Bank Account').should('exist');
      cy.get('[data-cy="account-node"]').contains('Cash in Hand').should('exist');
    });

    // Verify hierarchical balance updates
    cy.get('[data-cy="account-balance"]').contains('Assets').next().should('contain', '₨300,000'); // 200000 + 100000
    cy.get('[data-cy="account-balance"]').contains('Current Assets').next().should('contain', '₨250,000'); // 150000 + 100000
  });

  it('should create and post journal entries with ledger integration', () => {
    // Navigate to journal entries
    cy.visit('/accounting/journal-entries');
    cy.wait('@getAccounts');

    // Click create new journal entry button
    cy.get('[data-cy="create-journal-entry-button"]').click();

    // Verify we're on the journal entry creation page
    cy.url().should('include', '/accounting/journal-entries/new');

    // Fill journal entry header
    cy.get('input[formControlName="entryDate"]').type('2024-03-20');
    cy.get('input[formControlName="referenceNumber"]').type('ADJ-2024-001');
    cy.get('textarea[formControlName="description"]').type('Monthly adjustment for prepaid expenses');

    // Add first journal entry line - Debit
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').first().click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('input[formControlName="debit"]').first().type('5000');
    cy.get('input[formControlName="description"]').first().type('Cash payment for supplies');

    // Add second journal entry line - Credit
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').eq(1).click();
    cy.get('mat-option').contains('Cash in Hand').click(); // Same account for demonstration
    cy.get('input[formControlName="credit"]').eq(1).type('5000');
    cy.get('input[formControlName="description"]').eq(1).type('Cash received from sales');

    // Verify totals are balanced
    cy.get('[data-cy="total-debit"]').should('contain', '5,000');
    cy.get('[data-cy="total-credit"]').should('contain', '5,000');
    cy.get('[data-cy="balance-status"]').should('contain', 'Balanced');

    // Mock journal entry creation API
    cy.intercept('POST', '**/accounting/journal-entries', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'JE001',
          entryNumber: 'JE-2024-001',
          entryDate: '2024-03-20',
          referenceNumber: 'ADJ-2024-001',
          description: 'Monthly adjustment for prepaid expenses',
          lines: [
            {
              id: 'JEL001',
              accountId: 'ACC003',
              accountNumber: '1001-01',
              accountName: 'Cash in Hand',
              description: 'Cash payment for supplies',
              debit: 5000,
              credit: 0
            },
            {
              id: 'JEL002',
              accountId: 'ACC003',
              accountNumber: '1001-01',
              accountName: 'Cash in Hand',
              description: 'Cash received from sales',
              debit: 0,
              credit: 5000
            }
          ],
          totalDebit: 5000,
          totalCredit: 5000,
          status: 'draft',
          createdBy: 'accountant1'
        }
      }
    }).as('createJournalEntry');

    // Save the journal entry
    cy.get('[data-cy="save-journal-entry-button"]').click();

    cy.wait('@createJournalEntry');

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Journal entry created successfully');
    cy.url().should('include', '/accounting/journal-entries/JE001');

    // Verify journal entry details
    cy.get('[data-cy="entry-number"]').should('contain', 'JE-2024-001');
    cy.get('[data-cy="entry-status"]').should('contain', 'Draft');
    cy.get('[data-cy="total-debit-amount"]').should('contain', '₨5,000');
    cy.get('[data-cy="total-credit-amount"]').should('contain', '₨5,000');

    // Mock posting API
    cy.intercept('POST', '**/accounting/journal-entries/JE001/post', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'JE001',
          status: 'posted',
          postedBy: 'accountant1',
          postedDate: '2024-03-20T15:00:00Z'
        }
      }
    }).as('postJournalEntry');

    // Post the journal entry
    cy.get('[data-cy="post-journal-entry-button"]').click();

    // Confirm posting
    cy.get('.mat-mdc-button').contains('Post').click();

    cy.wait('@postJournalEntry');

    // Verify posting
    cy.get('[data-cy="entry-status"]').should('contain', 'Posted');
    cy.get('[data-cy="posted-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="posted-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Journal entry posted successfully');

    // Verify ledger integration
    cy.get('[data-cy="view-ledger-button"]').click();
    cy.url().should('include', '/accounting/accounts/ACC003/ledger');

    // Mock ledger entries
    cy.intercept('GET', '**/accounting/accounts/ACC003/ledger*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC003',
            accountNumber: '1001-01',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-20',
            transactionId: 'JE001',
            transactionType: 'journal',
            referenceNumber: 'JE-2024-001',
            description: 'Cash payment for supplies',
            debit: 5000,
            credit: 0,
            balance: 55000, // 50000 + 5000
            sourceModule: 'manual',
            sourceId: 'JE001',
            createdBy: 'accountant1',
            createdDate: '2024-03-20T15:00:00Z'
          },
          {
            id: 'LED002',
            accountId: 'ACC003',
            accountNumber: '1001-01',
            accountName: 'Cash in Hand',
            transactionDate: '2024-03-20',
            transactionId: 'JE001',
            transactionType: 'journal',
            referenceNumber: 'JE-2024-001',
            description: 'Cash received from sales',
            debit: 0,
            credit: 5000,
            balance: 50000, // 55000 - 5000
            sourceModule: 'manual',
            sourceId: 'JE001',
            createdBy: 'accountant1',
            createdDate: '2024-03-20T15:00:00Z'
          }
        ]
      }
    }).as('getLedger');

    cy.wait('@getLedger');

    // Verify ledger entries
    cy.get('[data-cy="ledger-entry"]').should('have.length', 2);
    cy.get('[data-cy="ledger-debit"]').first().should('contain', '₨5,000');
    cy.get('[data-cy="ledger-credit"]').last().should('contain', '₨5,000');
    cy.get('[data-cy="ledger-balance"]').first().should('contain', '₨55,000');
    cy.get('[data-cy="ledger-balance"]').last().should('contain', '₨50,000');
    cy.get('[data-cy="ledger-reference"]').each(($el) => {
      cy.wrap($el).should('contain', 'JE-2024-001');
    });
  });

  it('should generate financial reports with accurate balances', () => {
    // Navigate to trial balance
    cy.visit('/accounting/trial-balance');

    // Mock account balances API
    cy.intercept('GET', '**/accounting/balances*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          asOfDate: '2024-03-31',
          totalDebit: 275000,
          totalCredit: 275000,
          accounts: [
            {
              accountId: 'ACC003',
              accountNumber: '1001-01',
              accountName: 'Cash in Hand',
              type: 'asset',
              subtype: 'current_asset',
              debitTotal: 75000,
              creditTotal: 25000,
              balance: 50000
            },
            {
              accountId: 'ACC005',
              accountNumber: '2001',
              accountName: 'Accounts Payable',
              type: 'liability',
              subtype: 'current_liability',
              debitTotal: 0,
              creditTotal: 25000,
              balance: 25000
            },
            {
              accountId: 'ACC006',
              accountNumber: '3001',
              accountName: 'Capital',
              type: 'equity',
              subtype: 'capital',
              debitTotal: 0,
              creditTotal: 250000,
              balance: 250000
            },
            {
              accountId: 'ACC007',
              accountNumber: '4001',
              accountName: 'Sales Revenue',
              type: 'revenue',
              subtype: 'sales',
              debitTotal: 0,
              creditTotal: 150000,
              balance: 150000
            },
            {
              accountId: 'ACC008',
              accountNumber: '5001',
              accountName: 'Cost of Goods Sold',
              type: 'expense',
              subtype: 'cost_of_goods_sold',
              debitTotal: 125000,
              creditTotal: 0,
              balance: 125000
            }
          ]
        }
      }
    }).as('getBalances');

    // Generate trial balance
    cy.get('input[formControlName="asOfDate"]').type('2024-03-31');
    cy.get('[data-cy="generate-report-button"]').click();

    cy.wait('@getBalances');

    // Verify trial balance totals
    cy.get('[data-cy="total-debit-balance"]').should('contain', '₨275,000');
    cy.get('[data-cy="total-credit-balance"]').should('contain', '₨275,000');

    // Verify account balances
    cy.get('[data-cy="account-row"]').should('have.length', 5);

    // Verify asset account
    cy.get('[data-cy="account-name"]').contains('Cash in Hand').parent().within(() => {
      cy.get('[data-cy="debit-balance"]').should('contain', '₨75,000');
      cy.get('[data-cy="credit-balance"]').should('contain', '₨25,000');
      cy.get('[data-cy="net-balance"]').should('contain', '₨50,000');
    });

    // Verify liability account
    cy.get('[data-cy="account-name"]').contains('Accounts Payable').parent().within(() => {
      cy.get('[data-cy="debit-balance"]').should('contain', '₨0');
      cy.get('[data-cy="credit-balance"]').should('contain', '₨25,000');
      cy.get('[data-cy="net-balance"]').should('contain', '₨25,000');
    });

    // Verify equity account
    cy.get('[data-cy="account-name"]').contains('Capital').parent().within(() => {
      cy.get('[data-cy="debit-balance"]').should('contain', '₨0');
      cy.get('[data-cy="credit-balance"]').should('contain', '₨250,000');
      cy.get('[data-cy="net-balance"]').should('contain', '₨250,000');
    });

    // Verify revenue account
    cy.get('[data-cy="account-name"]').contains('Sales Revenue').parent().within(() => {
      cy.get('[data-cy="debit-balance"]').should('contain', '₨0');
      cy.get('[data-cy="credit-balance"]').should('contain', '₨150,000');
      cy.get('[data-cy="net-balance"]').should('contain', '₨150,000');
    });

    // Verify expense account
    cy.get('[data-cy="account-name"]').contains('Cost of Goods Sold').parent().within(() => {
      cy.get('[data-cy="debit-balance"]').should('contain', '₨125,000');
      cy.get('[data-cy="credit-balance"]').should('contain', '₨0');
      cy.get('[data-cy="net-balance"]').should('contain', '₨125,000');
    });

    // Navigate to balance sheet
    cy.visit('/accounting/balance-sheet');

    // Mock balance sheet data
    cy.intercept('GET', '**/accounting/balances*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          asOfDate: '2024-03-31',
          assets: {
            currentAssets: 50000,
            totalAssets: 50000
          },
          liabilities: {
            currentLiabilities: 25000,
            totalLiabilities: 25000
          },
          equity: {
            capital: 250000,
            totalEquity: 250000
          },
          totalLiabilitiesAndEquity: 275000
        }
      }
    }).as('getBalanceSheet');

    cy.get('input[formControlName="asOfDate"]').type('2024-03-31');
    cy.get('[data-cy="generate-balance-sheet-button"]').click();

    cy.wait('@getBalanceSheet');

    // Verify balance sheet balances
    cy.get('[data-cy="current-assets-total"]').should('contain', '₨50,000');
    cy.get('[data-cy="total-assets"]').should('contain', '₨50,000');
    cy.get('[data-cy="current-liabilities-total"]').should('contain', '₨25,000');
    cy.get('[data-cy="total-liabilities"]').should('contain', '₨25,000');
    cy.get('[data-cy="capital-total"]').should('contain', '₨250,000');
    cy.get('[data-cy="total-equity"]').should('contain', '₨250,000');
    cy.get('[data-cy="total-liabilities-equity"]').should('contain', '₨275,000');

    // Navigate to profit & loss
    cy.visit('/accounting/profit-loss');

    // Mock P&L data
    cy.intercept('GET', '**/accounting/balances*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          asOfDate: '2024-03-31',
          revenue: {
            sales: 150000,
            totalRevenue: 150000
          },
          expenses: {
            costOfGoodsSold: 125000,
            totalExpenses: 125000
          },
          netProfit: 25000
        }
      }
    }).as('getProfitLoss');

    cy.get('input[formControlName="asOfDate"]').type('2024-03-31');
    cy.get('[data-cy="generate-pl-button"]').click();

    cy.wait('@getProfitLoss');

    // Verify P&L figures
    cy.get('[data-cy="sales-revenue"]').should('contain', '₨150,000');
    cy.get('[data-cy="total-revenue"]').should('contain', '₨150,000');
    cy.get('[data-cy="cost-of-goods-sold"]').should('contain', '₨125,000');
    cy.get('[data-cy="total-expenses"]').should('contain', '₨125,000');
    cy.get('[data-cy="net-profit"]').should('contain', '₨25,000');
  });

  it('should validate data integrity throughout accounting workflow', () => {
    // Test account creation validation
    cy.visit('/accounting/accounts/new');

    // Try to save without required fields
    cy.get('[data-cy="save-account-button"]').click();

    // Should show validation errors
    cy.get('mat-error').should('contain', 'Account name is required');
    cy.get('mat-error').should('contain', 'Account type is required');
    cy.get('mat-error').should('contain', 'Account number is required');

    // Fill invalid data
    cy.get('input[formControlName="name"]').type('Test Account');
    cy.get('[data-cy="type-select"]').click();
    cy.get('mat-option').contains('Asset').click();
    cy.get('input[formControlName="accountNumber"]').type('1001');
    cy.get('input[formControlName="openingBalance"]').type('-1000'); // Invalid negative balance

    cy.get('[data-cy="save-account-button"]').click();
    cy.get('mat-error').should('contain', 'Opening balance cannot be negative');

    // Test journal entry validation
    cy.visit('/accounting/journal-entries/new');

    // Try to save without description
    cy.get('[data-cy="save-journal-entry-button"]').click();
    cy.get('mat-error').should('contain', 'Description is required');

    // Add unbalanced lines
    cy.get('textarea[formControlName="description"]').type('Test entry');
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').first().click();
    cy.get('mat-option').first().click();
    cy.get('input[formControlName="debit"]').first().type('1000');

    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').eq(1).click();
    cy.get('mat-option').first().click();
    cy.get('input[formControlName="credit"]').eq(1).type('500'); // Unbalanced

    cy.get('[data-cy="save-journal-entry-button"]').click();
    cy.get('mat-error').should('contain', 'Total debits must equal total credits');

    // Test hierarchical balance updates
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'ACC009',
          accountNumber: '1001-03',
          name: 'Petty Cash',
          type: 'asset',
          subtype: 'current_asset',
          parentId: 'ACC002',
          parentAccount: 'Current Assets',
          level: 3,
          isActive: true,
          openingBalance: 25000,
          currentBalance: 25000,
          debitTotal: 25000,
          creditTotal: 0,
          createdDate: '2024-03-20',
          lastUpdated: '2024-03-20',
          createdBy: 'accountant1'
        }
      }
    });

    // Create account
    cy.visit('/accounting/accounts/new');
    cy.get('[data-cy="parent-account-select"]').click();
    cy.get('mat-option').contains('Current Assets').click();
    cy.get('input[formControlName="name"]').type('Petty Cash');
    cy.get('input[formControlName="openingBalance"]').type('25000');
    cy.get('[data-cy="save-account-button"]').click();

    // Verify hierarchy updates
    cy.visit('/accounting/chart-of-accounts');
    cy.wait('@getHierarchy');

    // Verify parent account balance increased
    cy.get('[data-cy="account-balance"]').contains('Current Assets').next().should('contain', '₨175,000'); // 150000 + 25000
    cy.get('[data-cy="account-balance"]').contains('Assets').next().should('contain', '₨225,000'); // 200000 + 25000

    // Test ledger integrity
    cy.intercept('GET', '**/accounting/accounts/ACC003/ledger*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'LED001',
            accountId: 'ACC003',
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
            sourceModule: 'manual',
            sourceId: 'OPEN001',
            createdBy: 'admin',
            createdDate: '2024-03-01T00:00:00Z'
          }
        ]
      }
    });

    cy.visit('/accounting/accounts/ACC003/ledger');
    cy.wait('@getLedger');

    // Verify ledger balance integrity
    cy.get('[data-cy="ledger-balance"]').should('contain', '₨50,000');
    cy.get('[data-cy="opening-balance"]').should('contain', '₨0');
    cy.get('[data-cy="closing-balance"]').should('contain', '₨50,000');
  });

  it('should handle workflow errors and edge cases gracefully', () => {
    // Test duplicate account number
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Account number already exists'
      }
    }).as('duplicateAccount');

    cy.visit('/accounting/accounts/new');
    cy.get('input[formControlName="accountNumber"]').type('1001-01'); // Existing account
    cy.get('input[formControlName="name"]').type('Duplicate Account');
    cy.get('[data-cy="type-select"]').click();
    cy.get('mat-option').contains('Asset').click();
    cy.get('[data-cy="save-account-button"]').click();

    cy.wait('@duplicateAccount');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Account number already exists');

    // Test posting unbalanced journal entry
    cy.intercept('POST', '**/accounting/journal-entries/JE001/post', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Cannot post unbalanced journal entry'
      }
    }).as('unbalancedPost');

    cy.visit('/accounting/journal-entries/JE001');
    cy.get('[data-cy="post-journal-entry-button"]').click();
    cy.get('.mat-mdc-button').contains('Post').click();

    cy.wait('@unbalancedPost');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Cannot post unbalanced journal entry');

    // Test account deactivation with existing transactions
    cy.intercept('PUT', '**/accounting/accounts/ACC003', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Cannot deactivate account with existing transactions'
      }
    }).as('deactivateWithTransactions');

    cy.visit('/accounting/accounts/ACC003');
    cy.get('[data-cy="deactivate-account-button"]').click();
    cy.get('textarea[placeholder*="deactivation reason"]').type('Test deactivation');
    cy.get('.mat-mdc-button').contains('Deactivate').click();

    cy.wait('@deactivateWithTransactions');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Cannot deactivate account with existing transactions');

    // Test invalid date ranges
    cy.visit('/accounting/trial-balance');
    cy.get('input[formControlName="asOfDate"]').type('2024-12-31'); // Future date
    cy.get('[data-cy="generate-report-button"]').click();

    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invalid date range');

    // Test export functionality
    cy.intercept('GET', '**/accounting/export/chart-of-accounts*', {
      statusCode: 200,
      body: new Blob(['mock,csv,data'], { type: 'text/csv' }),
      headers: { 'content-type': 'text/csv' }
    }).as('exportCOA');

    cy.visit('/accounting/chart-of-accounts');
    cy.get('[data-cy="export-button"]').click();
    cy.get('mat-option').contains('CSV').click();

    cy.wait('@exportCOA');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Export completed successfully');
  });

  it('should maintain audit trail and traceability throughout workflow', () => {
    // Create account and verify audit trail
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'ACC010',
          accountNumber: '6001',
          name: 'Office Supplies Expense',
          type: 'expense',
          subtype: 'operating_expense',
          level: 1,
          isActive: true,
          openingBalance: 0,
          currentBalance: 0,
          debitTotal: 0,
          creditTotal: 0,
          createdDate: '2024-03-20T08:00:00Z',
          lastUpdated: '2024-03-20T08:00:00Z',
          createdBy: 'accountant1'
        }
      }
    });

    cy.visit('/accounting/accounts/new');
    cy.get('input[formControlName="name"]').type('Office Supplies Expense');
    cy.get('[data-cy="type-select"]').click();
    cy.get('mat-option').contains('Expense').click();
    cy.get('[data-cy="subtype-select"]').click();
    cy.get('mat-option').contains('Operating Expense').click();
    cy.get('[data-cy="save-account-button"]').click();

    // Verify creation audit
    cy.get('[data-cy="created-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="created-date"]').should('exist');

    // Create and post journal entry
    cy.intercept('POST', '**/accounting/journal-entries', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'JE002',
          entryNumber: 'JE-2024-002',
          entryDate: '2024-03-20',
          description: 'Office supplies purchase',
          lines: [
            {
              id: 'JEL003',
              accountId: 'ACC010',
              accountNumber: '6001',
              accountName: 'Office Supplies Expense',
              description: 'Office supplies',
              debit: 2500,
              credit: 0
            },
            {
              id: 'JEL004',
              accountId: 'ACC003',
              accountNumber: '1001-01',
              accountName: 'Cash in Hand',
              description: 'Cash payment',
              debit: 0,
              credit: 2500
            }
          ],
          totalDebit: 2500,
          totalCredit: 2500,
          status: 'draft',
          createdBy: 'accountant1',
          createdDate: '2024-03-20T09:00:00Z'
        }
      }
    });

    cy.visit('/accounting/journal-entries/new');
    cy.get('input[formControlName="entryDate"]').type('2024-03-20');
    cy.get('textarea[formControlName="description"]').type('Office supplies purchase');

    // Add debit line
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').first().click();
    cy.get('mat-option').contains('Office Supplies Expense').click();
    cy.get('input[formControlName="debit"]').first().type('2500');
    cy.get('input[formControlName="description"]').first().type('Office supplies');

    // Add credit line
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-select"]').eq(1).click();
    cy.get('mat-option').contains('Cash in Hand').click();
    cy.get('input[formControlName="credit"]').eq(1).type('2500');
    cy.get('input[formControlName="description"]').eq(1).type('Cash payment');

    cy.get('[data-cy="save-journal-entry-button"]').click();

    // Post the entry
    cy.intercept('POST', '**/accounting/journal-entries/JE002/post', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'JE002',
          status: 'posted',
          postedBy: 'accountant1',
          postedDate: '2024-03-20T10:00:00Z'
        }
      }
    });

    cy.get('[data-cy="post-journal-entry-button"]').click();
    cy.get('.mat-mdc-button').contains('Post').click();

    // Verify complete audit trail
    cy.get('[data-cy="audit-trail"]').within(() => {
      cy.get('[data-cy="creation-entry"]').should('exist');
      cy.get('[data-cy="posting-entry"]').should('exist');
    });

    // Verify account balances updated
    cy.visit('/accounting/accounts/ACC010');
    cy.get('[data-cy="current-balance"]').should('contain', '₨2,500'); // Debit balance for expense
    cy.get('[data-cy="debit-total"]').should('contain', '₨2,500');

    cy.visit('/accounting/accounts/ACC003');
    cy.get('[data-cy="current-balance"]').should('contain', '₨47,500'); // Cash reduced by 2500
    cy.get('[data-cy="credit-total"]').should('contain', '₨27,500'); // Previous 25000 + 2500

    // Verify ledger entries
    cy.visit('/accounting/accounts/ACC010/ledger');
    cy.get('[data-cy="ledger-entry"]').should('have.length', 1);
    cy.get('[data-cy="ledger-debit"]').should('contain', '₨2,500');
    cy.get('[data-cy="ledger-balance"]').should('contain', '₨2,500');
    cy.get('[data-cy="ledger-reference"]').should('contain', 'JE-2024-002');
  });
});
