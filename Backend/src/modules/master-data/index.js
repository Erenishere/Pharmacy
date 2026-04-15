/**
 * Master Data Module
 * Manages core business entities: Customers, Suppliers, Items, Companies
 */

module.exports = {
  name: 'master-data',
  version: '1.0.0',
  description: 'Master data management for core business entities',
  
  // Controllers
  controllers: {
    customers: require('./controllers/customer.controller'),
    suppliers: require('./controllers/supplier.controller'),
    items: require('./controllers/item.controller'),
    companies: require('./controllers/company.controller'),
    categories: require('./controllers/category.controller'),
    subCategories: require('./controllers/subCategory.controller'),
    formulas: require('./controllers/formula.controller'),
    formulaSizes: require('./controllers/formulaSize.controller'),
    towns: require('./controllers/town.controller'),
    areas: require('./controllers/area.controller'),
    businessTypes: require('./controllers/businessType.controller'),
    customerTypes: require('./controllers/customerType.controller'),
    designations: require('./controllers/designation.controller'),
  },
  
  // Services
  services: {
    customers: require('./services/customer.service'),
    suppliers: require('./services/supplier.service'),
    items: require('./services/item.service'),
    companies: require('./services/company.service'),
    categories: require('./services/category.service'),
  },
  
  // Routes
  routes: require('./routes/masterData.routes'),
  
  // Module metadata
  dependencies: ['auth'],
  models: [
    'Customer',
    'Supplier',
    'Item',
    'Company',
    'Category',
    'SubCategory',
    'Formula',
    'FormulaSize',
    'Town',
    'Area',
    'BusinessType',
    'CustomerType',
    'Designation',
    'DimensionBranch',
  ],
};
