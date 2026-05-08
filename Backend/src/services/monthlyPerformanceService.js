const Invoice = require('../models/Invoice');
const CashReceipt = require('../models/CashReceipt');
const EOrder = require('../models/EOrder');
const RoutePlan = require('../models/RoutePlan');
const User = require('../models/User');
const Customer = require('../models/Customer');

class MonthlyPerformanceService {
  async getEmployeeMonthlyPerformance(employeeId, month, year) {
    const { startDate, endDate, monthYear } = this._getMonthContext(month, year);
    const linkedUsers = await User.find({
      accountId: employeeId,
      isActive: true,
    }).select('_id').lean();

    const linkedUserIds = linkedUsers.map((user) => user._id);

    const [routePlans, salesInvoices, recoveryReceipts, eOrders] = await Promise.all([
      linkedUserIds.length
        ? RoutePlan.find({
          salesmanId: { $in: linkedUserIds },
          monthYear,
        }).select('days.areaId').lean()
        : Promise.resolve([]),
      Invoice.find({
        salesmanId: employeeId,
        type: 'sales',
        status: { $ne: 'cancelled' },
        invoiceDate: { $gte: startDate, $lte: endDate },
      }).select('customerId totals.grandTotal').lean(),
      CashReceipt.find({
        salesmanId: employeeId,
        status: { $in: ['pending', 'cleared'] },
        receiptDate: { $gte: startDate, $lte: endDate },
      }).select('customerId amount createdBy').lean(),
      EOrder.find({
        salesmanId: employeeId,
        isDeleted: { $ne: true },
        status: { $ne: 'cancelled' },
        orderDate: { $gte: startDate, $lte: endDate },
      }).select('customerId createdBy mobileSync').lean(),
    ]);

    const plannedAreaIds = [
      ...new Set(
        routePlans.flatMap((plan) => (plan.days || []).map((day) => day.areaId?.toString()).filter(Boolean)),
      ),
    ];

    let plannedCustomerIds = [];
    if (plannedAreaIds.length > 0) {
      const plannedCustomers = await Customer.find({
        areaId: { $in: plannedAreaIds },
        accountType: { $in: ['customer', 'both'] },
        isActive: { $ne: false },
      }).select('_id').lean();
      plannedCustomerIds = plannedCustomers.map((customer) => customer._id.toString());
    }

    const salesAmount = this._roundCurrency(
      salesInvoices.reduce((sum, invoice) => sum + Number(invoice?.totals?.grandTotal || 0), 0),
    );

    const recoveryAmount = this._roundCurrency(
      recoveryReceipts.reduce((sum, receipt) => sum + Number(receipt?.amount || 0), 0),
    );

    const visitedCustomerIds = this._getVisitedCustomerIds(
      salesInvoices,
      recoveryReceipts,
      eOrders,
      plannedCustomerIds,
    );

    const mobileOrders = eOrders.filter((order) => this._isMobileOrder(order, linkedUserIds)).length;

    const mobileCashRecoveryAmount = this._roundCurrency(
      recoveryReceipts
        .filter((receipt) => this._isMobileCashRecovery(receipt, linkedUserIds))
        .reduce((sum, receipt) => sum + Number(receipt?.amount || 0), 0),
    );

    return {
      month,
      year,
      startDate,
      endDate,
      monthYear,
      linkedUserIds: linkedUserIds.map((id) => id.toString()),
      plannedAreaIds,
      plannedCustomerIds,
      salesAmount,
      recoveryAmount,
      visitedCustomerIds,
      visitedParties: visitedCustomerIds.length,
      mobileOrders,
      mobileCashRecoveryAmount,
    };
  }

  _getVisitedCustomerIds(salesInvoices, recoveryReceipts, eOrders, plannedCustomerIds) {
    const candidateIds = new Set();

    salesInvoices.forEach((invoice) => {
      if (invoice?.customerId) {
        candidateIds.add(invoice.customerId.toString());
      }
    });

    recoveryReceipts.forEach((receipt) => {
      if (receipt?.customerId) {
        candidateIds.add(receipt.customerId.toString());
      }
    });

    eOrders.forEach((order) => {
      if (order?.customerId) {
        candidateIds.add(order.customerId.toString());
      }
    });

    if (!plannedCustomerIds.length) {
      return [...candidateIds];
    }

    const plannedSet = new Set(plannedCustomerIds);
    return [...candidateIds].filter((customerId) => plannedSet.has(customerId));
  }

  _isMobileOrder(order, linkedUserIds) {
    const deviceId = order?.mobileSync?.deviceId?.trim?.();
    const createdBy = order?.createdBy?.toString?.();
    const createdByLinkedUser = createdBy && linkedUserIds.some((id) => id.toString() === createdBy);

    return Boolean(
      order?.mobileSync?.offlineCreated
      || deviceId
      || (order?.mobileSync?.isSynced && createdByLinkedUser),
    );
  }

  _isMobileCashRecovery(receipt, linkedUserIds) {
    const createdBy = receipt?.createdBy?.toString?.();
    return Boolean(createdBy && linkedUserIds.some((id) => id.toString() === createdBy));
  }

  _getMonthContext(month, year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const monthYear = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    return { startDate, endDate, monthYear };
  }

  _roundCurrency(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }
}

module.exports = new MonthlyPerformanceService();
