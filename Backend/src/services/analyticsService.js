const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Inventory = require('../models/Inventory');

/**
 * Analytics Service
 * Provides high-performance data aggregation for dynamic graphs
 */
class AnalyticsService {
  async getDashboardSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      salesTotals,
      purchaseTotals,
      collectionTotals,
      totalCustomers,
      totalItems,
      lowStockItems,
      salesTrend,
      topItems,
    ] = await Promise.all([
      this._invoiceTotals('sales', monthStart, now),
      this._invoiceTotals('purchase', monthStart, now),
      this._collectionTotals(now),
      Customer.countDocuments({ isActive: { $ne: false } }),
      Item.countDocuments({ isActive: { $ne: false } }),
      this._getLowStockCount(),
      this.getSalesTrends(yearStart, now, 'monthly'),
      this.getTopSellingItems(monthStart, now, 5),
    ]);

    return {
      generatedAt: now,
      period: {
        monthStart,
        yearStart,
        endDate: now,
      },
      cards: {
        sales: salesTotals,
        purchases: purchaseTotals,
        collections: collectionTotals,
        customers: { active: totalCustomers },
        inventory: { activeItems: totalItems, lowStockItems },
      },
      charts: {
        salesTrend,
        topItems,
      },
    };
  }

  /**
   * Get Sales Trend using MongoDB Aggregation
   * @param {number} months - Lookback period in months
   */
  async getSalesTrendAggregation(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          totalSales: { $sum: '$totals.grandTotal' },
          count: { $sum: 1 },
          avgValue: { $avg: '$totals.grandTotal' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.month' },
              '/',
              { $toString: '$_id.year' },
            ],
          },
          totalSales: 1,
          count: 1,
          avgValue: 1,
        },
      },
    ]);
  }

  /**
   * Get Top Items by Revenue using Aggregation
   */
  async getTopItemsAggregation(startDate, endDate, limit = 10) {
    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      { $unwind: '$itemDetails' },
      {
        $project: {
          itemId: '$_id',
          name: '$itemDetails.name',
          code: '$itemDetails.code',
          quantity: 1,
          revenue: 1,
        },
      },
    ]);
  }

  /**
   * Get Warehouse-wise Sales Revenue using Aggregation
   */
  async getWarehouseSalesAggregation(startDate, endDate) {
    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.warehouseId',
          totalSales: { $sum: '$items.lineTotal' },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouseDetails',
        },
      },
      { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          warehouseId: '$_id',
          warehouseName: { $ifNull: ['$warehouseDetails.name', 'Unassigned'] },
          totalSales: 1,
        },
      },
      { $sort: { totalSales: -1 } },
    ]);
  }

  async getSalesTrends(startDate, endDate, interval = 'daily') {
    const dateFormat = {
      daily: '%Y-%m-%d',
      weekly: '%G-W%V',
      monthly: '%Y-%m',
    }[interval] || '%Y-%m-%d';

    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$invoiceDate' } },
          totalSales: { $sum: '$totals.grandTotal' },
          invoiceCount: { $sum: 1 },
          averageInvoiceValue: { $avg: '$totals.grandTotal' },
        },
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalSales: 1,
          invoiceCount: 1,
          averageInvoiceValue: { $ifNull: ['$averageInvoiceValue', 0] },
        },
      },
      { $sort: { period: 1 } },
    ]);
  }

  async getTopCustomers(startDate, endDate, limit = 10) {
    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
          customerId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalSales: { $sum: '$totals.grandTotal' },
          invoiceCount: { $sum: 1 },
          paidAmount: { $sum: '$totals.paidAmount' },
          dueAmount: { $sum: '$totals.dueAmount' },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
          pipeline: [{ $project: { code: 1, name: 1 } }],
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          customer: 1,
          totalSales: 1,
          invoiceCount: 1,
          paidAmount: 1,
          dueAmount: 1,
        },
      },
    ]);
  }

  async getTopSellingItems(startDate, endDate, limit = 10) {
    return await this.getTopItemsAggregation(startDate, endDate, limit);
  }

  async getRevenueByCategory(startDate, endDate) {
    return await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { category: 1, categoryId: 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$itemDetails.category', 'Uncategorized'] },
          totalRevenue: { $sum: '$items.lineTotal' },
          quantity: { $sum: '$items.quantity' },
          invoiceCount: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalRevenue: 1,
          quantity: 1,
          invoiceCount: { $size: '$invoiceCount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getProfitMargins(startDate, endDate) {
    const rows = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { name: 1, code: 1, 'pricing.costPrice': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.itemId',
          item: { $first: { name: '$itemDetails.name', code: '$itemDetails.code' } },
          revenue: { $sum: '$items.lineTotal' },
          cost: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }] } },
          quantity: { $sum: '$items.quantity' },
        },
      },
      {
        $project: {
          _id: 0,
          itemId: '$_id',
          item: 1,
          revenue: 1,
          cost: 1,
          grossProfit: { $subtract: ['$revenue', '$cost'] },
          marginPercent: {
            $cond: [
              { $gt: ['$revenue', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] }, 100] },
              0,
            ],
          },
          quantity: 1,
        },
      },
      { $sort: { grossProfit: -1 } },
    ]);

    const summary = rows.reduce((acc, row) => {
      acc.revenue += row.revenue || 0;
      acc.cost += row.cost || 0;
      acc.grossProfit += row.grossProfit || 0;
      return acc;
    }, { revenue: 0, cost: 0, grossProfit: 0 });

    summary.marginPercent = summary.revenue > 0 ? (summary.grossProfit / summary.revenue) * 100 : 0;

    return { summary, items: rows };
  }

  async getPaymentCollectionEfficiency(asOfDate = new Date()) {
    const [totals] = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $lte: new Date(asOfDate) },
        },
      },
      {
        $group: {
          _id: null,
          invoiceAmount: { $sum: '$totals.grandTotal' },
          collectedAmount: { $sum: '$totals.paidAmount' },
          outstandingAmount: { $sum: '$totals.dueAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]);

    const invoiceAmount = totals?.invoiceAmount || 0;
    const collectedAmount = totals?.collectedAmount || 0;

    return {
      asOfDate,
      invoiceAmount,
      collectedAmount,
      outstandingAmount: totals?.outstandingAmount || 0,
      invoiceCount: totals?.invoiceCount || 0,
      collectionRate: invoiceAmount > 0 ? (collectedAmount / invoiceAmount) * 100 : 0,
    };
  }

  async getInventoryTurnover(startDate, endDate) {
    const [sold] = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { 'pricing.costPrice': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          costOfGoodsSold: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }] } },
          soldQuantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    const [stock] = await Inventory.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { 'pricing.costPrice': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          inventoryValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }] } },
          stockQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const costOfGoodsSold = sold?.costOfGoodsSold || 0;
    const inventoryValue = stock?.inventoryValue || 0;

    return {
      period: { startDate, endDate },
      costOfGoodsSold,
      inventoryValue,
      soldQuantity: sold?.soldQuantity || 0,
      stockQuantity: stock?.stockQuantity || 0,
      turnoverRatio: inventoryValue > 0 ? costOfGoodsSold / inventoryValue : 0,
    };
  }

  async getRealTimeKPIs() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [todaySales, outstanding, lowStockItems, totalItems] = await Promise.all([
      this._invoiceTotals('sales', dayStart, now),
      this._collectionTotals(now),
      this._getLowStockCount(),
      Item.countDocuments({ isActive: { $ne: false } }),
    ]);

    return {
      generatedAt: now,
      todaySales,
      outstanding,
      inventory: {
        activeItems: totalItems,
        lowStockItems,
      },
    };
  }

  async _invoiceTotals(type, startDate, endDate) {
    const [totals] = await Invoice.aggregate([
      {
        $match: {
          type,
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totals.grandTotal' },
          totalTax: { $sum: '$totals.totalTax' },
          paidAmount: { $sum: '$totals.paidAmount' },
          dueAmount: { $sum: '$totals.dueAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]);

    return {
      totalAmount: totals?.totalAmount || 0,
      totalTax: totals?.totalTax || 0,
      paidAmount: totals?.paidAmount || 0,
      dueAmount: totals?.dueAmount || 0,
      invoiceCount: totals?.invoiceCount || 0,
    };
  }

  async _collectionTotals(asOfDate) {
    const [totals] = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $lte: new Date(asOfDate) },
        },
      },
      {
        $group: {
          _id: null,
          invoiceAmount: { $sum: '$totals.grandTotal' },
          collectedAmount: { $sum: '$totals.paidAmount' },
          outstandingAmount: { $sum: '$totals.dueAmount' },
        },
      },
    ]);

    return {
      invoiceAmount: totals?.invoiceAmount || 0,
      collectedAmount: totals?.collectedAmount || 0,
      outstandingAmount: totals?.outstandingAmount || 0,
    };
  }

  async _getLowStockCount() {
    const [result] = await Inventory.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { 'inventory.minimumStock': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $expr: {
            $lte: ['$quantity', { $ifNull: ['$itemDetails.inventory.minimumStock', '$reorderPoint'] }],
          },
        },
      },
      { $count: 'count' },
    ]);

    return result?.count || 0;
  }
}

module.exports = new AnalyticsService();
