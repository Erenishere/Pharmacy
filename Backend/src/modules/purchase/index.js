/**
 * Purchase Module
 * Manages procurement operations: Purchase Orders, Purchase Invoices, Returns
 */

module.exports = {
  name: 'purchase',
  version: '1.0.0',
  description: 'Purchase and procurement operations',
  
  // Controllers
  controllers: {
    purchaseOrders: require('./controllers/purchaseOrder.controller'),
    purchaseInvoices: require('./controllers/purchaseInvoice.controller'),
    purchaseReturns: require('./controllers/purchaseReturn.controller'),
    transporters: require('./controllers/transporter.controller'),
    biltyReceipts: require('./controllers/biltyReceipt.controller'),
  },
  
  // Services
  services: {
    purchaseOrders: require('./services/purchaseOrder.service'),
    purchaseInvoices: require('./services/purchaseInvoice.service'),
    purchaseReturns: require('./services/purchaseReturn.service'),
    transporters: require('./services/transporter.service'),
    biltyReceipts: require('./services/biltyReceipt.service'),
  },
  
  // Routes
  routes: require('./routes/purchase.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data', 'inventory', 'finance'],
  models: [
    'PurchaseOrder',
    'Invoice', // Shared with sales
    'Transporter',
    'BiltyReceipt',
    'Supplier',
  ],
};
