const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

/**
 * Analytics Service
 * Provides high-performance data aggregation for dynamic graphs
 */
class AnalyticsService {
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
}

module.exports = new AnalyticsService();
