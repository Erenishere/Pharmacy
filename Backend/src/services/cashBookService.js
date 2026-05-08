const CashPayment = require('../models/CashPayment');
const CashReceipt = require('../models/CashReceipt');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const User = require('../models/User');
const cashReceiptService = require('./cashReceiptService');
const cashPaymentService = require('./cashPaymentService');

/**
 * Cash Book Service
 * Handles cash book operations and balance tracking
 */
class CashBookService {
  normalizeTransactionType(transactionType = 'receive') {
    return transactionType === 'payment' ? 'payment' : 'receive';
  }

  async getCashBookLookups(transactionType = 'receive') {
    const normalizedType = this.normalizeTransactionType(transactionType);
    const partyAccountTypes = normalizedType === 'payment'
      ? ['supplier', 'both']
      : ['customer', 'both'];

    const [accountOptions, cashAccountOptions, salesmen] = await Promise.all([
      Customer.find({
        accountType: { $in: partyAccountTypes },
        isActive: true,
      })
        .select('name code currentBalance accountType')
        .sort({ name: 1 })
        .limit(500)
        .lean(),
      Account.find({
        accountType: 'asset',
        isActive: true,
      })
        .select('name code balance')
        .sort({ name: 1 })
        .limit(500)
        .lean(),
      User.find({
        role: 'salesman',
        isActive: true,
      })
        .select('username email')
        .sort({ username: 1 })
        .limit(200)
        .lean(),
    ]);

    return {
      transactionType: normalizedType,
      accountOptions: accountOptions.map((account) => ({
        _id: account._id,
        name: account.name,
        code: account.code || '',
        balance: account.currentBalance || 0,
        accountType: account.accountType,
      })),
      cashAccountOptions: cashAccountOptions.map((account) => ({
        _id: account._id,
        name: account.name,
        code: account.code || '',
        balance: account.balance || 0,
      })),
      salesmen: salesmen.map((salesman) => ({
        _id: salesman._id,
        name: salesman.username,
        username: salesman.username,
      })),
    };
  }

  buildDateRangeQuery(filters = {}, fieldName) {
    if (!filters.startDate && !filters.endDate) {
      return null;
    }

    const range = {};
    if (filters.startDate) {
      range.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      range.$lte = new Date(filters.endDate);
    }

    return { [fieldName]: range };
  }

  buildReceiptEntryPipeline(query) {
    return [
      { $match: query },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'cashAccountId',
          foreignField: '_id',
          as: 'cashAccount',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'salesmanId',
          foreignField: '_id',
          as: 'salesman',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByUser',
        },
      },
      {
        $project: {
          _id: 1,
          entryType: { $literal: 'receive' },
          number: '$receiptNumber',
          accountTitle: { $ifNull: [{ $first: '$customer.name' }, ''] },
          cashAccount: { $ifNull: [{ $first: '$cashAccount.name' }, '$paymentMethod'] },
          salesman: {
            $ifNull: [
              { $first: '$salesman.name' },
              { $ifNull: [{ $first: '$salesman.username' }, ''] },
            ],
          },
          userId: {
            $ifNull: [
              { $first: '$createdByUser.username' },
              { $ifNull: [{ $first: '$createdByUser.name' }, ''] },
            ],
          },
          receive: '$amount',
          paid: { $literal: 0 },
          difference: { $literal: 0 },
          date: '$receiptDate',
          postDatedCheque: { $ifNull: ['$postDatedCheque', false] },
          bankName: { $ifNull: ['$bankDetails.bankName', ''] },
          chequeNumber: { $ifNull: ['$bankDetails.chequeNumber', ''] },
          status: 1,
          detail: { $ifNull: ['$notes', ''] },
          createdAt: 1,
          raw: {
            customerId: {
              _id: '$customerId',
              name: { $ifNull: [{ $first: '$customer.name' }, ''] },
            },
            cashAccountId: {
              _id: '$cashAccountId',
              name: { $ifNull: [{ $first: '$cashAccount.name' }, ''] },
            },
            salesmanId: {
              _id: '$salesmanId',
              name: {
                $ifNull: [
                  { $first: '$salesman.name' },
                  { $ifNull: [{ $first: '$salesman.username' }, ''] },
                ],
              },
            },
            createdBy: {
              _id: '$createdBy',
              username: {
                $ifNull: [
                  { $first: '$createdByUser.username' },
                  { $ifNull: [{ $first: '$createdByUser.name' }, ''] },
                ],
              },
            },
            bankDetails: '$bankDetails',
            notes: '$notes',
          },
        },
      },
    ];
  }

  buildPaymentEntryPipeline(query) {
    return [
      { $match: query },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'cashAccountId',
          foreignField: '_id',
          as: 'cashAccount',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'salesmanId',
          foreignField: '_id',
          as: 'salesman',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByUser',
        },
      },
      {
        $project: {
          _id: 1,
          entryType: { $literal: 'payment' },
          number: '$paymentNumber',
          accountTitle: { $ifNull: [{ $first: '$supplier.name' }, ''] },
          cashAccount: { $ifNull: [{ $first: '$cashAccount.name' }, '$paymentMethod'] },
          salesman: {
            $ifNull: [
              { $first: '$salesman.name' },
              { $ifNull: [{ $first: '$salesman.username' }, ''] },
            ],
          },
          userId: {
            $ifNull: [
              { $first: '$createdByUser.username' },
              { $ifNull: [{ $first: '$createdByUser.name' }, ''] },
            ],
          },
          receive: { $literal: 0 },
          paid: '$amount',
          difference: { $literal: 0 },
          date: '$paymentDate',
          postDatedCheque: { $ifNull: ['$postDatedCheque', false] },
          bankName: { $ifNull: ['$bankDetails.bankName', ''] },
          chequeNumber: { $ifNull: ['$bankDetails.chequeNumber', ''] },
          status: 1,
          detail: { $ifNull: ['$notes', ''] },
          createdAt: 1,
          raw: {
            supplierId: {
              _id: '$supplierId',
              name: { $ifNull: [{ $first: '$supplier.name' }, ''] },
            },
            cashAccountId: {
              _id: '$cashAccountId',
              name: { $ifNull: [{ $first: '$cashAccount.name' }, ''] },
            },
            salesmanId: {
              _id: '$salesmanId',
              name: {
                $ifNull: [
                  { $first: '$salesman.name' },
                  { $ifNull: [{ $first: '$salesman.username' }, ''] },
                ],
              },
            },
            createdBy: {
              _id: '$createdBy',
              username: {
                $ifNull: [
                  { $first: '$createdByUser.username' },
                  { $ifNull: [{ $first: '$createdByUser.name' }, ''] },
                ],
              },
            },
            bankDetails: '$bankDetails',
            notes: '$notes',
          },
        },
      },
    ];
  }

  async getCashBookEntries(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (numericPage - 1) * numericLimit;

    const receiptQuery = {};
    const paymentQuery = {};

    if (filters.status) {
      receiptQuery.status = filters.status;
      paymentQuery.status = filters.status;
    }

    if (filters.paymentMethod) {
      receiptQuery.paymentMethod = filters.paymentMethod;
      paymentQuery.paymentMethod = filters.paymentMethod;
    }

    const receiptDateQuery = this.buildDateRangeQuery(filters, 'receiptDate');
    const paymentDateQuery = this.buildDateRangeQuery(filters, 'paymentDate');
    if (receiptDateQuery) {
      Object.assign(receiptQuery, receiptDateQuery);
    }
    if (paymentDateQuery) {
      Object.assign(paymentQuery, paymentDateQuery);
    }

    const sortField = ['date', 'createdAt', 'number', 'status', 'receive', 'paid'].includes(sortBy)
      ? sortBy
      : 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    let pipeline;
    let aggregationModel = CashReceipt;
    if (filters.entryType === 'receive') {
      pipeline = this.buildReceiptEntryPipeline(receiptQuery);
    } else if (filters.entryType === 'payment') {
      pipeline = this.buildPaymentEntryPipeline(paymentQuery);
      aggregationModel = CashPayment;
    } else {
      pipeline = [
        ...this.buildReceiptEntryPipeline(receiptQuery),
        {
          $unionWith: {
            coll: CashPayment.collection.name,
            pipeline: this.buildPaymentEntryPipeline(paymentQuery),
          },
        },
      ];
    }

    pipeline.push(
      { $sort: { [sortField]: sortDirection, createdAt: -1, _id: -1 } },
      {
        $facet: {
          entries: [
            { $skip: skip },
            { $limit: numericLimit },
          ],
          totalCount: [
            { $count: 'count' },
          ],
        },
      },
    );

    const [result] = await aggregationModel.aggregate(pipeline);
    const totalItems = result?.totalCount?.[0]?.count || 0;

    return {
      entries: result?.entries || [],
      pagination: {
        currentPage: numericPage,
        itemsPerPage: numericLimit,
        totalItems,
        totalPages: totalItems > 0 ? Math.ceil(totalItems / numericLimit) : 0,
      },
    };
  }

  /**
   * Get cash book balance
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Object>} Cash book balance details
   */
  async getCashBookBalance(asOfDate = new Date()) {
    const [totalReceipts, totalPayments] = await Promise.all([
      cashReceiptService.getCashBookBalance(asOfDate),
      cashPaymentService.getCashBookPayments(asOfDate),
    ]);

    const balance = totalReceipts - totalPayments;

    return {
      asOfDate,
      totalReceipts,
      totalPayments,
      balance,
    };
  }

  /**
   * Get cash book summary for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cash book summary
   */
  async getCashBookSummary(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Get opening balance (balance before start date)
    const openingBalanceData = await this.getCashBookBalance(startDate);
    const openingBalance = openingBalanceData.balance;

    // Get receipts and payments in the period
    const [receipts, payments, receiptStats, paymentStats] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startDate, endDate),
      cashPaymentService.getPaymentsByDateRange(startDate, endDate),
      cashReceiptService.getReceiptStatistics(startDate, endDate),
      cashPaymentService.getPaymentStatistics(startDate, endDate),
    ]);

    // Calculate closing balance
    const closingBalanceData = await this.getCashBookBalance(endDate);
    const closingBalance = closingBalanceData.balance;

    return {
      period: {
        startDate,
        endDate,
      },
      openingBalance,
      receipts: {
        count: receiptStats.totalReceipts,
        amount: receiptStats.totalAmount,
        byStatus: receiptStats.byStatus,
        byPaymentMethod: receiptStats.byPaymentMethod,
        transactions: receipts,
      },
      payments: {
        count: paymentStats.totalPayments,
        amount: paymentStats.totalAmount,
        byStatus: paymentStats.byStatus,
        byPaymentMethod: paymentStats.byPaymentMethod,
        transactions: payments,
      },
      closingBalance,
      netCashFlow: receiptStats.totalAmount - paymentStats.totalAmount,
    };
  }

  /**
   * Get cash flow statement
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cash flow statement
   */
  async getCashFlowStatement(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const summary = await this.getCashBookSummary(startDate, endDate);

    return {
      period: summary.period,
      cashFlowFromOperations: {
        receiptsFromCustomers: summary.receipts.amount,
        paymentsToSuppliers: summary.payments.amount,
        netCashFlow: summary.netCashFlow,
      },
      cashBalance: {
        openingBalance: summary.openingBalance,
        netIncrease: summary.netCashFlow,
        closingBalance: summary.closingBalance,
      },
      breakdown: {
        receiptsByMethod: summary.receipts.byPaymentMethod,
        paymentsByMethod: summary.payments.byPaymentMethod,
      },
    };
  }

  /**
   * Get daily cash book entries
   * @param {Date} date - Date to get entries for
   * @returns {Promise<Object>} Daily cash book entries
   */
  async getDailyCashBook(date) {
    if (!date) {
      throw new Error('Date is required');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [receipts, payments] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startOfDay, endOfDay),
      cashPaymentService.getPaymentsByDateRange(startOfDay, endOfDay),
    ]);

    // Get opening balance (balance at start of day)
    const openingBalanceData = await this.getCashBookBalance(startOfDay);
    const openingBalance = openingBalanceData.balance;

    // Calculate totals
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const closingBalance = openingBalance + totalReceipts - totalPayments;

    // Combine and sort transactions by time
    const allTransactions = [
      ...receipts.map((r) => ({
        type: 'receipt',
        time: r.receiptDate,
        number: r.receiptNumber,
        party: r.customerId,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        status: r.status,
        description: r.description,
      })),
      ...payments.map((p) => ({
        type: 'payment',
        time: p.paymentDate,
        number: p.paymentNumber,
        party: p.supplierId,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        description: p.description,
      })),
    ].sort((a, b) => a.time - b.time);

    return {
      date,
      openingBalance,
      transactions: allTransactions,
      totals: {
        receipts: totalReceipts,
        payments: totalPayments,
        net: totalReceipts - totalPayments,
      },
      closingBalance,
    };
  }

  /**
   * Get cash book transactions with running balance
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Transactions with running balance
   */
  async getCashBookWithRunningBalance(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Get opening balance
    const openingBalanceData = await this.getCashBookBalance(startDate);
    let runningBalance = openingBalanceData.balance;

    // Get all transactions
    const [receipts, payments] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startDate, endDate),
      cashPaymentService.getPaymentsByDateRange(startDate, endDate),
    ]);

    // Combine and sort by date
    const allTransactions = [
      ...receipts.map((r) => ({
        date: r.receiptDate,
        type: 'receipt',
        number: r.receiptNumber,
        party: r.customerId,
        debit: r.amount,
        credit: 0,
        paymentMethod: r.paymentMethod,
        status: r.status,
        description: r.description,
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        type: 'payment',
        number: p.paymentNumber,
        party: p.supplierId,
        debit: 0,
        credit: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        description: p.description,
      })),
    ].sort((a, b) => a.date - b.date);

    // Calculate running balance for each transaction
    const transactionsWithBalance = allTransactions.map((txn) => {
      runningBalance += txn.debit - txn.credit;
      return {
        ...txn,
        balance: runningBalance,
      };
    });

    return {
      period: { startDate, endDate },
      openingBalance: openingBalanceData.balance,
      transactions: transactionsWithBalance,
      closingBalance: runningBalance,
    };
  }
}

module.exports = new CashBookService();
