const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
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
      const categorySet = new Set();
      let totalReserved = 0;
      let totalAvailable = 0;

      for (const inv of filteredStock) {
        const itemId = inv.item._id.toString();
        const reservedQuantity = this.getReservedQuantity(inv);
        const availableQuantity = this.getAvailableQuantity(inv);

        totalReserved += reservedQuantity;
        totalAvailable += availableQuantity;
        if (inv.item.categoryId) {
          categorySet.add(inv.item.categoryId.toString());
        }

        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            totalQty: 0,
            availableQty: 0,
            reservedQty: 0,
            costPrice: inv.item.pricing?.costPrice || 0,
            minimumStock: inv.item.inventory?.minimumStock || 0,
            maximumStock: inv.item.inventory?.maximumStock || 0,
          });
        }
        const itemEntry = itemMap.get(itemId);
        itemEntry.totalQty += (inv.quantity || 0);
        itemEntry.availableQty += availableQuantity;
        itemEntry.reservedQty += reservedQuantity;
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let overstockCount = 0;
      let totalValue = 0;
      let totalQuantity = 0;

      for (const data of itemMap.values()) {
        totalQuantity += data.totalQty;
        totalValue += data.totalQty * data.costPrice;
        if (data.availableQty <= 0) outOfStockCount++;
        else if (data.minimumStock > 0 && data.availableQty <= data.minimumStock) lowStockCount++;
        if (data.maximumStock > 0 && data.totalQty > data.maximumStock) overstockCount++;
      }

      return {
        totalItems: itemMap.size,
        totalCategories: categorySet.size,
        totalQuantity,
        totalValue: Math.round(totalValue * 100) / 100,
        totalInventoryValue: Math.round(totalValue * 100) / 100,
        lowStockItems: lowStockCount,
        lowStockCount: lowStockCount,
        outOfStockItems: outOfStockCount,
        outOfStockCount: outOfStockCount,
        overstockItems: overstockCount,
        totalReserved: Math.round(totalReserved * 100) / 100,
        totalAvailable: Math.round(totalAvailable * 100) / 100,
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

    const batches = await this.getBatchMap(inventoryDocs);

    // Map to a format suitable for the report
    return inventoryDocs.map(doc => ({
      itemId: doc.item?._id,
      itemName: doc.item?.name,
      itemCode: doc.item?.code,
      warehouseId: doc.warehouse?._id,
      warehouseName: doc.warehouse?.name,
      warehouseCode: doc.warehouse?.code,
      quantity: doc.quantity,
      availableQuantity: this.getAvailableQuantity(doc),
      reservedQuantity: this.getReservedQuantity(doc),
      unit: doc.item?.unit,
      batchNumber: doc.batchNumber || null,
      expiryDate: batches.get(this.getBatchKey(doc))?.expiryDate || null,
      costPrice: doc.item?.pricing?.costPrice,
      totalValue: (doc.quantity || 0) * (doc.item?.pricing?.costPrice || 0),
      lastUpdated: doc.lastUpdated,
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
    if (itemId) query.itemId = itemId;
    if (movementType) query.movementType = movementType;

    const movements = await StockMovement.find(query)
      .populate('itemId', 'code name')
      .populate('warehouse', 'name')
      .sort({ movementDate: -1 })
      .lean();

    const summary = {
      totalMovements: movements.length,
      inwardMovements: movements.filter((m) => m.movementType === 'in').length,
      outwardMovements: movements.filter((m) => m.movementType === 'out').length,
      totalInwardQty: movements.filter((m) => m.movementType === 'in')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0),
      totalOutwardQty: movements.filter((m) => m.movementType === 'out')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0),
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
  async getSlowMovingItemsReport(warehouseId, days = 90, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const inventoryRows = await this.getPositiveInventoryRows(warehouseId);
    const salesMovementMap = await this.getLatestMovementDateMap(
      inventoryRows,
      { movementType: 'out', referenceTypes: ['sales_invoice'] },
    );

    const slowMovingItems = inventoryRows
      .map((row) => {
        const key = this.getRowMovementKey(row.item._id, row.warehouse?._id);
        const lastSaleDate = salesMovementMap.get(key) || null;
        const daysSinceLastSale = lastSaleDate
          ? Math.floor((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
          : days;

        return {
          itemId: row.item._id,
          itemCode: row.item.code,
          itemName: row.item.name,
          warehouseId: row.warehouse?._id,
          warehouseName: row.warehouse?.name,
          currentStock: row.availableQuantity,
          quantity: row.quantity,
          stockValue: row.quantity * (row.item.pricing?.costPrice || 0),
          value: row.quantity * (row.item.pricing?.costPrice || 0),
          lastSaleDate,
          daysSinceLastSale,
          daysInactive: daysSinceLastSale,
        };
      })
      .filter((row) => !row.lastSaleDate || row.lastSaleDate < cutoffDate)
      .sort((left, right) => right.daysSinceLastSale - left.daysSinceLastSale)
      .slice(0, limit);

    return {
      items: slowMovingItems,
      total: slowMovingItems.length,
      totalValue: slowMovingItems.reduce((sum, item) => sum + item.value, 0),
      period: { days, startDate: cutoffDate },
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
      movementType: 'out',
      status: 'completed',
      referenceType: 'sales_invoice',
    };
    if (warehouseId) matchStage.warehouse = new mongoose.Types.ObjectId(warehouseId);

    const fastMoving = await StockMovement.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { item: '$itemId', warehouse: '$warehouse' },
          totalQuantity: { $sum: { $abs: '$quantity' } },
          movementCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);

    const currentStockMap = await this.getCurrentStockMap(warehouseId);

    const items = await Promise.all(
      fastMoving.map(async (move) => {
        const itemDetails = await mongoose.model('Item').findById(move._id.item).select('code name').lean();
        const warehouseDetails = await mongoose.model('Warehouse').findById(move._id.warehouse).select('name code').lean();
        const stockKey = this.getRowMovementKey(move._id.item, move._id.warehouse);

        return {
          itemId: move._id.item,
          itemCode: itemDetails?.code,
          itemName: itemDetails?.name,
          warehouseId: move._id.warehouse,
          warehouseName: warehouseDetails?.name,
          warehouseCode: warehouseDetails?.code,
          totalSold: move.totalQuantity,
          totalQuantity: move.totalQuantity,
          movementCount: move.movementCount,
          currentStock: currentStockMap.get(stockKey) || 0,
          avgDailySales: move.totalQuantity / days,
          avgDaily: move.totalQuantity / days,
        };
      }),
    );

    return {
      items,
      total: items.length,
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

    const inventoryRows = await this.getPositiveInventoryRows(warehouseId);
    const latestMovementMap = await this.getLatestMovementDateMap(inventoryRows);

    const deadStockItems = inventoryRows
      .map((row) => {
        const key = this.getRowMovementKey(row.item._id, row.warehouse?._id);
        const lastMovementDate = latestMovementMap.get(key) || null;
        const daysSinceLastMovement = lastMovementDate
          ? Math.floor((Date.now() - lastMovementDate.getTime()) / (1000 * 60 * 60 * 24))
          : days;

        return {
          itemId: row.item._id,
          itemCode: row.item.code,
          itemName: row.item.name,
          warehouseId: row.warehouse?._id,
          warehouseName: row.warehouse?.name,
          currentStock: row.availableQuantity,
          quantity: row.quantity,
          stock: row.availableQuantity,
          value: row.quantity * (row.item.pricing?.costPrice || 0),
          stockValue: row.quantity * (row.item.pricing?.costPrice || 0),
          lastMovementDate,
          daysSinceLastMovement,
          daysInactive: daysSinceLastMovement,
        };
      })
      .filter((row) => !row.lastMovementDate || row.lastMovementDate < cutoffDate)
      .sort((left, right) => right.daysSinceLastMovement - left.daysSinceLastMovement)
      .slice(0, limit);

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
    const query = { quantity: { $gte: 0 } };
    if (warehouseId) query.warehouse = warehouseId;

    const inventoryDocs = await Inventory.find(query)
      .populate('item', 'code name pricing inventory')
      .populate('warehouse', 'name code')
      .lean();

    const groupedRows = this.aggregateInventoryRows(inventoryDocs, { warehouseScoped: Boolean(warehouseId) });
    const items = groupedRows
      .map((row) => {
        const minimumLevel = row.item.inventory?.minimumStock || 0;
        const reorderLevel = row.item.inventory?.reorderPoint || minimumLevel;
        return {
          itemId: row.item._id,
          itemCode: row.item.code,
          itemName: row.item.name,
          warehouseId: row.warehouse?._id,
          warehouseName: row.warehouse?.name,
          currentStock: row.availableQuantity,
          quantity: row.quantity,
          minimumLevel,
          reorderLevel,
          deficit: Math.max(0, reorderLevel - row.availableQuantity),
          value: row.quantity * (row.item?.pricing?.costPrice || 0),
        };
      })
      .filter((row) => row.currentStock <= row.reorderLevel)
      .sort((left, right) => left.currentStock - right.currentStock)
      .slice(0, limit);

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
    const items = [];

    batches.forEach((batch) => {
      const referenceDates = [batch.createdAt, batch.manufacturingDate]
        .filter(Boolean)
        .map((value) => new Date(value));
      const receiveDate = referenceDates.length
        ? new Date(Math.min(...referenceDates.map((value) => value.getTime())))
        : today;
      const ageInDays = Math.floor((today - new Date(receiveDate)) / (1000 * 60 * 60 * 24));

      let bucket;
      if (ageInDays <= 30) bucket = '0-30';
      else if (ageInDays <= 60) bucket = '31-60';
      else if (ageInDays <= 90) bucket = '61-90';
      else if (ageInDays <= 180) bucket = '91-180';
      else bucket = '180+';

      const row = {
        itemId: batch.item?._id,
        itemCode: batch.item?.code,
        itemName: batch.item?.name,
        warehouseId: batch.warehouse?._id,
        warehouseName: batch.warehouse?.name,
        batchNumber: batch.batchNumber,
        quantity: batch.remainingQuantity,
        value: batch.remainingQuantity * (batch.unitCost || 0),
        ageInDays,
        ageDays: ageInDays,
        expiryDate: batch.expiryDate,
        bracket: bucket,
      };

      agingBuckets[bucket].push(row);
      items.push(row);
    });

    const brackets = Object.keys(agingBuckets).map((bucket) => ({
      label: bucket,
      count: agingBuckets[bucket].length,
      quantity: agingBuckets[bucket].reduce((sum, item) => sum + item.quantity, 0),
      totalValue: agingBuckets[bucket].reduce((sum, item) => sum + item.value, 0),
    }));

    return {
      agingBuckets,
      brackets,
      summary: brackets,
      summaryByBucket: brackets.reduce((acc, bucket) => {
        acc[bucket.label] = {
          count: bucket.count,
          quantity: bucket.quantity,
          totalValue: bucket.totalValue,
        };
        return acc;
      }, {}),
      items: items.sort((left, right) => right.ageInDays - left.ageInDays),
      totalBatches: batches.length,
    };
  }

  async getInventoryTurnoverReport(warehouseId, startDate, endDate) {
    const period = this.resolveDateRange(startDate, endDate, 30);
    const invoiceMatch = {
      type: 'sales',
      status: { $ne: 'cancelled' },
      invoiceDate: {
        $gte: period.startDate,
        $lte: period.endDate,
      },
    };

    const invoicePipeline = [
      { $match: invoiceMatch },
      { $unwind: '$items' },
    ];

    if (warehouseId) {
      invoicePipeline.push({
        $match: { 'items.warehouseId': new mongoose.Types.ObjectId(warehouseId) },
      });
    }

    invoicePipeline.push(
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { code: 1, name: 1, 'pricing.costPrice': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.itemId',
          itemCode: { $first: '$itemDetails.code' },
          itemName: { $first: '$itemDetails.name' },
          soldQuantity: { $sum: '$items.quantity' },
          costOfGoodsSold: {
            $sum: {
              $multiply: ['$items.quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }],
            },
          },
          salesRevenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { soldQuantity: -1 } },
    );

    const soldByItem = await Invoice.aggregate(invoicePipeline);
    const inventoryRows = await this.getPositiveInventoryRows(warehouseId);

    const inventoryValue = inventoryRows.reduce(
      (sum, row) => sum + (row.quantity * (row.item.pricing?.costPrice || 0)),
      0,
    );
    const stockQuantity = inventoryRows.reduce((sum, row) => sum + row.quantity, 0);
    const soldQuantity = soldByItem.reduce((sum, row) => sum + row.soldQuantity, 0);
    const costOfGoodsSold = soldByItem.reduce((sum, row) => sum + row.costOfGoodsSold, 0);
    const salesRevenue = soldByItem.reduce((sum, row) => sum + row.salesRevenue, 0);

    return {
      period,
      warehouseId: warehouseId || null,
      costOfGoodsSold,
      salesRevenue,
      inventoryValue,
      averageInventoryValue: inventoryValue,
      soldQuantity,
      stockQuantity,
      turnoverRatio: inventoryValue > 0 ? costOfGoodsSold / inventoryValue : 0,
      items: soldByItem.map((row) => ({
        itemId: row._id,
        itemCode: row.itemCode,
        itemName: row.itemName,
        soldQuantity: row.soldQuantity,
        costOfGoodsSold: row.costOfGoodsSold,
        salesRevenue: row.salesRevenue,
      })),
    };
  }

  async getReorderSuggestions(warehouseId, limit = 50) {
    const inventoryDocs = await Inventory.find(
      warehouseId ? { warehouse: warehouseId, quantity: { $gte: 0 } } : { quantity: { $gte: 0 } },
    )
      .populate('item', 'code name pricing inventory')
      .populate('warehouse', 'name code')
      .lean();

    const groupedRows = this.aggregateInventoryRows(inventoryDocs, { warehouseScoped: Boolean(warehouseId) });
    const suggestions = groupedRows
      .map((row) => {
        const minimumLevel = row.item.inventory?.minimumStock || 0;
        const reorderLevel = row.item.inventory?.reorderPoint || minimumLevel;
        const maximumLevel = row.item.inventory?.maximumStock || 0;
        const targetLevel = Math.max(reorderLevel, minimumLevel);
        const suggestedOrderQuantity = Math.max(0, targetLevel - row.availableQuantity);

        return {
          itemId: row.item._id,
          itemCode: row.item.code,
          itemName: row.item.name,
          warehouseId: row.warehouse?._id,
          warehouseName: row.warehouse?.name,
          currentStock: row.availableQuantity,
          quantity: row.quantity,
          reservedQuantity: row.reservedQuantity,
          minimumLevel,
          reorderLevel,
          maximumLevel,
          suggestedOrderQuantity,
          estimatedCost: suggestedOrderQuantity * (row.item.pricing?.costPrice || 0),
        };
      })
      .filter((row) => row.suggestedOrderQuantity > 0)
      .sort((left, right) => right.suggestedOrderQuantity - left.suggestedOrderQuantity)
      .slice(0, limit);

    return {
      items: suggestions,
      total: suggestions.length,
      totalEstimatedCost: suggestions.reduce((sum, row) => sum + row.estimatedCost, 0),
    };
  }

  async getStockoutHistory(warehouseId, days = 30, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const inventoryDocs = await Inventory.find(
      warehouseId ? { warehouse: warehouseId, quantity: { $gte: 0 } } : { quantity: { $gte: 0 } },
    )
      .populate('item', 'code name')
      .populate('warehouse', 'name code')
      .lean();

    const groupedRows = this.aggregateInventoryRows(inventoryDocs, { warehouseScoped: true });
    const latestMovementMap = await this.getLatestMovementDateMap(groupedRows);

    const items = groupedRows
      .map((row) => {
        const key = this.getRowMovementKey(row.item._id, row.warehouse?._id);
        const lastMovementDate = latestMovementMap.get(key) || null;
        const daysSinceLastMovement = lastMovementDate
          ? Math.floor((Date.now() - lastMovementDate.getTime()) / (1000 * 60 * 60 * 24))
          : days;

        return {
          itemId: row.item._id,
          itemCode: row.item.code,
          itemName: row.item.name,
          warehouseId: row.warehouse?._id,
          warehouseName: row.warehouse?.name,
          currentStock: row.availableQuantity,
          lastMovementDate,
          daysSinceLastMovement,
          stockoutSince: row.availableQuantity <= 0 ? lastMovementDate : null,
        };
      })
      .filter((row) => row.currentStock <= 0 && (!row.lastMovementDate || row.lastMovementDate >= cutoffDate))
      .sort((left, right) => right.daysSinceLastMovement - left.daysSinceLastMovement)
      .slice(0, limit);

    return {
      items,
      total: items.length,
      period: { days, startDate: cutoffDate },
    };
  }

  getReservedQuantity(doc) {
    return doc.reservedQuantity ?? doc.allocated ?? 0;
  }

  getAvailableQuantity(doc) {
    if (typeof doc.available === 'number') {
      return doc.available;
    }

    return Math.max(0, (doc.quantity || 0) - this.getReservedQuantity(doc));
  }

  getBatchKey(doc) {
    return [
      doc.item?._id?.toString?.() || doc.item?.toString?.() || '',
      doc.warehouse?._id?.toString?.() || doc.warehouse?.toString?.() || '',
      doc.batchNumber || '',
    ].join('::');
  }

  async getBatchMap(inventoryDocs) {
    const batchBearingDocs = inventoryDocs.filter((doc) => doc.batchNumber);
    if (!batchBearingDocs.length) {
      return new Map();
    }

    const itemIds = [...new Set(batchBearingDocs.map((doc) => doc.item?._id?.toString()).filter(Boolean))];
    const warehouseIds = [...new Set(batchBearingDocs.map((doc) => doc.warehouse?._id?.toString()).filter(Boolean))];
    const batchNumbers = [...new Set(batchBearingDocs.map((doc) => doc.batchNumber).filter(Boolean))];

    const batches = await Batch.find({
      item: { $in: itemIds },
      warehouse: { $in: warehouseIds },
      batchNumber: { $in: batchNumbers },
    }).select('item warehouse batchNumber expiryDate');

    return new Map(
      batches.map((batch) => ([
        [
          batch.item?.toString?.() || '',
          batch.warehouse?.toString?.() || '',
          batch.batchNumber || '',
        ].join('::'),
        batch,
      ])),
    );
  }

  aggregateInventoryRows(inventoryDocs, options = {}) {
    const { warehouseScoped = false } = options;
    const rowMap = new Map();

    for (const doc of inventoryDocs) {
      if (!doc.item) {
        continue;
      }

      const warehouseKey = warehouseScoped ? (doc.warehouse?._id?.toString() || 'global') : 'global';
      const key = `${doc.item._id.toString()}::${warehouseKey}`;
      const reservedQuantity = this.getReservedQuantity(doc);
      const availableQuantity = this.getAvailableQuantity(doc);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          item: doc.item,
          warehouse: warehouseScoped ? doc.warehouse : null,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
        });
      }

      const row = rowMap.get(key);
      row.quantity += doc.quantity || 0;
      row.reservedQuantity += reservedQuantity;
      row.availableQuantity += availableQuantity;
    }

    return Array.from(rowMap.values());
  }

  async getPositiveInventoryRows(warehouseId) {
    const query = { quantity: { $gt: 0 } };
    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    const inventoryDocs = await Inventory.find(query)
      .populate('item', 'code name pricing inventory')
      .populate('warehouse', 'name code')
      .lean();

    return this.aggregateInventoryRows(inventoryDocs, { warehouseScoped: true });
  }

  async getLatestMovementDateMap(rows, filters = {}) {
    if (!rows.length) {
      return new Map();
    }

    const itemIds = [...new Set(rows.map((row) => row.item._id.toString()))]
      .map((id) => new mongoose.Types.ObjectId(id));
    const warehouseIds = [...new Set(rows.map((row) => row.warehouse?._id?.toString()).filter(Boolean))]
      .map((id) => new mongoose.Types.ObjectId(id));

    const match = {
      itemId: { $in: itemIds },
      status: 'completed',
    };
    if (warehouseIds.length) {
      match.warehouse = { $in: warehouseIds };
    }
    if (filters.movementType) {
      match.movementType = filters.movementType;
    }
    if (filters.referenceTypes?.length) {
      match.referenceType = { $in: filters.referenceTypes };
    }

    const latestMovements = await StockMovement.aggregate([
      { $match: match },
      {
        $group: {
          _id: { itemId: '$itemId', warehouse: '$warehouse' },
          lastMovementDate: { $max: '$movementDate' },
        },
      },
    ]);

    return new Map(
      latestMovements.map((row) => ([
        this.getRowMovementKey(row._id.itemId, row._id.warehouse),
        row.lastMovementDate,
      ])),
    );
  }

  async getCurrentStockMap(warehouseId) {
    const inventoryRows = await this.getPositiveInventoryRows(warehouseId);
    return new Map(
      inventoryRows.map((row) => ([
        this.getRowMovementKey(row.item._id, row.warehouse?._id),
        row.availableQuantity,
      ])),
    );
  }

  getRowMovementKey(itemId, warehouseId) {
    return `${itemId?.toString?.() || itemId}::${warehouseId?.toString?.() || warehouseId || 'global'}`;
  }

  resolveDateRange(startDate, endDate, fallbackDays = 30) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (fallbackDays * 24 * 60 * 60 * 1000));
    return {
      startDate: start,
      endDate: end,
    };
  }
}

module.exports = new InventoryReportService();
