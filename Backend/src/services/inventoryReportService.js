const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Batch = require('../models/Batch');
const mongoose = require('mongoose');

/**
 * Inventory Report Service
 * Handles business logic for inventory reporting
 */
class InventoryReportService {
  /**
   * Generate stock level report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Stock level report
   */
  async getStockLevelReport(filters = {}) {
    const query = {};

    if (filters.warehouseId) query.warehouse = filters.warehouseId;
    if (filters.itemId) query.item = filters.itemId;
    if (filters.lowStockOnly) query.$expr = { $lte: ['$quantity', '$reorderPoint'] };

    const stockLevels = await Inventory.find(query)
      .populate('item', 'code name category pricing')
      .populate('warehouse', 'name code')
      .lean();

    const summary = {
      totalItems: stockLevels.length,
      totalValue: stockLevels.reduce((sum, inv) => sum + (inv.quantity * (inv.item?.pricing?.costPrice || 0)), 0),
      lowStockItems: stockLevels.filter((inv) => inv.quantity <= (inv.reorderPoint || 0)).length,
      outOfStockItems: stockLevels.filter((inv) => inv.quantity === 0).length,
    };

    return {
      reportType: 'stock_level',
      filters,
      stockLevels,
      summary,
    };
  }

  /**
   * Get stock summary
   * @param {string} warehouseId - Warehouse ID filter
   * @param {string} categoryId - Category ID filter
   * @returns {Promise<Object>} Stock summary
   */
  async getStockSummary(warehouseId, categoryId) {
    try {
      const query = {};
      if (warehouseId) query.warehouse = warehouseId;

      const stockLevels = await Inventory.find(query)
        .populate('item', 'code name categoryId pricing inventory')
        .populate('warehouse', 'name code')
        .lean();

      // Filter by category if provided (Item.categoryId)
      let filteredStock = stockLevels.filter((inv) => inv.item); // exclude orphans
      if (categoryId) {
        filteredStock = filteredStock.filter((inv) => inv.item?.categoryId?.toString() === categoryId);
      }

      // Deduplicate items (multiple inventory records per item across warehouses/batches)
      const itemMap = new Map();
      for (const inv of filteredStock) {
        const itemId = inv.item._id.toString();
        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            totalQty: 0,
            costPrice: inv.item.pricing?.costPrice || 0,
            minimumStock: inv.item.inventory?.minimumStock || 0,
            maximumStock: inv.item.inventory?.maximumStock || 0,
          });
        }
        itemMap.get(itemId).totalQty += (inv.quantity || 0);
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let overstockCount = 0;
      let totalValue = 0;
      let totalQuantity = 0;

      for (const data of itemMap.values()) {
        totalQuantity += data.totalQty;
        totalValue += data.totalQty * data.costPrice;
        if (data.totalQty <= 0) outOfStockCount++;
        else if (data.minimumStock > 0 && data.totalQty <= data.minimumStock) lowStockCount++;
        if (data.maximumStock > 0 && data.totalQty > data.maximumStock) overstockCount++;
      }

      return {
        totalItems: itemMap.size,
        totalQuantity,
        totalValue: Math.round(totalValue * 100) / 100,
        totalInventoryValue: Math.round(totalValue * 100) / 100,
        lowStockItems: lowStockCount,
        lowStockCount: lowStockCount,
        outOfStockItems: outOfStockCount,
        outOfStockCount: outOfStockCount,
        overstockItems: overstockCount,
        totalReserved: 0,
        totalAvailable: totalQuantity,
      };
    } catch (error) {
      console.error('getStockSummary service error:', error);
      throw new Error(`Failed to get stock summary: ${error.message}`);
    }
  }

  /**
   * Get warehouse specific stock report
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} List of items and their quantities in this warehouse
   */
  async getWarehouseStockReport(warehouseId) {
    const query = {};
    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    const inventoryDocs = await Inventory.find(query)
      .populate('item', 'name code categoryId pricing unit')
      .populate('warehouse', 'name code')
      .lean();

    // Map to a format suitable for the report
    return inventoryDocs.map(doc => ({
      itemId: doc.item?._id,
      itemName: doc.item?.name,
      itemCode: doc.item?.code,
      warehouseId: doc.warehouse?._id,
      warehouseName: doc.warehouse?.name,
      warehouseCode: doc.warehouse?.code,
      quantity: doc.quantity,
      availableQuantity: doc.available,
      reservedQuantity: doc.reservedQuantity || doc.allocated || 0,
      unit: doc.item?.unit,
      costPrice: doc.item?.pricing?.costPrice,
      totalValue: (doc.quantity || 0) * (doc.item?.pricing?.costPrice || 0)
    }));
  }

  /**
   * Generate stock movement report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Stock movement report
   */
  async getStockMovementReport(filters = {}) {
    const { startDate, endDate, itemId, warehouseId, movementType } = filters;

    const query = {};
    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) query.movementDate.$gte = new Date(startDate);
      if (endDate) query.movementDate.$lte = new Date(endDate);
    }

    if (warehouseId) query.warehouse = warehouseId;
    if (itemId) query.item = itemId;
    if (movementType) query.movementType = movementType;

    const movements = await StockMovement.find(query)
      .populate('item', 'code name')
      .populate('warehouse', 'name')
      .sort({ movementDate: -1 })
      .lean();

    const summary = {
      totalMovements: movements.length,
      inwardMovements: movements.filter((m) => m.movementType === 'in').length,
      outwardMovements: movements.filter((m) => m.movementType === 'out').length,
      totalInwardQty: movements.filter((m) => m.movementType === 'in')
        .reduce((sum, m) => sum + m.quantity, 0),
      totalOutwardQty: movements.filter((m) => m.movementType === 'out')
        .reduce((sum, m) => sum + m.quantity, 0),
    };

    return {
      reportType: 'stock_movement',
      filters,
      movements,
      summary,
    };
  }

  /**
   * Generate batch expiry report
   * @param {number} daysAhead - Days to look ahead for expiry
   * @returns {Promise<Object>} Batch expiry report
   */
  async getBatchExpiryReport(daysAhead = 90) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const batches = await Batch.find({
      expiryDate: { $gte: today, $lte: futureDate },
      remainingQuantity: { $gt: 0 },
      status: 'active',
    })
      .populate('item', 'code name')
      .populate('warehouse', 'name')
      .sort({ expiryDate: 1 })
      .lean();

    const summary = {
      totalBatches: batches.length,
      totalValue: batches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0),
      expiredBatches: batches.filter((b) => b.expiryDate < today).length,
      expiringIn30Days: batches.filter((b) => {
        const daysToExpiry = Math.ceil((b.expiryDate - today) / (1000 * 60 * 60 * 24));
        return daysToExpiry <= 30;
      }).length,
    };

    return {
      reportType: 'batch_expiry',
      daysAhead,
      batches,
      summary,
    };
  }

  /**
   * Generate stock valuation report
   * @param {Date} asOfDate - As of date
   * @param {string} method - Valuation method (FIFO, LIFO, WAC)
   * @returns {Promise<Object>} Stock valuation report
   */
  async getStockValuationReport(asOfDate, method = 'WAC') {
    const inventory = await Inventory.find({})
      .populate('item', 'code name categoryId pricing')
      .populate('warehouse', 'name')
      .lean();

    const valuations = inventory.map((inv) => ({
      item: inv.item,
      warehouse: inv.warehouse,
      quantity: inv.quantity,
      costPrice: inv.item?.pricing?.costPrice || 0,
      value: inv.quantity * (inv.item?.pricing?.costPrice || 0),
    }));

    const summary = {
      totalItems: valuations.length,
      totalQuantity: valuations.reduce((sum, v) => sum + v.quantity, 0),
      totalValue: valuations.reduce((sum, v) => sum + v.value, 0),
      method,
    };

    return {
      reportType: 'stock_valuation',
      asOfDate,
      method,
      valuations,
      summary,
    };
  }

  /**
   * Generate ABC analysis report
   * @returns {Promise<Object>} ABC analysis report
   */
  async getABCAnalysisReport() {
    const inventory = await Inventory.find({})
      .populate('item', 'code name pricing')
      .lean();

    // Calculate value for each item
    const itemValues = inventory.map((inv) => ({
      item: inv.item,
      quantity: inv.quantity,
      value: inv.quantity * (inv.item?.pricing?.costPrice || 0),
    }));

    // Sort by value descending
    itemValues.sort((a, b) => b.value - a.value);

    const totalValue = itemValues.reduce((sum, item) => sum + item.value, 0);
    let cumulativeValue = 0;

    // Classify items
    const classified = itemValues.map((item) => {
      cumulativeValue += item.value;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      let category;
      if (cumulativePercentage <= 80) category = 'A';
      else if (cumulativePercentage <= 95) category = 'B';
      else category = 'C';

      return {
        ...item,
        category,
        valuePercentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
      };
    });

    const summary = {
      categoryA: classified.filter((i) => i.category === 'A').length,
      categoryB: classified.filter((i) => i.category === 'B').length,
      categoryC: classified.filter((i) => i.category === 'C').length,
      totalValue,
    };

    return {
      reportType: 'abc_analysis',
      items: classified,
      summary,
    };
  }

  /**
   * Get slow-moving items report
   * @param {number} days - Days to consider for slow movement
   * @returns {Promise<Object>} Slow-moving items report
   */
  async getSlowMovingItemsReport(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const inventory = await Inventory.find({
      quantity: { $gt: 0 },
    })
      .populate('item', 'code name pricing')
      .populate('warehouse', 'name')
      .lean();

    const slowMovingItems = [];

    for (const inv of inventory) {
      if (!inv.item || !inv.warehouse) continue;

      const recentMovements = await StockMovement.countDocuments({
        item: inv.item._id,
        warehouse: inv.warehouse._id,
        movementDate: { $gte: cutoffDate },
        movementType: 'out', // assuming 'out' indicates sales/usage
      });

      if (recentMovements === 0) {
        slowMovingItems.push({
          item: inv.item,
          warehouse: inv.warehouse,
          quantity: inv.quantity,
          value: inv.quantity * (inv.item.pricing?.costPrice || 0),
          daysWithoutMovement: days,
        });
      }
    }

    const summary = {
      totalSlowMovingItems: slowMovingItems.length,
      totalValue: slowMovingItems.reduce((sum, item) => sum + item.value, 0),
    };

    return {
      reportType: 'slow_moving',
      days,
      items: slowMovingItems,
      summary,
    };
  }

  /**
   * Get fast-moving items based on sales velocity
   * @param {string} warehouseId - Warehouse ID filter
   * @param {number} days - Days to analyze
   * @param {number} limit - Maximum items to return
   * @returns {Promise<Object>} Fast-moving items report
   */
  async getFastMovingItems(warehouseId, days = 30, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const matchStage = {
      movementDate: { $gte: cutoffDate },
      movementType: 'out', // assumption that sales is 'out'
    };
    if (warehouseId) matchStage.warehouse = new mongoose.Types.ObjectId(warehouseId);

    const fastMoving = await StockMovement.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { item: '$item', warehouse: '$warehouse' },
          totalQuantity: { $sum: '$quantity' },
          movementCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);

    const Item = require('../models/Item');
    const Warehouse = require('../models/Warehouse');

    const enrichedItems = await Promise.all(
      fastMoving.map(async (move) => {
        const itemDetails = await Item.findById(move._id.item).select('code name').lean();
        const warehouseDetails = await Warehouse.findById(move._id.warehouse).select('name').lean();

        return {
          item: itemDetails,
          warehouse: warehouseDetails,
          totalQuantity: move.totalQuantity,
          movementCount: move.movementCount,
          averageDaily: (move.totalQuantity / days).toFixed(2),
        };
      }),
    );

    return {
      items: enrichedItems,
      total: enrichedItems.length,
      period: { days, startDate: cutoffDate },
    };
  }

  /**
   * Get dead stock report (items with no movement for extended period)
   * @param {string} warehouseId - Warehouse ID filter
   * @param {number} days - Days to consider for dead stock
   * @param {number} limit - Maximum items to return
   * @returns {Promise<Object>} Dead stock report
   */
  async getDeadStockReport(warehouseId, days = 180, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const query = { quantity: { $gt: 0 } };
    if (warehouseId) query.warehouse = warehouseId;

    const inventory = await Inventory.find(query)
      .populate('item', 'code name pricing')
      .populate('warehouse', 'name')
      .limit(limit)
      .lean();

    const deadStockItems = [];

    for (const inv of inventory) {
      if (!inv.item || !inv.warehouse) continue;

      const recentMovements = await StockMovement.countDocuments({
        item: inv.item._id,
        warehouse: inv.warehouse._id,
        movementDate: { $gte: cutoffDate },
      });

      if (recentMovements === 0) {
        deadStockItems.push({
          item: inv.item,
          warehouse: inv.warehouse,
          currentStock: inv.quantity,
          value: inv.quantity * (inv.item.pricing?.costPrice || 0),
          daysWithoutMovement: days,
        });
      }
    }

    return {
      items: deadStockItems,
      total: deadStockItems.length,
      totalValue: deadStockItems.reduce((sum, item) => sum + (item.value || 0), 0),
    };
  }

  /**
   * Get low stock report (items below reorder level)
   * @param {string} warehouseId - Warehouse ID filter
   * @param {number} limit - Maximum items to return
   * @returns {Promise<Object>} Low stock report
   */
  async getLowStockReport(warehouseId, limit = 50) {
    const query = {
      $expr: { $lte: ['$quantity', '$reorderPoint'] },
      quantity: { $gte: 0 },
    };
    if (warehouseId) query.warehouse = warehouseId;

    const lowStockItems = await Inventory.find(query)
      .populate('item', 'code name pricing')
      .populate('warehouse', 'name')
      .limit(limit)
      .lean();

    const items = lowStockItems.map((inv) => ({
      item: inv.item,
      warehouse: inv.warehouse,
      currentStock: inv.quantity,
      reorderLevel: inv.reorderPoint,
      deficit: Math.max(0, (inv.reorderPoint || 0) - inv.quantity),
      value: inv.quantity * (inv.item?.pricing?.costPrice || 0),
    }));

    return {
      items,
      total: items.length,
      totalValue: items.reduce((sum, item) => sum + item.value, 0),
    };
  }

  /**
   * Get stock aging report
   * @param {string} warehouseId - Warehouse ID filter
   * @returns {Promise<Object>} Stock aging report
   */
  async getStockAgingReport(warehouseId) {
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;

    const batches = await Batch.find({
      ...query,
      remainingQuantity: { $gt: 0 },
      status: 'active',
    })
      .populate('item', 'code name')
      .populate('warehouse', 'name')
      .lean();

    const today = new Date();
    const agingBuckets = {
      '0-30': [],
      '31-60': [],
      '61-90': [],
      '91-180': [],
      '180+': [],
    };

    batches.forEach((batch) => {
      const receiveDate = batch.createdAt || batch.manufacturingDate || today;
      const ageInDays = Math.floor((today - new Date(receiveDate)) / (1000 * 60 * 60 * 24));

      let bucket;
      if (ageInDays <= 30) bucket = '0-30';
      else if (ageInDays <= 60) bucket = '31-60';
      else if (ageInDays <= 90) bucket = '61-90';
      else if (ageInDays <= 180) bucket = '91-180';
      else bucket = '180+';

      agingBuckets[bucket].push({
        item: batch.item,
        warehouse: batch.warehouse,
        batchNumber: batch.batchNumber,
        quantity: batch.remainingQuantity,
        value: batch.remainingQuantity * (batch.unitCost || 0),
        ageInDays,
      });
    });

    const summary = Object.keys(agingBuckets).reduce((acc, bucket) => {
      acc[bucket] = {
        count: agingBuckets[bucket].length,
        totalValue: agingBuckets[bucket].reduce((sum, item) => sum + item.value, 0),
      };
      return acc;
    }, {});

    return {
      agingBuckets,
      summary,
      totalBatches: batches.length,
    };
  }
}

module.exports = new InventoryReportService();
