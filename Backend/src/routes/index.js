const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const customerRoutes = require('./customers');
const supplierRoutes = require('./suppliers');
const itemRoutes = require('./itemRoutes');
const batchRoutes = require('./batchRoutes');
const companyRoutes = require('./companyRoutes');
const companyGroupRoutes = require('./companyGroupRoutes');
const taxRoutes = require('./taxRoutes');
const salesInvoiceRoutes = require('./salesInvoiceRoutes');
const purchaseInvoiceRoutes = require('./purchaseInvoiceRoutes');
const accountsRoutes = require('./accounts');
const cashbookRoutes = require('./cashbook');
const reportRoutes = require('./reportRoutes');
const stockMovementRoutes = require('./stockMovementRoutes');
const monitoringRoutes = require('./monitoring');
const warehouseRoutes = require('./warehouseRoutes');
const schemeRoutes = require('./schemeRoutes');
const salesmanRoutes = require('./salesmanRoutes');
const purchaseOrderRoutes = require('./purchaseOrderRoutes');
const routeRoutes = require('./routeRoutes');
const quotationHistoryRoutes = require('./quotationHistory');
const rateSuggestionRoutes = require('./rateSuggestions');
const printRoutes = require('./printRoutes');
const smsRoutes = require('./smsRoutes');
const salaryPackageRoutes = require('./salaryPackageRoutes');
const salaryCalculationRoutes = require('./salaryCalculationRoutes');
const targetTrackingRoutes = require('./targetTrackingRoutes');
const townRoutes = require('./townRoutes');
const areaRoutes = require('./areaRoutes');
const categoryRoutes = require('./categoryRoutes');
const subCategoryRoutes = require('./subCategoryRoutes');
const formulaRoutes = require('./formulaRoutes');
const formulaSizeRoutes = require('./formulaSizeRoutes');
const businessTypeRoutes = require('./businessTypeRoutes');
const transporterRoutes = require('./transporterRoutes');
const claimAccountRoutes = require('./claimAccountRoutes');
const dimensionRoutes = require('./dimensionRoutes');
const eOrderRoutes = require('./eOrderRoutes');
const quotationRoutes = require('./quotationRoutes');
const salesReportRoutes = require('./salesReportRoutes');
const purchaseReportRoutes = require('./purchaseReportRoutes');
const inventoryManagementRoutes = require('./inventoryManagementRoutes');
const cashReceiptRoutes = require('./cashReceiptRoutes');
const cashPaymentRoutes = require('./cashPaymentRoutes');
const cashAdjustmentRoutes = require('./cashAdjustmentRoutes');
const pdcRoutes = require('./pdcRoutes');
const bankReconciliationRoutes = require('./bankReconciliationRoutes');
const biltyRoutes = require('./biltyRoutes');
const financialReportRoutes = require('./financialReportRoutes');
const capitalRoutes = require('./capitalRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const inventoryReportRoutes = require('./inventoryReportRoutes');
const taxReportRoutes = require('./taxReportRoutes');
const investorRoutes = require('./investorRoutes');
const posRoutes = require('./posRoutes');
const expenseRoutes = require('./expenseRoutes');
const expenseCategoryRoutes = require('./expenseCategoryRoutes');
const letterRoutes = require('./letterRoutes');
const investorProfitShareRoutes = require('./investorProfitShareRoutes');
const routePlanRoutes = require('./routePlanRoutes');
const recoverySummaryRoutes = require('./recoverySummaryRoutes');
const accountHeadRoutes = require('./accountHeadRoutes');
const salesReturnRoutes = require('./salesReturnRoutes');
const stockReconciliationRoutes = require('./stockReconciliationRoutes');
const biltyReceiptRoutes = require('./biltyReceiptRoutes');
const customerTypeRoutes = require('./customerTypeRoutes');
const designationRoutes = require('./designationRoutes');
const salarySheetRoutes = require('./salarySheet');

const router = express.Router();

// API version and info
router.get('/', (req, res) => {
  const Response = require('../utils/response');
  return Response.success(res, {
    name: 'Indus Traders Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      customers: '/api/v1/customers',
      suppliers: '/api/v1/suppliers',
      companies: '/api/v1/companies',
      companyGroups: '/api/v1/company-groups',
      items: '/api/v1/items',
      batches: '/api/v1/batches',
      tax: '/api/v1/tax',
      salesInvoices: '/api/v1/invoices/sales',
      purchaseInvoices: '/api/v1/invoices/purchase',
      accounts: '/api/v1/accounts',
      cashbook: '/api/v1/cashbook',
      reports: '/api/v1/reports',
      stockMovements: '/api/v1/stock-movements',
      warehouses: '/api/v1/warehouses',
      schemes: '/api/v1/schemes',
      routes: '/api/v1/routes',
      quotationHistory: '/api/v1/quotation-history',
      rateSuggestions: '/api/v1/rate-suggestions',
      print: '/api/v1/print',
      sms: '/api/v1/sms',
      salaryPackages: '/api/v1/salary-packages',
      salaryCalculations: '/api/v1/salary',
      targets: '/api/v1/targets',
      eOrders: '/api/v1/e-orders',
      quotations: '/api/v1/quotations',
      inventoryManagement: '/api/v1/inventory',
      cashReceipts: '/api/v1/cash-receipts',
      cashPayments: '/api/v1/cash-payments',
      cashAdjustments: '/api/v1/cash-adjustments',
      pdc: '/api/v1/pdc',
      bankReconciliation: '/api/v1/bank-reconciliation',
      bilty: '/api/v1/bilty',
      financialReports: '/api/v1/financial-reports',
      capital: '/api/v1/capital',
      dashboard: '/api/v1/dashboard',
      inventoryReports: '/api/v1/inventory-reports',
      taxReports: '/api/v1/tax-reports',
      investors: '/api/v1/investors',
      pos: '/api/v1/salesman/pos',
      expenses: '/api/v1/expenses',
      expenseCategories: '/api/v1/expense-categories',
      letters: '/api/v1/letters',
      investorProfitShare: '/api/v1/investor-profit-share',
      routePlans: '/api/v1/route-plans',
      recoverySummary: '/api/v1/recovery-summary',
      stockReconciliation: '/api/v1/stock-reconciliation',
    },
  }, 'API is running successfully');
});

// Mount API Routes
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/customers', customerRoutes);
router.use('/v1/suppliers', supplierRoutes);
router.use('/v1/companies', companyRoutes);
router.use('/v1/company-groups', companyGroupRoutes);
router.use('/v1/items', itemRoutes);
router.use('/v1/batches', batchRoutes); // Batch routes mounted at /v1/batches
router.use('/v1/tax', taxRoutes); // Tax calculation routes
router.use('/v1/invoices/sales', salesInvoiceRoutes); // Sales invoice routes
router.use('/v1/invoices/purchase', purchaseInvoiceRoutes); // Purchase invoice routes
router.use('/v1/purchase-invoices', purchaseInvoiceRoutes); // Alternative purchase invoice routes for returns
router.use('/v1/accounts', accountsRoutes); // Accounts and ledger routes
router.use('/v1/cashbook', cashbookRoutes); // Cash book routes
router.use('/v1/reports', reportRoutes); // Reporting and analytics routes
router.use('/v1/stock-movements', stockMovementRoutes); // Stock movement routes
router.use('/v1/monitoring', monitoringRoutes); // Monitoring and health check routes
router.use('/v1/warehouses', warehouseRoutes); // Warehouse routes (mounted at /api/v1/warehouses)
router.use('/warehouses', warehouseRoutes); // Warehouse routes (mounted at /api/warehouses to match task requirements)
router.use('/inventory', itemRoutes); // Inventory routes (mounted at /api/inventory to support /api/inventory/transfer)
router.use('/v1/schemes', schemeRoutes); // Scheme routes (mounted at /api/v1/schemes)
router.use('/v1/salesmen', salesmanRoutes); // Salesman routes
router.use('/v1/purchase-orders', purchaseOrderRoutes); // Purchase order routes
router.use('/v1/routes', routeRoutes); // Versioned route routes
router.use('/routes', routeRoutes); // Route routes
router.use('/v1/quotation-history', quotationHistoryRoutes); // Versioned quotation history routes
router.use('/quotation-history', quotationHistoryRoutes); // Quotation history routes
router.use('/v1/rate-suggestions', rateSuggestionRoutes); // Versioned rate suggestion routes
router.use('/rate-suggestions', rateSuggestionRoutes); // Rate suggestion routes
router.use('/v1/print', printRoutes); // Versioned print routes
router.use('/print', printRoutes); // Print routes
router.use('/v1/sms', smsRoutes); // SMS routes
router.use('/v1/salary-packages', salaryPackageRoutes); // Salary package routes
router.use('/v1/salary', salaryCalculationRoutes); // Salary calculation routes
router.use('/v1/targets', targetTrackingRoutes); // Target tracking routes
router.use('/v1/towns', townRoutes); // Town routes
router.use('/v1/areas', areaRoutes); // Area routes
router.use('/v1/categories', categoryRoutes); // Category routes
router.use('/v1/subcategories', subCategoryRoutes); // Sub-category routes
router.use('/v1/formulas', formulaRoutes); // Formula routes
router.use('/v1/formula-sizes', formulaSizeRoutes); // Formula size routes
router.use('/v1/business-types', businessTypeRoutes); // Business type routes
router.use('/v1/transporters', transporterRoutes); // Transporter routes
router.use('/v1/claim-accounts', claimAccountRoutes); // Claim account routes
router.use('/v1/dimensions', dimensionRoutes); // Dimension/Branch routes
router.use('/v1/e-orders', eOrderRoutes); // E-Order routes
router.use('/v1/quotations', quotationRoutes); // Quotation routes
router.use('/v1/reports/sales', salesReportRoutes); // Sales report routes
router.use('/v1/purchase-reports', purchaseReportRoutes); // Purchase report routes
router.use('/v1/inventory', inventoryManagementRoutes); // Inventory management routes
router.use('/v1/cash-receipts', cashReceiptRoutes); // Cash receipt routes
router.use('/v1/cash-payments', cashPaymentRoutes); // Cash payment routes
router.use('/v1/cash-adjustments', cashAdjustmentRoutes); // Cash adjustment routes
router.use('/v1/pdc', pdcRoutes); // Post-dated cheque routes
router.use('/v1/bank-reconciliation', bankReconciliationRoutes); // Bank reconciliation routes
router.use('/v1/bilty', biltyRoutes); // Bilty (transport receipt) routes
router.use('/v1/reports/financial', financialReportRoutes); // Financial report routes
router.use('/v1/capital', capitalRoutes); // Capital management routes
router.use('/v1/dashboard', dashboardRoutes); // Dashboard and KPI routes
router.use('/v1/reports/inventory', inventoryReportRoutes); // Inventory report routes
router.use('/v1/reports/tax', taxReportRoutes); // Tax report routes
router.use('/v1/investors', investorRoutes); // Investor management routes
router.use('/v1/salesman/pos', posRoutes); // POS routes for salesman
router.use('/v1/expenses', expenseRoutes); // Expense management routes
router.use('/v1/expense-categories', expenseCategoryRoutes); // Expense category routes
router.use('/v1/letters', letterRoutes); // Letters & agreements routes
router.use('/v1/investor-profit-share', investorProfitShareRoutes); // Investor profit share routes
router.use('/v1/route-plans', routePlanRoutes); // Route plan routes
router.use('/v1/recovery-summary', recoverySummaryRoutes); // Recovery summary routes
router.use('/v1/account-heads', accountHeadRoutes); // Account head routes
router.use('/v1/sales-returns', salesReturnRoutes); // Sales return routes
router.use('/v1/stock-reconciliation', stockReconciliationRoutes); // Stock reconciliation routes
router.use('/v1/bilty-receipts', biltyReceiptRoutes); // Standalone bilty receipt routes
router.use('/v1/customer-types', customerTypeRoutes);
router.use('/v1/designations', designationRoutes);
router.use('/v1/salary-sheets', salarySheetRoutes); // Salary sheet routes

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
