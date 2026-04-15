/**
 * Inventory Module
 * Manages stock operations: Movements, Warehouses, Batches, Physical Counts
 */

module.exports = {
  name: 'inventory',
  version: '1.0.0',
  description: 'Inventory and warehouse management',
  
  // Controllers
  controllers: {
    stockMovements: require('./controllers/stockMovement.controller'),
    warehouses: require('./controllers/warehouse.controller'),
    batches: require('./controllers/batch.controller'),
    physicalCounts: require('./controllers/physicalCount.controller'),
    inventoryAdjustments: require('./controllers/inventoryAdjustment.controller'),
    inventoryTransfers: require('./controllers/inventoryTransfer.controller'),
  },
  
  // Services
  services: {
    stockMovements: require('./services/stockMovement.service'),
    inventory: require('./services/inventory.service'),
    batches: require('./services/batch.service'),
    batchSelector: require('./services/batchSelector.service'),
    warehouses: require('./services/warehouse.service'),
    physicalCounts: require('./services/physicalCount.service'),
    inventoryAdjustments: require('./services/inventoryAdjustment.service'),
  },
  
  // Routes
  routes: require('./routes/inventory.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data'],
  models: [
    'StockMovement',
    'Warehouse',
    'Batch',
    'PhysicalCount',
    'Inventory',
    'Reservation',
  ],
};
