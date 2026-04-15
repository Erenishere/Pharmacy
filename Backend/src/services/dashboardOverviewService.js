const mongoose = require('mongoose');

const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');
const Quotation = require('../models/Quotation');
const EOrder = require('../models/EOrder');
const PurchaseOrder = require('../models/PurchaseOrder');
const CashReceipt = require('../models/CashReceipt');
const CashPayment = require('../models/CashPayment');
const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const Account = require('../models/Account');
const Capital = require('../models/Capital');
const InvestorProfitShare = require('../models/InvestorProfitShare');
const RecoverySummary = require('../models/RecoverySummary');
const Salesman = require('../models/Salesman');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const RoutePlan = require('../models/RoutePlan');
const inventoryReportService = require('./inventoryReportService');

class DashboardOverviewService {
  async getOverview(filters = {}) {
    const scope = this._buildScope(filters);

    const [summary, commercial, inventory, finance] = await Promise.all([
      this._getSummary(scope),
      this._getCommercial(scope),
      this._getInventory(scope),
      this._getFinance(scope),
    ]);

    const operations = await this._getOperations(scope);
    const alerts = this._buildAlerts({
      summary,
      inventory,
      finance,
      operations,
    });

    return {
      scope: {
        period: scope.period,
        startDate: this._toDateOnly(scope.current.startDate),
        endDate: this._toDateOnly(scope.current.endDate),
        granularity: scope.granularity,
        warehouseId: scope.warehouseId,
        salesmanId: scope.salesmanId,
      },
      summary,
      commercial,
      inventory,
      finance,
      operations,
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  _buildScope(filters = {}) {
    const period = filters.period || 'mtd';
    const now = new Date();
    const todayStart = this._startOfDay(now);
    const todayEnd = this._endOfDay(now);

    let startDate = todayStart;
    let endDate = todayEnd;

    if (period === 'custom' && filters.startDate && filters.endDate) {
      startDate = this._startOfDay(new Date(filters.startDate));
      endDate = this._endOfDay(new Date(filters.endDate));
    } else {
      switch (period) {
        case 'today':
          startDate = todayStart;
          endDate = todayEnd;
          break;
        case '7d':
          startDate = this._startOfDay(this._addDays(now, -6));
          break;
        case '30d':
          startDate = this._startOfDay(this._addDays(now, -29));
          break;
        case 'qtd':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          endDate = todayEnd;
          break;
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = todayEnd;
          break;
        case 'mtd':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = todayEnd;
          break;
      }
    }

    const totalDays = Math.max(1, this._diffInDays(startDate, endDate) + 1);
    const previousEnd = this._endOfDay(this._addDays(startDate, -1));
    const previousStart = this._startOfDay(this._addDays(previousEnd, -(totalDays - 1)));

    return {
      period,
      granularity: totalDays <= 31 ? 'daily' : totalDays <= 120 ? 'weekly' : 'monthly',
      warehouseId: filters.warehouseId || null,
      salesmanId: filters.salesmanId || null,
      current: { startDate, endDate },
      previous: { startDate: previousStart, endDate: previousEnd },
    };
  }

  async _getSummary(scope) {
    const [
      currentSales,
      previousSales,
      currentMargin,
      previousMargin,
      currentCollections,
      previousCollections,
      receivablesDue,
      payablesDue,
      cashBankPosition,
      inventorySnapshot,
      expiryExposure,
    ] = await Promise.all([
      this._getSalesMetrics(scope.current, scope.salesmanId),
      this._getSalesMetrics(scope.previous, scope.salesmanId),
      this._getGrossMargin(scope.current, scope.salesmanId),
      this._getGrossMargin(scope.previous, scope.salesmanId),
      this._getCollectionsTotal(scope.current, scope.salesmanId),
      this._getCollectionsTotal(scope.previous, scope.salesmanId),
      this._getOutstandingInvoices('sales', scope.current.endDate, scope.salesmanId),
      this._getOutstandingInvoices('purchase', scope.current.endDate),
      this._getCashBankPosition(),
      this._getInventorySnapshot(scope.warehouseId),
      this._getExpiryExposure(scope.warehouseId),
    ]);

    return {
      netSales: this._buildMetric(currentSales.netSales, previousSales.netSales, {
        route: '/sales-invoices',
        meta: {
          invoiceCount: currentSales.salesInvoiceCount,
          returnsValue: currentSales.returnSales,
        },
      }),
      grossMargin: this._buildMetric(currentMargin.marginValue, previousMargin.marginValue, {
        route: '/items',
        meta: {
          marginPercent: currentSales.netSales > 0
            ? this._round((currentMargin.marginValue / currentSales.netSales) * 100)
            : 0,
        },
      }),
      collections: this._buildMetric(currentCollections.total, previousCollections.total, {
        route: '/cashbook',
        meta: { receiptCount: currentCollections.count },
      }),
      receivablesDue: {
        value: receivablesDue.total,
        count: receivablesDue.count,
        route: '/recovery-summary',
      },
      payablesDue: {
        value: payablesDue.total,
        count: payablesDue.count,
        route: '/purchase-invoices',
      },
      cashBank: {
        value: cashBankPosition.total,
        count: cashBankPosition.count,
        route: '/cashbook',
      },
      inventoryValue: {
        value: inventorySnapshot.totalValue,
        quantity: inventorySnapshot.totalQuantity,
        totalItems: inventorySnapshot.totalItems,
        lowStockCount: inventorySnapshot.lowStockItems,
        route: '/reports/inventory/stock-valuation',
      },
      expiryExposure: {
        value: expiryExposure.totalValue,
        count: expiryExposure.count,
        route: '/reports/inventory/batch-expiry',
      },
    };
  }

  async _getCommercial(scope) {
    const [salesTrend, funnel, topCustomers, topItems, salesmen] = await Promise.all([
      this._getSalesTrend(scope),
      this._getFunnel(scope),
      this._getTopCustomers(scope),
      this._getTopItems(scope),
      this._getSalesmenPerformance(scope),
    ]);

    return {
      salesTrend,
      funnel,
      topCustomers,
      topItems,
      salesmen,
    };
  }

  async _getInventory(scope) {
    const [lowStock, expiry, warehouseDistribution] = await Promise.all([
      this._getLowStock(scope.warehouseId),
      this._getExpiryList(scope.warehouseId),
      this._getWarehouseDistribution(scope.warehouseId),
    ]);

    return {
      lowStock,
      expiry,
      warehouseDistribution,
    };
  }

  async _getFinance(scope) {
    const [cashFlowTrend, expenseByCategory, pdc, investors, tax] = await Promise.all([
      this._getCashFlowTrend(scope),
      this._getExpenseByCategory(scope.current),
      this._getPdcMetrics(),
      this._getInvestorMetrics(),
      this._getTaxMetrics(scope.current),
    ]);

    return {
      cashFlowTrend,
      expenseByCategory,
      pdc,
      investors,
      tax,
    };
  }

  async _getOperations(scope) {
    const monthYear = `${scope.current.endDate.getFullYear()}-${String(scope.current.endDate.getMonth() + 1).padStart(2, '0')}`;

    const [pendingPurchaseOrders, dispatchBacklog, routeCoverage, quotationAndOrderCounts, returnMetrics] = await Promise.all([
      PurchaseOrder.countDocuments({
        isDeleted: { $ne: true },
        status: { $in: ['draft', 'sent', 'confirmed'] },
        fulfillmentStatus: { $ne: 'fulfilled' },
      }),
      Invoice.countDocuments({
        type: 'sales',
        status: { $in: ['confirmed', 'paid'] },
        biltyStatus: 'pending',
      }),
      RoutePlan.countDocuments({ monthYear }),
      Promise.all([
        Quotation.countDocuments({
          isDeleted: { $ne: true },
          quotationDate: {
            $gte: scope.current.startDate,
            $lte: scope.current.endDate,
          },
          status: { $in: ['draft', 'sent', 'approved'] },
        }),
        EOrder.countDocuments({
          orderDate: {
            $gte: scope.current.startDate,
            $lte: scope.current.endDate,
          },
          status: { $in: ['pending', 'approved'] },
        }),
      ]),
      this._getSalesMetrics(scope.current, scope.salesmanId),
    ]);

    const salesReturnsRate = returnMetrics.totalSales > 0
      ? this._round((returnMetrics.returnSales / returnMetrics.totalSales) * 100)
      : 0;

    return {
      pendingPurchaseOrders,
      dispatchBacklog,
      routeCoverage,
      draftQuotations: quotationAndOrderCounts[0],
      pendingOrders: quotationAndOrderCounts[1],
      salesReturnsRate,
    };
  }

  async _getSalesMetrics(range, salesmanId) {
    const match = {
      type: { $in: ['sales', 'return_sales'] },
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
    };

    if (salesmanId && this._isValidObjectId(salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(salesmanId);
    }

    const [result] = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: {
              $cond: [{ $eq: ['$type', 'sales'] }, '$totals.grandTotal', 0],
            },
          },
          returnSales: {
            $sum: {
              $cond: [{ $eq: ['$type', 'return_sales'] }, '$totals.grandTotal', 0],
            },
          },
          salesInvoiceCount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'sales'] }, 1, 0],
            },
          },
          returnInvoiceCount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'return_sales'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalSales = result?.totalSales || 0;
    const returnSales = result?.returnSales || 0;

    return {
      totalSales,
      returnSales,
      netSales: totalSales - returnSales,
      salesInvoiceCount: result?.salesInvoiceCount || 0,
      returnInvoiceCount: result?.returnInvoiceCount || 0,
    };
  }

  async _getGrossMargin(range, salesmanId) {
    const match = {
      type: { $in: ['sales', 'return_sales'] },
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
    };

    if (salesmanId && this._isValidObjectId(salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(salesmanId);
    }

    const [result] = await Invoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: Item.collection.name,
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDoc',
        },
      },
      {
        $addFields: {
          itemCost: {
            $ifNull: [{ $arrayElemAt: ['$itemDoc.pricing.costPrice', 0] }, 0],
          },
          sign: {
            $cond: [{ $eq: ['$type', 'return_sales'] }, -1, 1],
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $multiply: ['$items.lineTotal', '$sign'],
            },
          },
          cost: {
            $sum: {
              $multiply: ['$items.quantity', '$itemCost', '$sign'],
            },
          },
        },
      },
    ]);

    const revenue = result?.revenue || 0;
    const cost = result?.cost || 0;

    return {
      revenue,
      cost,
      marginValue: revenue - cost,
    };
  }

  async _getCollectionsTotal(range, salesmanId) {
    const match = {
      receiptDate: {
        $gte: range.startDate,
        $lte: range.endDate,
      },
      status: 'cleared',
    };

    if (salesmanId && this._isValidObjectId(salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(salesmanId);
    }

    const [result] = await CashReceipt.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total: result?.total || 0,
      count: result?.count || 0,
    };
  }

  async _getOutstandingInvoices(type, asOfDate, salesmanId) {
    const match = {
      type,
      status: { $in: ['confirmed', 'paid'] },
      paymentStatus: { $ne: 'paid' },
      dueDate: { $lte: asOfDate },
      'totals.dueAmount': { $gt: 0 },
    };

    if (type === 'sales' && salesmanId && this._isValidObjectId(salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(salesmanId);
    }

    const [result] = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$totals.dueAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total: result?.total || 0,
      count: result?.count || 0,
    };
  }

  async _getCashBankPosition() {
    const [result] = await Account.aggregate([
      {
        $match: {
          isActive: true,
          accountType: 'asset',
          $or: [
            { name: /cash/i },
            { name: /bank/i },
            { code: /cash/i },
            { code: /bank/i },
          ],
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balance' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total: result?.total || 0,
      count: result?.count || 0,
    };
  }

  async _getInventorySnapshot(warehouseId) {
    return inventoryReportService.getStockSummary(warehouseId);
  }

  async _getExpiryExposure(warehouseId) {
    const match = {
      remainingQuantity: { $gt: 0 },
      expiryDate: {
        $gte: this._startOfDay(new Date()),
        $lte: this._endOfDay(this._addDays(new Date(), 90)),
      },
      status: { $in: ['active', 'quarantined'] },
    };

    if (warehouseId && this._isValidObjectId(warehouseId)) {
      match.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const [result] = await Batch.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$remainingQuantity', { $ifNull: ['$unitCost', 0] }],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalValue: result?.totalValue || 0,
      count: result?.count || 0,
    };
  }

  async _getSalesTrend(scope) {
    const match = {
      type: { $in: ['sales', 'return_sales'] },
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: scope.current.startDate,
        $lte: scope.current.endDate,
      },
    };

    if (scope.salesmanId && this._isValidObjectId(scope.salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(scope.salesmanId);
    }

    const rows = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' },
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'return_sales'] },
                { $multiply: ['$totals.grandTotal', -1] },
                '$totals.grandTotal',
              ],
            },
          },
          invoices: {
            $sum: {
              $cond: [{ $eq: ['$type', 'sales'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const buckets = this._initializeTrendBuckets(
      scope.current.startDate,
      scope.current.endDate,
      scope.granularity,
    );

    rows.forEach((row) => {
      const bucketDate = new Date(`${row._id}T00:00:00`);
      const key = this._trendBucketKey(bucketDate, scope.granularity);
      const bucket = buckets.byKey.get(key);

      if (!bucket) {
        return;
      }

      bucket.revenue += row.revenue || 0;
      bucket.invoices += row.invoices || 0;
    });

    return buckets.items.map((bucket) => ({
      label: bucket.label,
      revenue: this._round(bucket.revenue),
      invoices: bucket.invoices,
      averageInvoiceValue: bucket.invoices > 0
        ? this._round(bucket.revenue / bucket.invoices)
        : 0,
    }));
  }

  async _getFunnel(scope) {
    const baseDateRange = {
      $gte: scope.current.startDate,
      $lte: scope.current.endDate,
    };

    const [quotationStats, orderStats, invoiceStats, collectionStats] = await Promise.all([
      Quotation.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            quotationDate: baseDateRange,
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            value: { $sum: '$grandTotal' },
          },
        },
      ]),
      EOrder.aggregate([
        {
          $match: {
            orderDate: baseDateRange,
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            value: { $sum: '$grandTotal' },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            type: 'sales',
            status: { $in: ['confirmed', 'paid'] },
            invoiceDate: baseDateRange,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            value: { $sum: '$totals.grandTotal' },
          },
        },
      ]),
      CashReceipt.aggregate([
        {
          $match: {
            receiptDate: baseDateRange,
            status: 'cleared',
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            value: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const quotations = quotationStats[0] || {};
    const orders = orderStats[0] || {};
    const invoices = invoiceStats[0] || {};
    const collections = collectionStats[0] || {};

    return [
      { key: 'quotations', label: 'Quotations', count: quotations.count || 0, value: quotations.value || 0, route: '/quotations' },
      { key: 'eOrders', label: 'E-Orders', count: orders.count || 0, value: orders.value || 0, route: '/e-orders' },
      { key: 'salesInvoices', label: 'Sales Invoices', count: invoices.count || 0, value: invoices.value || 0, route: '/sales-invoices' },
      { key: 'collections', label: 'Collections', count: collections.count || 0, value: collections.value || 0, route: '/recovery-summary' },
    ];
  }

  async _getTopCustomers(scope) {
    const salesMatch = {
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: scope.current.startDate,
        $lte: scope.current.endDate,
      },
      customerId: { $exists: true, $ne: null },
    };

    if (scope.salesmanId && this._isValidObjectId(scope.salesmanId)) {
      salesMatch.salesmanId = new mongoose.Types.ObjectId(scope.salesmanId);
    }

    const overdueRows = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          status: { $in: ['confirmed', 'paid'] },
          paymentStatus: { $ne: 'paid' },
          dueDate: { $lte: scope.current.endDate },
          'totals.dueAmount': { $gt: 0 },
          customerId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$customerId',
          overdueExposure: { $sum: '$totals.dueAmount' },
        },
      },
    ]);

    const overdueMap = new Map(
      overdueRows.map((row) => [row._id?.toString(), row.overdueExposure || 0]),
    );

    const customers = await Invoice.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: '$customerId',
          revenue: { $sum: '$totals.grandTotal' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Customer.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          name: '$customer.name',
          code: '$customer.code',
          revenue: 1,
          invoiceCount: 1,
          averageOrderValue: {
            $cond: [
              { $gt: ['$invoiceCount', 0] },
              { $divide: ['$revenue', '$invoiceCount'] },
              0,
            ],
          },
        },
      },
    ]);

    return customers.map((customer) => ({
      ...customer,
      overdueExposure: overdueMap.get(customer.customerId?.toString()) || 0,
      route: '/customers',
    }));
  }

  async _getTopItems(scope) {
    const match = {
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: scope.current.startDate,
        $lte: scope.current.endDate,
      },
    };

    if (scope.salesmanId && this._isValidObjectId(scope.salesmanId)) {
      match.salesmanId = new mongoose.Types.ObjectId(scope.salesmanId);
    }

    const items = await Invoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Item.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      {
        $unwind: {
          path: '$item',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          itemId: '$_id',
          name: '$item.name',
          code: '$item.code',
          quantity: 1,
          revenue: 1,
        },
      },
    ]);

    return items.map((item) => ({
      ...item,
      route: '/items',
    }));
  }

  async _getSalesmenPerformance(scope) {
    const salesMatch = {
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
      invoiceDate: {
        $gte: scope.current.startDate,
        $lte: scope.current.endDate,
      },
      salesmanId: { $exists: true, $ne: null },
    };

    if (scope.salesmanId && this._isValidObjectId(scope.salesmanId)) {
      salesMatch.salesmanId = new mongoose.Types.ObjectId(scope.salesmanId);
    }

    const recoveryMatch = {
      isDeleted: { $ne: true },
      date: {
        $gte: scope.current.startDate,
        $lte: scope.current.endDate,
      },
    };

    const [salesRows, recoveryRows] = await Promise.all([
      Invoice.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: '$salesmanId',
            totalSales: { $sum: '$totals.grandTotal' },
            invoiceCount: { $sum: 1 },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
      ]),
      RecoverySummary.aggregate([
        { $match: recoveryMatch },
        {
          $group: {
            _id: '$salesmanId',
            recovery: { $sum: '$totalRecovery' },
          },
        },
      ]),
    ]);

    const recoveryMap = new Map(
      recoveryRows.map((row) => [row._id?.toString(), row.recovery || 0]),
    );

    const salesmanIds = salesRows.map((row) => row._id).filter(Boolean);
    const salesmen = await Salesman.find({ _id: { $in: salesmanIds } })
      .select('name code userId')
      .lean();

    const currentMonthYear = `${scope.current.endDate.getFullYear()}-${String(scope.current.endDate.getMonth() + 1).padStart(2, '0')}`;
    const routePlans = await RoutePlan.find({ monthYear: currentMonthYear })
      .select('salesmanId salesTarget')
      .lean();

    const targetMap = new Map(
      routePlans.map((plan) => [plan.salesmanId?.toString(), plan.salesTarget || 0]),
    );
    const salesmanMap = new Map(
      salesmen.map((salesman) => [salesman._id.toString(), salesman]),
    );

    return salesRows.map((row) => {
      const salesman = salesmanMap.get(row._id.toString());
      const target = targetMap.get(salesman?.userId?.toString()) || 0;
      const achievementPercent = target > 0
        ? this._round((row.totalSales / target) * 100)
        : null;

      return {
        salesmanId: row._id,
        name: salesman?.name || 'Unassigned',
        code: salesman?.code || '',
        totalSales: row.totalSales || 0,
        invoiceCount: row.invoiceCount || 0,
        recovery: recoveryMap.get(row._id.toString()) || 0,
        target,
        achievementPercent,
        route: '/targets/dashboard',
      };
    });
  }

  async _getLowStock(warehouseId) {
    const report = await inventoryReportService.getLowStockReport(warehouseId, 6);

    return (report.items || []).map((row) => {
      const currentStock = row.currentStock || 0;
      const reorderLevel = row.reorderLevel || 0;
      const ratio = reorderLevel > 0 ? currentStock / reorderLevel : 0;

      return {
        itemId: row.item?._id || null,
        name: row.item?.name || 'Unknown Item',
        code: row.item?.code || '',
        warehouseName: row.warehouse?.name || 'Global',
        currentStock,
        reorderLevel,
        deficit: row.deficit || 0,
        severity: currentStock <= 0 ? 'critical' : ratio <= 0.5 ? 'warning' : 'watch',
        route: '/inventory/stock-levels',
      };
    });
  }

  async _getExpiryList(warehouseId) {
    const match = {
      remainingQuantity: { $gt: 0 },
      expiryDate: {
        $gte: this._startOfDay(new Date()),
        $lte: this._endOfDay(this._addDays(new Date(), 90)),
      },
      status: { $in: ['active', 'quarantined'] },
    };

    if (warehouseId && this._isValidObjectId(warehouseId)) {
      match.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const rows = await Batch.aggregate([
      { $match: match },
      {
        $lookup: {
          from: Item.collection.name,
          localField: 'item',
          foreignField: '_id',
          as: 'itemDoc',
        },
      },
      {
        $lookup: {
          from: Warehouse.collection.name,
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouseDoc',
        },
      },
      {
        $addFields: {
          itemDoc: { $arrayElemAt: ['$itemDoc', 0] },
          warehouseDoc: { $arrayElemAt: ['$warehouseDoc', 0] },
          value: {
            $multiply: ['$remainingQuantity', { $ifNull: ['$unitCost', 0] }],
          },
        },
      },
      {
        $project: {
          _id: 1,
          itemId: '$itemDoc._id',
          itemName: '$itemDoc.name',
          itemCode: '$itemDoc.code',
          batchNumber: 1,
          warehouseName: '$warehouseDoc.name',
          remainingQuantity: 1,
          expiryDate: 1,
          value: 1,
        },
      },
      { $sort: { expiryDate: 1 } },
      { $limit: 6 },
    ]);

    return rows.map((row) => ({
      ...row,
      daysLeft: this._diffInDays(new Date(), row.expiryDate),
      route: '/reports/inventory/batch-expiry',
    }));
  }

  async _getWarehouseDistribution(warehouseId) {
    const match = {};

    if (warehouseId && this._isValidObjectId(warehouseId)) {
      match.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const rows = await Inventory.aggregate([
      { $match: match },
      {
        $lookup: {
          from: Warehouse.collection.name,
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouseDoc',
        },
      },
      {
        $lookup: {
          from: Item.collection.name,
          localField: 'item',
          foreignField: '_id',
          as: 'itemDoc',
        },
      },
      {
        $addFields: {
          warehouseDoc: { $arrayElemAt: ['$warehouseDoc', 0] },
          itemDoc: { $arrayElemAt: ['$itemDoc', 0] },
        },
      },
      {
        $group: {
          _id: '$warehouse',
          warehouseName: { $first: '$warehouseDoc.name' },
          totalQuantity: { $sum: '$quantity' },
          totalValue: {
            $sum: {
              $multiply: ['$quantity', { $ifNull: ['$itemDoc.pricing.costPrice', 0] }],
            },
          },
          itemCount: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
    ]);

    return rows.map((row) => ({
      warehouseId: row._id,
      warehouseName: row.warehouseName || 'Unknown',
      totalQuantity: row.totalQuantity || 0,
      totalValue: row.totalValue || 0,
      itemCount: row.itemCount || 0,
    }));
  }

  async _getCashFlowTrend(scope) {
    const [receiptRows, paymentRows] = await Promise.all([
      CashReceipt.aggregate([
        {
          $match: {
            status: 'cleared',
            receiptDate: {
              $gte: scope.current.startDate,
              $lte: scope.current.endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$receiptDate' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CashPayment.aggregate([
        {
          $match: {
            status: 'cleared',
            paymentDate: {
              $gte: scope.current.startDate,
              $lte: scope.current.endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const buckets = this._initializeTrendBuckets(
      scope.current.startDate,
      scope.current.endDate,
      scope.granularity,
    );

    receiptRows.forEach((row) => {
      const key = this._trendBucketKey(new Date(`${row._id}T00:00:00`), scope.granularity);
      const bucket = buckets.byKey.get(key);
      if (bucket) {
        bucket.receipts += row.total || 0;
      }
    });

    paymentRows.forEach((row) => {
      const key = this._trendBucketKey(new Date(`${row._id}T00:00:00`), scope.granularity);
      const bucket = buckets.byKey.get(key);
      if (bucket) {
        bucket.payments += row.total || 0;
      }
    });

    return buckets.items.map((bucket) => ({
      label: bucket.label,
      receipts: this._round(bucket.receipts),
      payments: this._round(bucket.payments),
    }));
  }

  async _getExpenseByCategory(range) {
    const rows = await Expense.aggregate([
      {
        $match: {
          date: {
            $gte: range.startDate,
            $lte: range.endDate,
          },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: ExpenseCategory.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          name: '$category.categoryName',
          amount: 1,
        },
      },
    ]);

    return rows.map((row) => ({
      ...row,
      route: '/expenses',
    }));
  }

  async _getPdcMetrics() {
    const todayStart = this._startOfDay(new Date());
    const todayEnd = this._endOfDay(new Date());
    const upcomingEnd = this._endOfDay(this._addDays(new Date(), 7));

    const basePendingMatch = {
      paymentMethod: 'cheque',
      status: 'pending',
      'bankDetails.chequeDate': { $exists: true },
    };

    const [dueToday, upcoming, overdue, bounced, pendingAmount] = await Promise.all([
      CashReceipt.countDocuments({
        ...basePendingMatch,
        'bankDetails.chequeDate': { $gte: todayStart, $lte: todayEnd },
      }),
      CashReceipt.countDocuments({
        ...basePendingMatch,
        'bankDetails.chequeDate': { $gt: todayEnd, $lte: upcomingEnd },
      }),
      CashReceipt.countDocuments({
        ...basePendingMatch,
        'bankDetails.chequeDate': { $lt: todayStart },
      }),
      CashReceipt.countDocuments({
        paymentMethod: 'cheque',
        $or: [{ status: 'bounced' }, { chequeStatus: 'bounced' }],
      }),
      CashReceipt.aggregate([
        { $match: basePendingMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    return {
      dueToday,
      upcoming,
      overdue,
      bounced,
      totalPendingAmount: pendingAmount[0]?.total || 0,
      route: '/pdc',
    };
  }

  async _getInvestorMetrics() {
    const [capitalSummary, draftProfitShare] = await Promise.all([
      Capital.aggregate([
        {
          $match: {
            status: 'Investor',
            investorAccountId: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            investorAccountId: 1,
            signedAmount: {
              $cond: [
                { $eq: ['$transactionType', 'in'] },
                { $ifNull: ['$effectiveAmount', '$amount'] },
                {
                  $multiply: [
                    { $ifNull: ['$effectiveAmount', '$amount'] },
                    -1,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCapital: { $sum: '$signedAmount' },
            investorAccounts: { $addToSet: '$investorAccountId' },
          },
        },
      ]),
      InvestorProfitShare.aggregate([
        { $match: { status: 'Draft' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalProfit' },
          },
        },
      ]),
    ]);

    return {
      totalCapital: capitalSummary[0]?.totalCapital || 0,
      activeInvestors: capitalSummary[0]?.investorAccounts?.length || 0,
      profitShareDue: draftProfitShare[0]?.total || 0,
      route: '/investors',
    };
  }

  async _getTaxMetrics(range) {
    const [salesTax, purchaseTax] = await Promise.all([
      this._sumInvoiceTax('sales', range),
      this._sumInvoiceTax('purchase', range),
    ]);

    return {
      gstSales: salesTax,
      gstPurchases: purchaseTax,
      withholding: 0,
      complianceIssues: 0,
    };
  }

  async _sumInvoiceTax(type, range) {
    const [result] = await Invoice.aggregate([
      {
        $match: {
          type,
          status: { $in: ['confirmed', 'paid'] },
          invoiceDate: {
            $gte: range.startDate,
            $lte: range.endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $add: [
                { $ifNull: ['$totals.gst18Total', 0] },
                { $ifNull: ['$totals.gst4Total', 0] },
              ],
            },
          },
        },
      },
    ]);

    return result?.total || 0;
  }

  _buildAlerts({ summary, inventory, finance, operations }) {
    const alerts = [];

    inventory.lowStock
      .filter((item) => item.severity !== 'watch')
      .slice(0, 3)
      .forEach((item) => {
        alerts.push({
          id: `low-stock-${item.itemId || item.code}`,
          severity: item.severity === 'critical' ? 'critical' : 'warning',
          title: `${item.name} is below reorder level`,
          description: `${item.currentStock} in stock against reorder level ${item.reorderLevel} at ${item.warehouseName}`,
          route: item.route,
          value: item.deficit,
        });
      });

    inventory.expiry
      .filter((item) => item.daysLeft <= 30)
      .slice(0, 3)
      .forEach((item) => {
        alerts.push({
          id: `expiry-${item._id}`,
          severity: item.daysLeft <= 14 ? 'critical' : 'warning',
          title: `${item.itemName} batch ${item.batchNumber} is nearing expiry`,
          description: `${item.daysLeft} days left in ${item.warehouseName}`,
          route: item.route,
          value: item.value,
        });
      });

    if (summary.receivablesDue.count > 0) {
      alerts.push({
        id: 'receivables-due',
        severity: 'warning',
        title: 'Outstanding receivables need follow-up',
        description: `${summary.receivablesDue.count} sales invoices are overdue`,
        route: summary.receivablesDue.route,
        value: summary.receivablesDue.value,
      });
    }

    if (finance.pdc.overdue > 0) {
      alerts.push({
        id: 'pdc-overdue',
        severity: 'critical',
        title: 'Overdue post-dated cheques need attention',
        description: `${finance.pdc.overdue} cheque(s) are overdue for clearance`,
        route: finance.pdc.route,
        value: finance.pdc.totalPendingAmount,
      });
    }

    if (operations.pendingPurchaseOrders > 0) {
      alerts.push({
        id: 'pending-po',
        severity: 'info',
        title: 'Pending purchase orders are still open',
        description: `${operations.pendingPurchaseOrders} purchase order(s) are awaiting action`,
        route: '/purchase-orders',
        value: operations.pendingPurchaseOrders,
      });
    }

    const severityWeight = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    return alerts
      .sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0))
      .slice(0, 8);
  }

  _buildMetric(value, previousValue, extra = {}) {
    return {
      value: this._round(value),
      previousValue: this._round(previousValue),
      deltaPercent: this._calculateDeltaPercent(value, previousValue),
      ...extra,
    };
  }

  _calculateDeltaPercent(currentValue, previousValue) {
    if (!previousValue && !currentValue) {
      return 0;
    }

    if (!previousValue) {
      return 100;
    }

    return this._round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
  }

  _initializeTrendBuckets(startDate, endDate, granularity) {
    const items = [];
    const byKey = new Map();

    let cursor = this._startOfDay(startDate);
    let stop = this._endOfDay(endDate);

    if (granularity === 'weekly') {
      cursor = this._weekStart(cursor);
    } else if (granularity === 'monthly') {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      stop = new Date(stop.getFullYear(), stop.getMonth(), 1);
    }

    while (cursor <= stop) {
      const key = this._trendBucketKey(cursor, granularity);
      const item = {
        key,
        label: this._trendBucketLabel(cursor, granularity),
        revenue: 0,
        invoices: 0,
        receipts: 0,
        payments: 0,
      };

      items.push(item);
      byKey.set(key, item);

      if (granularity === 'daily') {
        cursor = this._addDays(cursor, 1);
      } else if (granularity === 'weekly') {
        cursor = this._addDays(cursor, 7);
      } else {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }

    return { items, byKey };
  }

  _trendBucketKey(date, granularity) {
    if (granularity === 'monthly') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (granularity === 'weekly') {
      return this._toDateOnly(this._weekStart(date));
    }

    return this._toDateOnly(date);
  }

  _trendBucketLabel(date, granularity) {
    if (granularity === 'monthly') {
      return date.toLocaleDateString('en-PK', {
        month: 'short',
        year: 'numeric',
      });
    }

    return date.toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
    });
  }

  _weekStart(date) {
    const result = this._startOfDay(date);
    const day = result.getDay();
    const diff = (day + 6) % 7;
    result.setDate(result.getDate() - diff);
    return result;
  }

  _isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
  }

  _toDateOnly(date) {
    return this._startOfDay(date).toISOString().split('T')[0];
  }

  _startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  _endOfDay(date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  _addDays(date, days) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
  }

  _diffInDays(startDate, endDate) {
    const oneDay = 24 * 60 * 60 * 1000;
    const start = this._startOfDay(startDate).getTime();
    const end = this._startOfDay(endDate).getTime();
    return Math.round((end - start) / oneDay);
  }

  _round(value) {
    return Math.round((value || 0) * 100) / 100;
  }
}

module.exports = new DashboardOverviewService();
