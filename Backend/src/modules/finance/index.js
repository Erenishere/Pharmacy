/**
 * Finance Module
 * Manages financial operations: Cashbook, Ledger, Accounts, Payments, Receipts
 */

module.exports = {
  name: 'finance',
  version: '1.0.0',
  description: 'Financial management and accounting',
  
  // Controllers
  controllers: {
    cashReceipts: require('./controllers/cashReceipt.controller'),
    cashPayments: require('./controllers/cashPayment.controller'),
    cashBook: require('./controllers/cashBook.controller'),
    ledger: require('./controllers/ledger.controller'),
    accounts: require('./controllers/account.controller'),
    bankReconciliation: require('./controllers/bankReconciliation.controller'),
    capital: require('./controllers/capital.controller'),
    investorProfitShare: require('./controllers/investorProfitShare.controller'),
    expense: require('./controllers/expense.controller'),
    expenseCategory: require('./controllers/expenseCategory.controller'),
    tax: require('./controllers/tax.controller'),
    incomeTax: require('./controllers/incomeTax.controller'),
  },
  
  // Services
  services: {
    cashReceipts: require('./services/cashReceipt.service'),
    cashPayments: require('./services/cashPayment.service'),
    cashBook: require('./services/cashBook.service'),
    ledger: require('./services/ledger.service'),
    accounts: require('./services/account.service'),
    bankReconciliation: require('./services/bankReconciliation.service'),
    capital: require('./services/capital.service'),
    investorProfitShare: require('./services/investorProfitShare.service'),
    expense: require('./services/expense.service'),
    tax: require('./services/tax.service'),
    advancedTax: require('./services/advancedTax.service'),
  },
  
  // Routes
  routes: require('./routes/finance.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data'],
  models: [
    'CashReceipt',
    'CashPayment',
    'LedgerEntry',
    'Account',
    'BankReconciliation',
    'Capital',
    'InvestorProfitShare',
    'Expense',
    'ExpenseCategory',
    'TaxConfig',
    'AccountHead',
    'ClaimAccount',
  ],
};
