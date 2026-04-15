/**
 * Sales Module
 * Manages sales operations: Invoices, Returns, POS, Orders, Quotations
 */

module.exports = {
  name: 'sales',
  version: '1.0.0',
  description: 'Sales operations and order management',
  
  // Controllers
  controllers: {
    salesInvoices: require('./controllers/salesInvoice.controller'),
    salesReturns: require('./controllers/salesReturn.controller'),
    pos: require('./controllers/pos.controller'),
    quotations: require('./controllers/quotation.controller'),
    eOrders: require('./controllers/eOrder.controller'),
    estimates: require('./controllers/estimate.controller'),
    schemes: require('./controllers/scheme.controller'),
    routePlans: require('./controllers/routePlan.controller'),
    salesmen: require('./controllers/salesman.controller'),
  },
  
  // Services
  services: {
    salesInvoices: require('./services/salesInvoice.service'),
    salesReturns: require('./services/salesReturn.service'),
    pos: require('./services/pos.service'),
    quotations: require('./services/quotation.service'),
    eOrders: require('./services/eOrder.service'),
    schemes: require('./services/scheme.service'),
    routePlans: require('./services/routePlan.service'),
    salesmen: require('./services/salesman.service'),
    creditManagement: require('./services/creditManagement.service'),
  },
  
  // Routes
  routes: require('./routes/sales.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data', 'inventory', 'finance'],
  models: [
    'Invoice',
    'Quotation',
    'QuotationHistory',
    'EOrder',
    'Scheme',
    'RoutePlan',
    'Salesman',
    'Route',
    'RecoverySummary',
    'Estimate',
  ],
};
