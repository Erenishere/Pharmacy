const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Salesman = require('../models/Salesman');
const Route = require('../models/Route');
const Category = require('../models/Category');

class SalesReportService {
  /**
   * Build common match stage for sales invoices
   * @private
   */
  _buildMatchStage(filters = {}) {
    const {
      startDate, endDate, customerId, salesmanId, routeId,
    } = filters;

    const match = {
      type: 'sales',
      status: { $ne: 'cancelled' },
    };

    if (startDate || endDate) {
      match.invoiceDate = {};
      if (startDate) {
        match.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        match.invoiceDate.$lte = new Date(endDate);
      }
    }

    if (customerId) {
      match.customerId = mongoose.Types.ObjectId(customerId);
    }

    if (salesmanId) {
      match.salesmanId = mongoose.Types.ObjectId(salesmanId);
    }

    if (routeId) {
      match.routeId = mongoose.Types.ObjectId(routeId);
    }

    return match;
  }

  /**
   * Get sales summary report using aggregation pipeline
   * Requirements: 7.2
   */
  async getSalesSummary(filters = {}) {
    const match = this._buildMatchStage(filters);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          totalGST: { $sum: '$totals.totalTax' },
          gst18Total: { $sum: '$totals.gst18Total' },
          gst4Total: { $sum: '$totals.gst4Total' },
          advanceTaxTotal: { $sum: '$totals.advanceTaxTotal' },
          nonFilerGSTTotal: { $sum: '$totals.nonFilerGSTTotal' },
          totalItems: { $sum: { $size: '$items' } },
          paidInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totals.paidAmount', 0] },
          },
          dueAmount: {
            $sum: { $cond: [{ $ne: ['$paymentStatus', 'paid'] }, '$totals.dueAmount', 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalInvoices: 1,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          gst18Total: { $ifNull: ['$gst18Total', 0] },
          gst4Total: { $ifNull: ['$gst4Total', 0] },
          advanceTaxTotal: { $ifNull: ['$advanceTaxTotal', 0] },
          nonFilerGSTTotal: { $ifNull: ['$nonFilerGSTTotal', 0] },
          totalItems: 1,
          paidInvoices: 1,
          paidAmount: { $ifNull: ['$paidAmount', 0] },
          dueAmount: { $ifNull: ['$dueAmount', 0] },
          averageInvoiceValue: {
            $cond: [
              { $gt: ['$totalInvoices', 0] },
              { $divide: ['$totalSales', '$totalInvoices'] },
              0,
            ],
          },
        },
      },
    ];

    const result = await Invoice.aggregate(pipeline);
    return result[0] || {
      totalInvoices: 0,
      totalSales: 0,
      totalDiscount: 0,
      totalGST: 0,
      gst18Total: 0,
      gst4Total: 0,
      advanceTaxTotal: 0,
      nonFilerGSTTotal: 0,
      totalItems: 0,
      paidInvoices: 0,
      paidAmount: 0,
      dueAmount: 0,
      averageInvoiceValue: 0,
    };
  }

  /**
   * Get sales by customer report using aggregation pipeline
   * Requirements: 7.3
   */
  async getSalesByCustomer(filters = {}) {
    const {
      startDate, endDate, salesmanId, routeId, limit = 50,
    } = filters;
    const match = this._buildMatchStage({
      startDate, endDate, salesmanId, routeId,
    });

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$customerId',
          invoiceCount: { $sum: 1 },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          totalGST: { $sum: '$totals.totalTax' },
          gst18Total: { $sum: '$totals.gst18Total' },
          gst4Total: { $sum: '$totals.gst4Total' },
          paidAmount: { $sum: '$totals.paidAmount' },
          dueAmount: { $sum: '$totals.dueAmount' },
          invoices: {
            $push: {
              invoiceNumber: '$invoiceNumber',
              invoiceDate: '$invoiceDate',
              grandTotal: '$totals.grandTotal',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          customerName: '$customer.name',
          customerCode: '$customer.code',
          customerTown: '$customer.town',
          invoiceCount: 1,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          gst18Total: { $ifNull: ['$gst18Total', 0] },
          gst4Total: { $ifNull: ['$gst4Total', 0] },
          paidAmount: { $ifNull: ['$paidAmount', 0] },
          dueAmount: { $ifNull: ['$dueAmount', 0] },
          invoices: 1,
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: limit },
    ];

    const customers = await Invoice.aggregate(pipeline);

    return {
      customers,
      totalCustomers: customers.length,
    };
  }

  /**
   * Get sales by item report using aggregation pipeline
   * Requirements: 7.4
   */
  async getSalesByItem(filters = {}) {
    const {
      startDate, endDate, categoryId, limit = 50,
    } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          totalQuantity: { $sum: '$items.quantity' },
          totalBoxes: { $sum: '$items.boxQuantity' },
          totalUnits: { $sum: '$items.unitQuantity' },
          scheme1Quantity: { $sum: '$items.scheme1Quantity' },
          scheme2Quantity: { $sum: '$items.scheme2Quantity' },
          totalSales: { $sum: '$items.lineTotal' },
          totalDiscount: { $sum: { $add: ['$items.discount1Amount', '$items.discount2Amount'] } },
          totalGST: { $sum: '$items.gstAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          itemId: '$_id',
          itemName: '$item.name',
          itemCode: '$item.code',
          categoryId: '$item.category',
          companyId: '$item.company',
          totalQuantity: { $ifNull: ['$totalQuantity', 0] },
          totalBoxes: { $ifNull: ['$totalBoxes', 0] },
          totalUnits: { $ifNull: ['$totalUnits', 0] },
          scheme1Quantity: { $ifNull: ['$scheme1Quantity', 0] },
          scheme2Quantity: { $ifNull: ['$scheme2Quantity', 0] },
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          invoiceCount: 1,
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: limit },
    ];

    let items = await Invoice.aggregate(pipeline);

    // Filter by category if provided
    if (categoryId) {
      items = items.filter((item) => item.categoryId && item.categoryId.toString() === categoryId.toString());
    }

    return {
      items,
      totalItems: items.length,
    };
  }

  /**
   * Get sales by salesman report using aggregation pipeline
   * Requirements: 7.5
   */
  async getSalesBySalesman(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });
    match.salesmanId = { $exists: true, $ne: null };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$salesmanId',
          invoiceCount: { $sum: 1 },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          totalGST: { $sum: '$totals.totalTax' },
          gst18Total: { $sum: '$totals.gst18Total' },
          gst4Total: { $sum: '$totals.gst4Total' },
          uniqueCustomers: { $addToSet: '$customerId' },
        },
      },
      {
        $lookup: {
          from: 'salesmen',
          localField: '_id',
          foreignField: '_id',
          as: 'salesman',
        },
      },
      { $unwind: { path: '$salesman', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          salesmanId: '$_id',
          salesmanName: '$salesman.name',
          salesmanCode: '$salesman.code',
          routeId: '$salesman.route',
          invoiceCount: 1,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          gst18Total: { $ifNull: ['$gst18Total', 0] },
          gst4Total: { $ifNull: ['$gst4Total', 0] },
          customerCount: { $size: '$uniqueCustomers' },
          averageInvoiceValue: {
            $cond: [
              { $gt: ['$invoiceCount', 0] },
              { $divide: ['$totalSales', '$invoiceCount'] },
              0,
            ],
          },
        },
      },
      { $sort: { totalSales: -1 } },
    ];

    const salesmen = await Invoice.aggregate(pipeline);

    return {
      salesmen,
      totalSalesmen: salesmen.length,
    };
  }

  /**
   * Get sales by route report using aggregation pipeline
   * Requirements: 7.6
   */
  async getSalesByRoute(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$customer.route',
          invoiceCount: { $sum: 1 },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          totalGST: { $sum: '$totals.totalTax' },
          uniqueCustomers: { $addToSet: '$customerId' },
        },
      },
      {
        $lookup: {
          from: 'routes',
          localField: '_id',
          foreignField: '_id',
          as: 'route',
        },
      },
      { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          routeId: '$_id',
          routeName: '$route.name',
          routeCode: '$route.code',
          invoiceCount: 1,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          customerCount: { $size: '$uniqueCustomers' },
        },
      },
      { $sort: { totalSales: -1 } },
    ];

    const routes = await Invoice.aggregate(pipeline);

    return {
      routes,
      totalRoutes: routes.length,
    };
  }

  /**
   * Get sales by category report using aggregation pipeline
   * Requirements: 7.7
   */
  async getSalesByCategory(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$itemDetails.category',
          totalQuantity: { $sum: '$items.quantity' },
          totalBoxes: { $sum: '$items.boxQuantity' },
          totalUnits: { $sum: '$items.unitQuantity' },
          totalSales: { $sum: '$items.lineTotal' },
          totalDiscount: { $sum: { $add: ['$items.discount1Amount', '$items.discount2Amount'] } },
          totalGST: { $sum: '$items.gstAmount' },
          uniqueItems: { $addToSet: '$items.itemId' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: '$category.name',
          categoryCode: '$category.code',
          totalQuantity: { $ifNull: ['$totalQuantity', 0] },
          totalBoxes: { $ifNull: ['$totalBoxes', 0] },
          totalUnits: { $ifNull: ['$totalUnits', 0] },
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          itemCount: { $size: '$uniqueItems' },
          invoiceCount: 1,
        },
      },
      { $sort: { totalSales: -1 } },
    ];

    const categories = await Invoice.aggregate(pipeline);

    return {
      categories,
      totalCategories: categories.length,
    };
  }

  /**
   * Get GST summary report using aggregation pipeline
   * Requirements: 7.11
   */
  async getGSTSummary(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          gst18Total: { $sum: '$totals.gst18Total' },
          gst4Total: { $sum: '$totals.gst4Total' },
          totalGST: { $sum: '$totals.totalTax' },
          advanceTaxTotal: { $sum: '$totals.advanceTaxTotal' },
          nonFilerGSTTotal: { $sum: '$totals.nonFilerGSTTotal' },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          gst18Total: { $ifNull: ['$gst18Total', 0] },
          gst4Total: { $ifNull: ['$gst4Total', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          advanceTaxTotal: { $ifNull: ['$advanceTaxTotal', 0] },
          nonFilerGSTTotal: { $ifNull: ['$nonFilerGSTTotal', 0] },
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          invoiceCount: 1,
          taxableAmount18: {
            $cond: [
              { $gt: ['$gst18Total', 0] },
              { $multiply: ['$gst18Total', { $divide: [100, 18] }] },
              0,
            ],
          },
          taxableAmount4: {
            $cond: [
              { $gt: ['$gst4Total', 0] },
              { $multiply: ['$gst4Total', { $divide: [100, 4] }] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          totalTaxableAmount: { $add: ['$taxableAmount18', '$taxableAmount4'] },
        },
      },
    ];

    const result = await Invoice.aggregate(pipeline);
    return result[0] || {
      gst18Total: 0,
      gst4Total: 0,
      totalGST: 0,
      advanceTaxTotal: 0,
      nonFilerGSTTotal: 0,
      totalSales: 0,
      totalDiscount: 0,
      invoiceCount: 0,
      taxableAmount18: 0,
      taxableAmount4: 0,
      totalTaxableAmount: 0,
    };
  }

  /**
   * Get scheme analysis report using aggregation pipeline
   * Requirements: 7.10
   */
  async getSchemeAnalysis(filters = {}) {
    const { startDate, endDate, customerId } = filters;
    const match = this._buildMatchStage({ startDate, endDate, customerId });
    match.$or = [
      { 'items.scheme1Quantity': { $gt: 0 } },
      { 'items.scheme2Quantity': { $gt: 0 } },
    ];

    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.scheme1Quantity': { $gt: 0 } },
            { 'items.scheme2Quantity': { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalScheme1Quantity: { $sum: '$items.scheme1Quantity' },
          totalScheme2Quantity: { $sum: '$items.scheme2Quantity' },
          totalScheme1Value: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.scheme1Quantity', 0] },
                { $ifNull: ['$items.unitPrice', 0] },
              ],
            },
          },
          totalScheme2Value: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.scheme2Quantity', 0] },
                { $ifNull: ['$items.unitPrice', 0] },
              ],
            },
          },
          totalDiscount1: { $sum: '$items.discount1Amount' },
          totalDiscount2: { $sum: '$items.discount2Amount' },
          uniqueInvoices: { $addToSet: '$_id' },
          uniqueItems: { $addToSet: '$items.itemId' },
        },
      },
      {
        $project: {
          _id: 0,
          totalScheme1Quantity: { $ifNull: ['$totalScheme1Quantity', 0] },
          totalScheme2Quantity: { $ifNull: ['$totalScheme2Quantity', 0] },
          totalScheme1Value: { $ifNull: ['$totalScheme1Value', 0] },
          totalScheme2Value: { $ifNull: ['$totalScheme2Value', 0] },
          totalDiscount1: { $ifNull: ['$totalDiscount1', 0] },
          totalDiscount2: { $ifNull: ['$totalDiscount2', 0] },
          totalSchemeValue: {
            $add: [
              { $ifNull: ['$totalScheme1Value', 0] },
              { $ifNull: ['$totalScheme2Value', 0] },
            ],
          },
          totalDiscountValue: {
            $add: [
              { $ifNull: ['$totalDiscount1', 0] },
              { $ifNull: ['$totalDiscount2', 0] },
            ],
          },
          invoiceCount: { $size: '$uniqueInvoices' },
          itemCount: { $size: '$uniqueItems' },
        },
      },
    ];

    const result = await Invoice.aggregate(pipeline);
    return result[0] || {
      totalScheme1Quantity: 0,
      totalScheme2Quantity: 0,
      totalScheme1Value: 0,
      totalScheme2Value: 0,
      totalDiscount1: 0,
      totalDiscount2: 0,
      totalSchemeValue: 0,
      totalDiscountValue: 0,
      invoiceCount: 0,
      itemCount: 0,
    };
  }

  /**
   * Get daily sales trend using aggregation pipeline
   */
  async getDailySalesTrend(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' },
          },
          invoiceCount: { $sum: 1 },
          totalSales: { $sum: '$totals.grandTotal' },
          totalDiscount: { $sum: '$totals.totalDiscount' },
          totalGST: { $sum: '$totals.totalTax' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          invoiceCount: 1,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
        },
      },
      { $sort: { date: 1 } },
    ];

    const dailySales = await Invoice.aggregate(pipeline);

    const totalSales = dailySales.reduce((sum, d) => sum + d.totalSales, 0);
    const averageDailySales = dailySales.length > 0 ? totalSales / dailySales.length : 0;

    return {
      dailySales,
      totalDays: dailySales.length,
      averageDailySales,
    };
  }

  /**
   * Get profit analysis report using aggregation pipeline
   * Requirements: 7.9
   */
  async getProfitAnalysis(filters = {}) {
    const { startDate, endDate } = filters;
    const match = this._buildMatchStage({ startDate, endDate });

    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$items.lineTotal' },
          totalCost: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.quantity', 0] },
                { $ifNull: ['$itemDetails.purchasePrice', 0] },
              ],
            },
          },
          totalDiscount: {
            $sum: {
              $add: [
                { $ifNull: ['$items.discount1Amount', 0] },
                { $ifNull: ['$items.discount2Amount', 0] },
              ],
            },
          },
          totalGST: { $sum: '$items.gstAmount' },
          totalQuantity: { $sum: '$items.quantity' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalSales: { $ifNull: ['$totalSales', 0] },
          totalCost: { $ifNull: ['$totalCost', 0] },
          totalDiscount: { $ifNull: ['$totalDiscount', 0] },
          totalGST: { $ifNull: ['$totalGST', 0] },
          totalQuantity: { $ifNull: ['$totalQuantity', 0] },
          invoiceCount: 1,
          grossProfit: {
            $subtract: [
              { $ifNull: ['$totalSales', 0] },
              { $ifNull: ['$totalCost', 0] },
            ],
          },
          profitMargin: {
            $cond: [
              { $gt: ['$totalSales', 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalSales', '$totalCost'] },
                      '$totalSales',
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    const result = await Invoice.aggregate(pipeline);
    return result[0] || {
      totalSales: 0,
      totalCost: 0,
      grossProfit: 0,
      totalDiscount: 0,
      totalGST: 0,
      totalQuantity: 0,
      invoiceCount: 0,
      profitMargin: 0,
    };
  }
}

module.exports = new SalesReportService();
