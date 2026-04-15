const mongoose = require('mongoose');
const Item = require('../models/Item');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');
const StockMovement = require('../models/StockMovement');

/**
 * Stock Reconciliation Service
 * Detects and fixes discrepancies between different stock tracking mechanisms:
 * 1. Item.inventory.currentStock (global stock per item)
 * 2. Inventory collection (warehouse-level stock)
 * 3. Batch collection (batch-level stock with remainingQuantity)
 * 4. StockMovement aggregation (calculated from transaction log)
 */
class StockReconciliationService {
  /**
   * Run full stock reconciliation analysis
   * Compares stock values across all tracking mechanisms
   * @param {Object} options - Options
   * @param {boolean} [options.autoFix=false] - Automatically fix discrepancies
   * @param {string} [options.itemId] - Limit to specific item
   * @param {string} [options.warehouseId] - Limit to specific warehouse
   * @returns {Promise<Object>} Reconciliation report
   */
  async runReconciliation(options = {}) {
    const { autoFix = false, itemId, warehouseId } = options;

    const report = {
      timestamp: new Date(),
      totalItemsChecked: 0,
      discrepanciesFound: 0,
      discrepanciesFixed: 0,
      errors: [],
      details: [],
      summary: {
        itemInventoryVsInventoryCollection: 0,
        inventoryCollectionVsBatch: 0,
        stockMovementVsInventory: 0,
      },
    };

    try {
      // Build item query
      const itemQuery = { isActive: true };
      if (itemId) {
        itemQuery._id = new mongoose.Types.ObjectId(itemId);
      }

      const items = await Item.find(itemQuery).lean();
      report.totalItemsChecked = items.length;

      for (const item of items) {
        try {
          const itemReport = await this._reconcileItem(item, warehouseId, autoFix);

          if (itemReport.hasDiscrepancy) {
            report.discrepanciesFound++;
            report.details.push(itemReport);

            if (itemReport.fixed) {
              report.discrepanciesFixed++;
            }

            // Update summary counts
            if (itemReport.discrepancies.itemVsInventory) {
              report.summary.itemInventoryVsInventoryCollection++;
            }
            if (itemReport.discrepancies.inventoryVsBatch) {
              report.summary.inventoryCollectionVsBatch++;
            }
            if (itemReport.discrepancies.movementVsInventory) {
              report.summary.stockMovementVsInventory++;
            }
          }
        } catch (error) {
          report.errors.push({
            itemId: item._id,
            itemCode: item.code,
            error: error.message,
          });
        }
      }

      report.status = report.errors.length === 0 ? 'completed' : 'completed_with_errors';
    } catch (error) {
      report.status = 'failed';
      report.errors.push({ error: error.message });
    }

    return report;
  }

  /**
   * Reconcile a single item's stock across all sources
   * @private
   */
  async _reconcileItem(item, warehouseId, autoFix) {
    const itemId = item._id;
    const itemReport = {
      itemId,
      itemCode: item.code,
      itemName: item.name,
      hasDiscrepancy: false,
      fixed: false,
      discrepancies: {},
      values: {},
    };

    // 1. Get Item.inventory.currentStock
    const itemCurrentStock = item.inventory?.currentStock || 0;
    itemReport.values.itemCurrentStock = itemCurrentStock;

    // 2. Get sum from Inventory collection
    const inventoryQuery = { item: new mongoose.Types.ObjectId(itemId) };
    if (warehouseId) {
      inventoryQuery.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const inventoryAgg = await Inventory.aggregate([
      { $match: inventoryQuery },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    const inventoryTotal = inventoryAgg[0]?.total || 0;
    itemReport.values.inventoryCollectionTotal = inventoryTotal;

    // 3. Get sum from Batch collection (remainingQuantity for active batches)
    const batchQuery = {
      item: new mongoose.Types.ObjectId(itemId),
      status: { $in: ['active', 'pending'] },
    };
    if (warehouseId) {
      batchQuery.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const batchAgg = await Batch.aggregate([
      { $match: batchQuery },
      { $group: { _id: null, total: { $sum: '$remainingQuantity' } } },
    ]);
    const batchTotal = batchAgg[0]?.total || 0;
    itemReport.values.batchTotal = batchTotal;

    // 4. Calculate from StockMovement (optional - can be expensive)
    // Only do this if there's already a discrepancy
    let movementCalculatedStock = null;

    // Check for discrepancies
    const tolerance = 0.01; // Allow small floating point differences

    // Compare Item.inventory.currentStock vs Inventory collection
    if (Math.abs(itemCurrentStock - inventoryTotal) > tolerance) {
      itemReport.hasDiscrepancy = true;
      itemReport.discrepancies.itemVsInventory = {
        itemCurrentStock,
        inventoryTotal,
        difference: itemCurrentStock - inventoryTotal,
      };
    }

    // Compare Inventory collection vs Batch (only if batches exist)
    if (batchTotal > 0 && Math.abs(inventoryTotal - batchTotal) > tolerance) {
      itemReport.hasDiscrepancy = true;
      itemReport.discrepancies.inventoryVsBatch = {
        inventoryTotal,
        batchTotal,
        difference: inventoryTotal - batchTotal,
      };
    }

    // If there's a discrepancy, also calculate from movements for verification
    if (itemReport.hasDiscrepancy) {
      try {
        movementCalculatedStock = await this._calculateStockFromMovements(itemId, warehouseId);
        itemReport.values.movementCalculatedStock = movementCalculatedStock;

        if (Math.abs(inventoryTotal - movementCalculatedStock) > tolerance) {
          itemReport.discrepancies.movementVsInventory = {
            inventoryTotal,
            movementCalculatedStock,
            difference: inventoryTotal - movementCalculatedStock,
          };
        }
      } catch (error) {
        itemReport.values.movementCalculatedStock = `Error: ${error.message}`;
      }
    }

    // Auto-fix if requested
    if (autoFix && itemReport.hasDiscrepancy) {
      try {
        // The source of truth is Inventory collection
        // Sync Item.inventory.currentStock from Inventory
        await Item.findByIdAndUpdate(itemId, {
          'inventory.currentStock': Math.max(0, inventoryTotal),
        });

        itemReport.fixed = true;
        itemReport.fixedTo = inventoryTotal;
      } catch (error) {
        itemReport.fixError = error.message;
      }
    }

    return itemReport;
  }

  /**
   * Calculate stock from StockMovement records
   * @private
   */
  async _calculateStockFromMovements(itemId, warehouseId) {
    const matchQuery = {
      itemId: new mongoose.Types.ObjectId(itemId),
      status: 'completed',
    };

    if (warehouseId) {
      matchQuery.$or = [
        { warehouse: new mongoose.Types.ObjectId(warehouseId) },
        { 'transferInfo.toWarehouse': new mongoose.Types.ObjectId(warehouseId) },
      ];
    }

    const result = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: [{ $eq: ['$movementType', 'in'] }, '$quantity', 0],
            },
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ['$movementType', 'out'] }, { $abs: '$quantity' }, 0],
            },
          },
        },
      },
    ]);

    if (result.length === 0) {
      return 0;
    }

    return Math.max(0, result[0].totalIn - result[0].totalOut);
  }

  /**
   * Sync Item.inventory.currentStock for all items from Inventory collection
   * Use this to fix all Item stocks after database migrations or bulk imports
   * @param {Object} options - Options
   * @param {boolean} [options.dryRun=true] - Only report, don't make changes
   * @returns {Promise<Object>} Sync report
   */
  async syncAllItemStocks(options = {}) {
    const { dryRun = true } = options;

    const report = {
      timestamp: new Date(),
      dryRun,
      totalItems: 0,
      itemsUpdated: 0,
      itemsUnchanged: 0,
      errors: [],
      updates: [],
    };

    try {
      // Get all items with their current stock
      const items = await Item.find({ isActive: true }).lean();
      report.totalItems = items.length;

      // Get aggregated stock from Inventory collection
      const inventoryTotals = await Inventory.aggregate([
        {
          $group: {
            _id: '$item',
            totalQuantity: { $sum: '$quantity' },
          },
        },
      ]);

      // Create a map for quick lookup
      const inventoryMap = new Map();
      inventoryTotals.forEach((inv) => {
        inventoryMap.set(inv._id.toString(), inv.totalQuantity);
      });

      for (const item of items) {
        const itemId = item._id.toString();
        const currentStock = item.inventory?.currentStock || 0;
        const inventoryStock = inventoryMap.get(itemId) || 0;

        if (Math.abs(currentStock - inventoryStock) > 0.01) {
          report.updates.push({
            itemId: item._id,
            itemCode: item.code,
            itemName: item.name,
            oldStock: currentStock,
            newStock: inventoryStock,
            difference: inventoryStock - currentStock,
          });

          if (!dryRun) {
            try {
              await Item.findByIdAndUpdate(item._id, {
                'inventory.currentStock': Math.max(0, inventoryStock),
              });
              report.itemsUpdated++;
            } catch (error) {
              report.errors.push({
                itemId: item._id,
                itemCode: item.code,
                error: error.message,
              });
            }
          } else {
            report.itemsUpdated++;
          }
        } else {
          report.itemsUnchanged++;
        }
      }

      report.status = 'completed';
    } catch (error) {
      report.status = 'failed';
      report.errors.push({ error: error.message });
    }

    return report;
  }

  /**
   * Get stock health summary across the system
   * @returns {Promise<Object>} Health summary
   */
  async getStockHealthSummary() {
    const summary = {
      timestamp: new Date(),
      status: 'healthy',
      checks: [],
    };

    // Check 1: Items with negative stock
    const negativeStockItems = await Item.countDocuments({
      isActive: true,
      'inventory.currentStock': { $lt: 0 },
    });
    summary.checks.push({
      name: 'Negative Item Stock',
      status: negativeStockItems === 0 ? 'pass' : 'fail',
      count: negativeStockItems,
      description: 'Items with negative currentStock in Item model',
    });

    // Check 2: Inventory records with negative quantity
    const negativeInventory = await Inventory.countDocuments({
      quantity: { $lt: 0 },
    });
    summary.checks.push({
      name: 'Negative Inventory Records',
      status: negativeInventory === 0 ? 'pass' : 'fail',
      count: negativeInventory,
      description: 'Inventory records with negative quantity',
    });

    // Check 3: Active batches with negative remaining quantity
    const negativeBatches = await Batch.countDocuments({
      status: 'active',
      remainingQuantity: { $lt: 0 },
    });
    summary.checks.push({
      name: 'Negative Batch Quantities',
      status: negativeBatches === 0 ? 'pass' : 'fail',
      count: negativeBatches,
      description: 'Active batches with negative remainingQuantity',
    });

    // Check 4: Items without any Inventory records
    const itemsWithoutInventory = await Item.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'item',
          as: 'inventoryRecords',
        },
      },
      { $match: { inventoryRecords: { $size: 0 }, 'inventory.currentStock': { $gt: 0 } } },
      { $count: 'count' },
    ]);
    const orphanedItemStock = itemsWithoutInventory[0]?.count || 0;
    summary.checks.push({
      name: 'Orphaned Item Stock',
      status: orphanedItemStock === 0 ? 'pass' : 'warning',
      count: orphanedItemStock,
      description: 'Items with stock but no Inventory collection records',
    });

    // Check 5: Sample discrepancy check (random 100 items)
    const sampleItems = await Item.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 100 } },
    ]);

    let discrepancyCount = 0;
    for (const item of sampleItems) {
      const inventorySum = await Inventory.aggregate([
        { $match: { item: item._id } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const inventoryTotal = inventorySum[0]?.total || 0;
      const itemStock = item.inventory?.currentStock || 0;

      if (Math.abs(itemStock - inventoryTotal) > 0.01) {
        discrepancyCount++;
      }
    }

    const discrepancyRate = sampleItems.length > 0 ? (discrepancyCount / sampleItems.length) * 100 : 0;
    summary.checks.push({
      name: 'Stock Sync Health (Sample)',
      status: discrepancyRate < 5 ? 'pass' : discrepancyRate < 20 ? 'warning' : 'fail',
      value: `${discrepancyRate.toFixed(1)}%`,
      sampleSize: sampleItems.length,
      discrepancies: discrepancyCount,
      description: 'Percentage of sampled items with Item vs Inventory discrepancy',
    });

    // Determine overall status
    const failedChecks = summary.checks.filter((c) => c.status === 'fail').length;
    const warningChecks = summary.checks.filter((c) => c.status === 'warning').length;

    if (failedChecks > 0) {
      summary.status = 'unhealthy';
    } else if (warningChecks > 0) {
      summary.status = 'warning';
    }

    return summary;
  }

  /**
   * Create missing Inventory records for items that have stock in Item model
   * but no corresponding Inventory collection records
   * @param {string} defaultWarehouseId - Default warehouse to assign orphaned stock
   * @param {Object} options - Options
   * @param {boolean} [options.dryRun=true] - Only report, don't make changes
   * @returns {Promise<Object>} Migration report
   */
  async migrateOrphanedStock(defaultWarehouseId, options = {}) {
    const { dryRun = true } = options;

    if (!defaultWarehouseId) {
      throw new Error('Default warehouse ID is required');
    }

    const report = {
      timestamp: new Date(),
      dryRun,
      defaultWarehouseId,
      itemsFound: 0,
      recordsCreated: 0,
      errors: [],
      migrations: [],
    };

    try {
      // Find items with stock but no inventory records
      const orphanedItems = await Item.aggregate([
        { $match: { isActive: true, 'inventory.currentStock': { $gt: 0 } } },
        {
          $lookup: {
            from: 'inventories',
            localField: '_id',
            foreignField: 'item',
            as: 'inventoryRecords',
          },
        },
        { $match: { inventoryRecords: { $size: 0 } } },
        { $project: { code: 1, name: 1, 'inventory.currentStock': 1 } },
      ]);

      report.itemsFound = orphanedItems.length;

      for (const item of orphanedItems) {
        const migration = {
          itemId: item._id,
          itemCode: item.code,
          itemName: item.name,
          quantity: item.inventory.currentStock,
          warehouseId: defaultWarehouseId,
        };

        if (!dryRun) {
          try {
            await Inventory.create({
              item: item._id,
              warehouse: new mongoose.Types.ObjectId(defaultWarehouseId),
              quantity: item.inventory.currentStock,
              reservedQuantity: 0,
              available: item.inventory.currentStock,
              lastUpdated: new Date(),
            });
            migration.status = 'created';
            report.recordsCreated++;
          } catch (error) {
            migration.status = 'error';
            migration.error = error.message;
            report.errors.push(migration);
          }
        } else {
          migration.status = 'would_create';
          report.recordsCreated++;
        }

        report.migrations.push(migration);
      }

      report.status = 'completed';
    } catch (error) {
      report.status = 'failed';
      report.errors.push({ error: error.message });
    }

    return report;
  }
}

module.exports = new StockReconciliationService();
