/**
 * Reports Module
 * Manages business analytics and reporting: Sales, Inventory, Financial reports
 */

module.exports = {
  name: 'reports',
  version: '1.0.0',
  description: 'Business analytics and reporting',
  
  // Controllers
  controllers: {
    salesReports: require('./controllers/salesReport.controller'),
    inventoryReports: require('./controllers/inventoryReport.controller'),
    financialReports: require('./controllers/financialReport.controller'),
    customerReports: require('./controllers/customerReport.controller'),
    supplierReports: require('./controllers/supplierReport.controller'),
    analytics: require('./controllers/analytics.controller'),
    dashboard: require('./controllers/dashboard.controller'),
    export: require('./controllers/export.controller'),
  },
  
  // Services
  services: {
    salesReports: require('./services/salesReport.service'),
    inventoryReports: require('./services/inventoryReport.service'),
    financialReports: require('./services/financialReport.service'),
    customerReports: require('./services/customerReport.service'),
    analytics: require('./services/analytics.service'),
    enhancedAnalytics: require('./services/enhancedAnalytics.service'),
    dashboard: require('./services/dashboard.service'),
    export: require('./services/export.service'),
    boxUnitReport: require('./services/boxUnitReport.service'),
  },
  
  // Routes
  routes: require('./routes/reports.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data', 'sales', 'purchase', 'inventory', 'finance'],
  models: [],
  
  // Report configuration
  config: {
    maxExportRows: 100000,
    defaultDateRange: 30, // days
    cacheDuration: 300, // 5 minutes
  },
};
