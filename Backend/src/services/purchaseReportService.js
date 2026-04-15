const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Purchase Report Service
 * Requirement 6: Purchase Performance Tracking
 * Provides comprehensive purchase reports and analytics
 */
class PurchaseReportService {
  /**
   * Get purchase summary report
   * Requirement 6.2: Total purchases, total invoices, average invoice value
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Object>} Purchase summary
   */
  async getPurchaseSummary(dateFrom, dateTo) {
    const matchStage = {
      type: { $in: ['purchase', 'return_purchase'] },
      status: { $ne: 'cancelled' },
    };

    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalPurchaseAmount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'purchase'] }, '$totals.grandTotal', 0],
            },
          },
          totalReturnAmount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'return_purchase'] }, '$totals.grandTotal', 0],
            },
          },
          totalGST18: { $sum: '$totals.gst18Total' },
          totalGST4: { $sum: '$totals.gst4Total' },
          totalAdvanceTax: { $sum: '$totals.advanceTaxTotal' },
          totalNonFilerGST: { $sum: '$totals.nonFilerGSTTotal' },
        },
      },
    ];

    const [summary] = await Invoice.aggregate(pipeline);

    const purchaseInvoices = await Invoice.countDocuments({
      ...matchStage,
      type: 'purchase',
    });

    const returnInvoices = await Invoice.countDocuments({
      ...matchStage,
      type: 'return_purchase',
    });

    const netAmount = (summary?.totalPurchaseAmount || 0) - Math.abs(summary?.totalReturnAmount || 0);
    const averageInvoiceValue = purchaseInvoices > 0
      ? (summary?.totalPurchaseAmount || 0) / purchaseInvoices
      : 0;

    return {
      totalInvoices: purchaseInvoices + returnInvoices,
      purchaseInvoices,
      returnInvoices,
      totalPurchaseAmount: summary?.totalPurchaseAmount || 0,
      totalReturnAmount: Math.abs(summary?.totalReturnAmount || 0),
      netAmount,
      averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
      gstSummary: {
        gst18: summary?.totalGST18 || 0,
        gst4: summary?.totalGST4 || 0,
        totalGST: (summary?.totalGST18 || 0) + (summary?.totalGST4 || 0),
      },
      advanceTax: summary?.totalAdvanceTax || 0,
      nonFilerGST: summary?.totalNonFilerGST || 0,
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
    };
  }

  /**
   * Get purchase by supplier report
   * Requirement 6.3: Purchase by supplier breakdown
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Array>} Purchase by supplier
   */
  async getPurchaseBySupplier(dateFrom, dateTo) {
    const matchStage = {
      type: 'purchase',
      status: { $ne: 'cancelled' },
    };

    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$supplierId',
          supplierName: { $last: '$supplierName' },
          invoiceCount: { $sum: 1 },
          totalAmount: { $sum: '$totals.grandTotal' },
          totalGST18: { $sum: '$totals.gst18Total' },
          totalGST4: { $sum: '$totals.gst4Total' },
        },
      },
      { $sort: { totalAmount: -1 } },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: 1,
          supplierCode: '$supplier.code',
          contactPerson: '$supplier.contactPerson',
          phone: '$supplier.phone',
          town: '$supplier.town',
          invoiceCount: 1,
          totalAmount: 1,
          totalGST: { $add: ['$totalGST18', '$totalGST4'] },
        },
      },
    ];

    return await Invoice.aggregate(pipeline);
  }

  /**
   * Get purchase analysis report
   * Requirement 6.5-6.7: Cost analysis, scheme/discount analysis
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Object>} Purchase analysis
   */
  async getPurchaseAnalysis(dateFrom, dateTo) {
    const matchStage = {
      type: 'purchase',
      status: { $ne: 'cancelled' },
    };

    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalPurchaseValue: { $sum: '$items.lineTotal' },
          totalQuantity: { $sum: '$items.quantity' },
          totalScheme1: { $sum: '$items.scheme1Quantity' },
          totalScheme2: { $sum: '$items.scheme2Quantity' },
          totalDiscount1: { $sum: '$items.discount1Amount' },
          totalDiscount2: { $sum: '$items.discount2Amount' },
          totalGST18: { $sum: '$items.gst18Amount' },
          totalGST4: { $sum: '$items.gst4Amount' },
          totalAdvanceTax: { $sum: '$items.advanceTaxAmount' },
          itemCount: { $sum: 1 },
        },
      },
    ];

    const [analysis] = await Invoice.aggregate(pipeline);

    const invoiceCount = await Invoice.countDocuments(matchStage);

    const totalSchemeValue = (analysis?.totalScheme1 || 0) + (analysis?.totalScheme2 || 0);
    const totalDiscountValue = (analysis?.totalDiscount1 || 0) + (analysis?.totalDiscount2 || 0);
    const totalGSTValue = (analysis?.totalGST18 || 0) + (analysis?.totalGST4 || 0);
    const totalPurchaseValue = analysis?.totalPurchaseValue || 0;

    const averageCostPerUnit = analysis?.totalQuantity > 0
      ? totalPurchaseValue / analysis.totalQuantity
      : 0;

    const schemePercentage = totalPurchaseValue > 0
      ? (totalSchemeValue / totalPurchaseValue) * 100
      : 0;

    const discountPercentage = totalPurchaseValue > 0
      ? (totalDiscountValue / totalPurchaseValue) * 100
      : 0;

    return {
      costAnalysis: {
        totalPurchaseValue,
        totalQuantity: analysis?.totalQuantity || 0,
        averageCostPerUnit: Math.round(averageCostPerUnit * 100) / 100,
        itemCount: analysis?.itemCount || 0,
        invoiceCount,
      },
      schemeAnalysis: {
        totalScheme1Units: analysis?.totalScheme1 || 0,
        totalScheme2Units: analysis?.totalScheme2 || 0,
        totalSchemeUnits: totalSchemeValue,
        schemePercentage: Math.round(schemePercentage * 100) / 100,
      },
      discountAnalysis: {
        totalDiscount1: analysis?.totalDiscount1 || 0,
        totalDiscount2: analysis?.totalDiscount2 || 0,
        totalDiscounts: totalDiscountValue,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
      },
      taxAnalysis: {
        gst18: analysis?.totalGST18 || 0,
        gst4: analysis?.totalGST4 || 0,
        totalGST: totalGSTValue,
        advanceTax: analysis?.totalAdvanceTax || 0,
      },
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
    };
  }

  /**
   * Get purchase by item report
   * Requirement 6.4: Purchase by item breakdown
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Array>} Purchase by item
   */
  async getPurchaseByItem(dateFrom, dateTo) {
    const matchStage = {
      type: 'purchase',
      status: { $ne: 'cancelled' },
    };

    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          itemName: { $last: '$items.itemName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalBoxQty: { $sum: '$items.boxQuantity' },
          totalUnitQty: { $sum: '$items.unitQuantity' },
          totalAmount: { $sum: '$items.lineTotal' },
          totalGST18: {
            $sum: {
              $cond: [{ $eq: ['$items.gstRate', 18] }, '$items.gstAmount', 0],
            },
          },
          totalGST4: {
            $sum: {
              $cond: [{ $eq: ['$items.gstRate', 4] }, '$items.gstAmount', 0],
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
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
          itemId: '$_id',
          itemName: 1,
          itemCode: '$item.code',
          unit: '$item.unit',
          category: '$item.category',
          totalQuantity: 1,
          totalBoxQty: 1,
          totalUnitQty: 1,
          totalAmount: 1,
          totalGST: { $add: ['$totalGST18', '$totalGST4'] },
        },
      },
    ];

    return await Invoice.aggregate(pipeline);
  }

  /**
   * Get GST input summary report
   * Requirement 6.8: Input GST by rate (18% and 4%)
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Object>} GST input summary
   */
  async getGSTInputSummary(dateFrom, dateTo) {
    const matchStage = {
      type: 'purchase',
      status: { $ne: 'cancelled' },
    };

    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalGST18: { $sum: '$totals.gst18Total' },
          totalGST4: { $sum: '$totals.gst4Total' },
          totalAdvanceTax: { $sum: '$totals.advanceTaxTotal' },
          totalNonFilerGST: { $sum: '$totals.nonFilerGSTTotal' },
        },
      },
    ];

    const [gstSummary] = await Invoice.aggregate(pipeline);

    return {
      gst18: gstSummary?.totalGST18 || 0,
      gst4: gstSummary?.totalGST4 || 0,
      totalInputGST: (gstSummary?.totalGST18 || 0) + (gstSummary?.totalGST4 || 0),
      advanceTax: gstSummary?.totalAdvanceTax || 0,
      nonFilerGST: gstSummary?.totalNonFilerGST || 0,
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
    };
  }

  /**
   * Get supplier aging report
   * Requirement 7.7: Supplier aging analysis
   * @returns {Promise<Object>} Supplier aging report
   */
  async getSupplierAgingReport() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const pipeline = [
      {
        $match: {
          type: 'purchase',
          status: { $in: ['confirmed', 'paid'] },
          paymentStatus: { $ne: 'paid' },
          dueDate: { $lt: new Date() },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: '$supplier' },
      {
        $addFields: {
          daysOverdue: {
            $divide: [
              { $subtract: [new Date(), '$dueDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $addFields: {
          agingBucket: {
            $switch: {
              branches: [
                { case: { $lte: ['$daysOverdue', 30] }, then: 'current' },
                { case: { $lte: ['$daysOverdue', 60] }, then: '1-30' },
                { case: { $lte: ['$daysOverdue', 90] }, then: '31-60' },
                { case: { $lte: ['$daysOverdue', 90] }, then: '61-90' },
              ],
              default: '>90',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            supplierId: '$supplierId',
            supplierName: '$supplierName',
            agingBucket: '$agingBucket',
          },
          invoices: {
            $push: {
              invoiceNumber: '$invoiceNumber',
              invoiceDate: '$invoiceDate',
              dueDate: '$dueDate',
              daysOverdue: { $ceil: '$daysOverdue' },
              amount: '$totals.grandTotal',
              dueAmount: '$totals.dueAmount',
            },
          },
          totalAmount: { $sum: '$totals.dueAmount' },
        },
      },
      {
        $group: {
          _id: '$_id.supplierId',
          supplierName: { $first: '$_id.supplierName' },
          aging: {
            $push: {
              bucket: '$_id.agingBucket',
              amount: '$totalAmount',
              invoices: '$invoices',
            },
          },
          totalOutstanding: { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalOutstanding: -1 } },
    ];

    const agingData = await Invoice.aggregate(pipeline);

    const summary = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '>90': 0,
      totalOutstanding: 0,
    };

    agingData.forEach((supplier) => {
      supplier.aging.forEach((a) => {
        summary[a.bucket] = (summary[a.bucket] || 0) + a.amount;
      });
      summary.totalOutstanding += supplier.totalOutstanding;
    });

    return {
      suppliers: agingData,
      summary,
      generatedAt: new Date(),
    };
  }

  /**
   * Get payment due report
   * Requirement 7.8: Payment due report
   * @param {Date} dateTo - Due date filter
   * @returns {Promise<Object>} Payment due report
   */
  async getPaymentDueReport(dateTo) {
    const query = {
      type: 'purchase',
      status: { $ne: 'cancelled' },
      paymentStatus: { $ne: 'paid' },
    };

    if (dateTo) {
      query.dueDate = { $lte: new Date(dateTo) };
    }

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: '$supplier' },
      {
        $project: {
          invoiceNumber: 1,
          invoiceDate: 1,
          dueDate: 1,
          supplierName: 1,
          supplierId: 1,
          grandTotal: '$totals.grandTotal',
          dueAmount: '$totals.dueAmount',
          paymentStatus: 1,
          creditDays: 1,
        },
      },
      { $sort: { dueDate: 1 } },
    ];

    const invoices = await Invoice.aggregate(pipeline);

    const summary = {
      totalInvoices: invoices.length,
      totalDueAmount: invoices.reduce((sum, inv) => sum + (inv.dueAmount || inv.grandTotal), 0),
      overdueCount: invoices.filter((inv) => new Date(inv.dueDate) < new Date()).length,
      overdueAmount: invoices
        .filter((inv) => new Date(inv.dueDate) < new Date())
        .reduce((sum, inv) => sum + (inv.dueAmount || inv.grandTotal), 0),
    };

    return {
      invoices,
      summary,
      dateRange: {
        dueBy: dateTo,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get purchase vs sales comparison
   * Requirement 6.12: Purchase vs sales comparison
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   * @returns {Promise<Object>} Purchase vs sales comparison
   */
  async getPurchaseVsSalesComparison(dateFrom, dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);

    const purchasePipeline = [
      {
        $match: {
          type: 'purchase',
          status: { $ne: 'cancelled' },
          ...(Object.keys(dateFilter).length > 0 && { invoiceDate: dateFilter }),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$invoiceDate' },
          },
          totalPurchase: { $sum: '$totals.grandTotal' },
          totalGST18: { $sum: '$totals.gst18Total' },
          totalGST4: { $sum: '$totals.gst4Total' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const salesPipeline = [
      {
        $match: {
          type: 'sales',
          status: { $ne: 'cancelled' },
          ...(Object.keys(dateFilter).length > 0 && { invoiceDate: dateFilter }),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$invoiceDate' },
          },
          totalSales: { $sum: '$totals.grandTotal' },
          totalGST18: { $sum: '$totals.gst18Total' },
          totalGST4: { $sum: '$totals.gst4Total' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const [purchases, sales] = await Promise.all([
      Invoice.aggregate(purchasePipeline),
      Invoice.aggregate(salesPipeline),
    ]);

    const purchasesByMonth = new Map(purchases.map((p) => [p._id, p]));
    const salesByMonth = new Map(sales.map((s) => [s._id, s]));

    const allMonths = new Set([...purchasesByMonth.keys(), ...salesByMonth.keys()]);
    const comparison = Array.from(allMonths)
      .sort()
      .map((month) => {
        const purchase = purchasesByMonth.get(month) || {
          totalPurchase: 0, totalGST18: 0, totalGST4: 0, invoiceCount: 0,
        };
        const sales = salesByMonth.get(month) || {
          totalSales: 0, totalGST18: 0, totalGST4: 0, invoiceCount: 0,
        };

        return {
          month,
          purchase: {
            amount: purchase.totalPurchase,
            gst18: purchase.totalGST18,
            gst4: purchase.totalGST4,
            invoiceCount: purchase.invoiceCount,
          },
          sales: {
            amount: sales.totalSales,
            gst18: sales.totalGST18,
            gst4: sales.totalGST4,
            invoiceCount: sales.invoiceCount,
          },
          difference: {
            amount: (sales.totalSales || 0) - (purchase.totalPurchase || 0),
          },
        };
      });

    return {
      comparison,
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get outstanding purchase orders
   * Requirement 4.18: Outstanding PO report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Outstanding POs report
   */
  async getOutstandingPOs(filters = {}) {
    const { supplierId, startDate, endDate } = filters;

    const query = {
      status: { $in: ['draft', 'sent', 'confirmed'] },
    };

    if (supplierId) {
      query.supplierId = mongoose.Types.ObjectId(supplierId);
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) query.poDate.$gte = new Date(startDate);
      if (endDate) query.poDate.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          poNumber: 1,
          poDate: 1,
          supplierName: 1,
          supplierCode: '$supplier.code',
          town: '$supplier.town',
          billNo: 1,
          totalAmount: 1,
          status: 1,
          itemCount: { $size: '$items' },
          createdAt: 1,
        },
      },
      { $sort: { poDate: -1 } },
    ];

    const orders = await PurchaseOrder.aggregate(pipeline);

    const summary = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
      byStatus: {
        draft: orders.filter((po) => po.status === 'draft').length,
        sent: orders.filter((po) => po.status === 'sent').length,
        confirmed: orders.filter((po) => po.status === 'confirmed').length,
      },
    };

    return {
      orders,
      summary,
      filters,
      generatedAt: new Date(),
    };
  }
}

module.exports = new PurchaseReportService();
