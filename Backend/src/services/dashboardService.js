const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Account = require('../models/Account');

/**
 * Dashboard Service
 * All heavy queries use aggregation pipelines — no in-memory grouping.
 */
class DashboardService {
  /**
   * Get key performance indicators
   */
  async getKPIs(startDate, endDate) {
    const [salesData, purchaseData, inventoryData, customerData, supplierData, cashData] =
      await Promise.all([
        this._getSalesKPIs(startDate, endDate),
        this._getPurchaseKPIs(startDate, endDate),
        this._getInventoryKPIs(),
        this._getCustomerKPIs(),
        this._getSupplierKPIs(),
        this._getCashKPIs(),
      ]);

    return {
      period: { startDate, endDate },
      sales: salesData,
      purchases: purchaseData,
      inventory: inventoryData,
      customers: customerData,
      suppliers: supplierData,
      cash: cashData,
    };
  }

  /**
   * Get sales trend — single aggregation, no loop
   */
  async getSalesTrend(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const raw = await Invoice.aggregate([
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
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const trends = raw.map((r) => {
      const date = new Date(r._id.year, r._id.month - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        totalSales: r.totalSales,
        totalInvoices: r.totalInvoices,
        averageInvoiceValue: r.totalInvoices > 0 ? r.totalSales / r.totalInvoices : 0,
      };
    });

    return { reportType: 'sales_trend', months, trends };
  }

  /**
   * Get top performing items — aggregation pipeline, no JS grouping
   */
  async getTopItems(startDate, endDate, limit = 10) {
    const topItems = await Invoice.aggregate([
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
          as: 'item',
          pipeline: [{ $project: { code: 1, name: 1 } }],
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          item: 1,
          quantity: 1,
          revenue: 1,
        },
      },
    ]);

    return { reportType: 'top_items', period: { startDate, endDate }, items: topItems };
  }

  /**
   * Get top customers — aggregation pipeline, no JS grouping
   */
  async getTopCustomers(startDate, endDate, limit = 10) {
    const topCustomers = await Invoice.aggregate([
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
          pipeline: [{ $project: { name: 1, code: 1 } }],
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customer: 1,
          totalSales: 1,
          invoiceCount: 1,
        },
      },
    ]);

    return { reportType: 'top_customers', period: { startDate, endDate }, customers: topCustomers };
  }

  // ─── Private KPI helpers ───────────────────────────────────────────────────

  async _getSalesKPIs(startDate, endDate) {
    const [result] = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totals.grandTotal' },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);

    const totalSales = result?.totalSales ?? 0;
    const totalInvoices = result?.totalInvoices ?? 0;
    return {
      totalSales,
      totalInvoices,
      averageInvoiceValue: totalInvoices > 0 ? totalSales / totalInvoices : 0,
    };
  }

  async _getPurchaseKPIs(startDate, endDate) {
    const [result] = await Invoice.aggregate([
      {
        $match: {
          type: 'purchase',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totals.grandTotal' },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);

    const totalPurchases = result?.totalPurchases ?? 0;
    const totalInvoices = result?.totalInvoices ?? 0;
    return {
      totalPurchases,
      totalInvoices,
      averageInvoiceValue: totalInvoices > 0 ? totalPurchases / totalInvoices : 0,
    };
  }

  async _getInventoryKPIs() {
    const [result] = await Inventory.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemDetails',
          pipeline: [{ $project: { 'pricing.costPrice': 1, 'inventory.minimumStock': 1 } }],
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: {
            $sum: {
              $multiply: ['$quantity', { $ifNull: ['$itemDetails.pricing.costPrice', 0] }],
            },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $lte: [
                    '$quantity',
                    { $ifNull: ['$reorderPoint', { $ifNull: ['$itemDetails.inventory.minimumStock', 10] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockCount: { $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] } },
        },
      },
    ]);

    return {
      totalItems: result?.totalItems ?? 0,
      totalQuantity: result?.totalQuantity ?? 0,
      totalValue: Math.round((result?.totalValue ?? 0) * 100) / 100,
      lowStockItems: result?.lowStockCount ?? 0,
      outOfStockItems: result?.outOfStockCount ?? 0,
    };
  }

  async _getCustomerKPIs() {
    const count = await Customer.countDocuments({ status: 'active' });
    return { totalCustomers: count };
  }

  async _getSupplierKPIs() {
    const count = await Supplier.countDocuments({ status: 'active' });
    return { totalSuppliers: count };
  }

  async _getCashKPIs() {
    const [result] = await Account.aggregate([
      { $match: { type: 'cash' } },
      { $group: { _id: null, totalCash: { $sum: '$balance' } } },
    ]);
    return { totalCash: result?.totalCash ?? 0 };
  }
}

module.exports = new DashboardService();
