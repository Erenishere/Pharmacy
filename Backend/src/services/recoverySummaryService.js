const RecoverySummary = require('../models/RecoverySummary');
const Salesman = require('../models/Salesman');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 50;

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toDateBoundary(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function toObjectIdString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return null;
}

function getInvoiceMetrics(invoice) {
  const totalSales = roundCurrency(invoice?.totals?.grandTotal || 0);
  const totalRecovery = roundCurrency(invoice?.totals?.paidAmount || 0);
  const totalOutstanding = roundCurrency(
    invoice?.totals?.dueAmount ?? Math.max(0, totalSales - totalRecovery),
  );

  return {
    totalSales,
    totalRecovery,
    totalOutstanding,
  };
}

function getInvoiceAgeInDays(invoice, asOfDate) {
  if (!invoice?.dueDate) {
    return null;
  }

  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const compareDate = new Date(asOfDate);
  compareDate.setHours(23, 59, 59, 999);

  const dueBoundary = new Date(dueDate);
  dueBoundary.setHours(0, 0, 0, 0);

  return Math.floor((compareDate.getTime() - dueBoundary.getTime()) / DAY_IN_MS);
}

function getAgingBucket(invoice, asOfDate) {
  const { totalOutstanding } = getInvoiceMetrics(invoice);
  if (totalOutstanding <= 0) {
    return null;
  }

  const ageInDays = getInvoiceAgeInDays(invoice, asOfDate);
  if (ageInDays === null || ageInDays < 0) {
    return null;
  }

  if (ageInDays <= 30) {
    return '0-30';
  }
  if (ageInDays <= 60) {
    return '31-60';
  }
  if (ageInDays <= 90) {
    return '61-90';
  }

  return '90+';
}

function matchesAgingBucket(invoice, bucket, asOfDate) {
  if (!bucket) {
    return true;
  }

  return getAgingBucket(invoice, asOfDate) === bucket;
}

class RecoverySummaryService {
  normalizeFilters(filters = {}) {
    const startDate = toDateBoundary(filters.startDate || filters.fromDate);
    const endDate = toDateBoundary(filters.endDate || filters.toDate, true);
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.max(parseInt(filters.limit, 10) || DEFAULT_LIMIT, 1);

    return {
      startDate,
      endDate,
      asOfDate: endDate || new Date(),
      salesmanId: filters.salesmanId || null,
      dimensionId: filters.dimensionId || null,
      customerId: filters.customerId || null,
      town: filters.town || null,
      agingBucket: filters.agingBucket || null,
      page,
      limit,
    };
  }

  async getReportInvoices(filters) {
    const query = {
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
    };

    if (filters.salesmanId) {
      query.salesmanId = filters.salesmanId;
    }

    if (filters.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters.startDate || filters.endDate) {
      query.invoiceDate = {};
      if (filters.startDate) {
        query.invoiceDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.invoiceDate.$lte = filters.endDate;
      }
    }

    let invoices = await Invoice.find(query)
      .select('invoiceNumber invoiceDate dueDate customerId salesmanId totals status paymentStatus')
      .populate('salesmanId', 'code name')
      .populate({
        path: 'customerId',
        select: 'code name dimensionId contactInfo.town',
        populate: {
          path: 'dimensionId',
          select: 'code name',
        },
      })
      .sort({ invoiceDate: -1, createdAt: -1 })
      .lean();

    if (filters.dimensionId) {
      invoices = invoices.filter((invoice) => {
        const dimensionId = toObjectIdString(invoice?.customerId?.dimensionId?._id || invoice?.customerId?.dimensionId);
        return dimensionId === filters.dimensionId;
      });
    }

    if (filters.town) {
      const townPattern = String(filters.town).toLowerCase();
      invoices = invoices.filter((invoice) => {
        const customerTown = String(invoice?.customerId?.contactInfo?.town || '').toLowerCase();
        return customerTown.includes(townPattern);
      });
    }

    if (filters.agingBucket) {
      invoices = invoices.filter((invoice) => matchesAgingBucket(invoice, filters.agingBucket, filters.asOfDate));
    }

    return invoices;
  }

  buildSummaries(invoices, asOfDate) {
    const summaryMap = new Map();

    invoices.forEach((invoice) => {
      const { totalSales, totalRecovery, totalOutstanding } = getInvoiceMetrics(invoice);
      const agingBucket = getAgingBucket(invoice, asOfDate);
      const overdueAmount = agingBucket ? totalOutstanding : 0;

      const salesmanId = toObjectIdString(invoice?.salesmanId?._id || invoice?.salesmanId);
      const summaryKey = salesmanId || 'unassigned';
      const salesmanName = invoice?.salesmanId?.name || 'Unassigned';

      if (!summaryMap.has(summaryKey)) {
        summaryMap.set(summaryKey, {
          salesmanId,
          salesmanName,
          totalSales: 0,
          totalRecovery: 0,
          totalOutstanding: 0,
          recoveryPercentage: 0,
          overdueAmount: 0,
          customerCount: 0,
          invoiceCount: 0,
          details: [],
          _customerIds: new Set(),
          _detailMap: new Map(),
        });
      }

      const summary = summaryMap.get(summaryKey);
      summary.totalSales += totalSales;
      summary.totalRecovery += totalRecovery;
      summary.totalOutstanding += totalOutstanding;
      summary.overdueAmount += overdueAmount;
      summary.invoiceCount += 1;

      const customerId = toObjectIdString(invoice?.customerId?._id || invoice?.customerId);
      const customerName = invoice?.customerId?.name || 'Unknown Customer';
      const customerCode = invoice?.customerId?.code || '';
      const dimensionId = toObjectIdString(
        invoice?.customerId?.dimensionId?._id || invoice?.customerId?.dimensionId,
      );
      const dimensionName = invoice?.customerId?.dimensionId?.name || '';
      const detailKey = customerId || `unknown-${invoice._id}`;

      summary._customerIds.add(detailKey);

      if (!summary._detailMap.has(detailKey)) {
        summary._detailMap.set(detailKey, {
          customerId,
          customerName,
          customerCode,
          dimensionId,
          dimensionName,
          invoiceCount: 0,
          totalSales: 0,
          totalRecovery: 0,
          totalOutstanding: 0,
          overdueAmount: 0,
          recoveryPercentage: 0,
          lastInvoiceDate: null,
          lastDueDate: null,
        });
      }

      const detail = summary._detailMap.get(detailKey);
      detail.invoiceCount += 1;
      detail.totalSales += totalSales;
      detail.totalRecovery += totalRecovery;
      detail.totalOutstanding += totalOutstanding;
      detail.overdueAmount += overdueAmount;

      if (invoice.invoiceDate && (!detail.lastInvoiceDate || new Date(invoice.invoiceDate) > new Date(detail.lastInvoiceDate))) {
        detail.lastInvoiceDate = invoice.invoiceDate;
      }
      if (invoice.dueDate && (!detail.lastDueDate || new Date(invoice.dueDate) > new Date(detail.lastDueDate))) {
        detail.lastDueDate = invoice.dueDate;
      }
    });

    return Array.from(summaryMap.values())
      .map((summary) => {
        summary.totalSales = roundCurrency(summary.totalSales);
        summary.totalRecovery = roundCurrency(summary.totalRecovery);
        summary.totalOutstanding = roundCurrency(summary.totalOutstanding);
        summary.overdueAmount = roundCurrency(summary.overdueAmount);
        summary.customerCount = summary._customerIds.size;
        summary.recoveryPercentage = summary.totalSales > 0
          ? roundCurrency((summary.totalRecovery / summary.totalSales) * 100)
          : 0;

        summary.details = Array.from(summary._detailMap.values())
          .map((detail) => ({
            ...detail,
            totalSales: roundCurrency(detail.totalSales),
            totalRecovery: roundCurrency(detail.totalRecovery),
            totalOutstanding: roundCurrency(detail.totalOutstanding),
            overdueAmount: roundCurrency(detail.overdueAmount),
            recoveryPercentage: detail.totalSales > 0
              ? roundCurrency((detail.totalRecovery / detail.totalSales) * 100)
              : 0,
          }))
          .sort((left, right) => (
            right.totalOutstanding - left.totalOutstanding
            || right.totalSales - left.totalSales
            || left.customerName.localeCompare(right.customerName)
          ));

        delete summary._customerIds;
        delete summary._detailMap;

        return summary;
      })
      .sort((left, right) => (
        right.totalOutstanding - left.totalOutstanding
        || right.totalSales - left.totalSales
        || left.salesmanName.localeCompare(right.salesmanName)
      ));
  }

  buildStatistics(invoices, summaries, asOfDate) {
    const customerIds = new Set();
    const agingAnalysis = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    let totalSales = 0;
    let totalRecovery = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    invoices.forEach((invoice) => {
      const { totalSales: invoiceSales, totalRecovery: invoiceRecovery, totalOutstanding: invoiceOutstanding } = getInvoiceMetrics(invoice);
      const customerId = toObjectIdString(invoice?.customerId?._id || invoice?.customerId);
      const agingBucket = getAgingBucket(invoice, asOfDate);

      totalSales += invoiceSales;
      totalRecovery += invoiceRecovery;
      totalOutstanding += invoiceOutstanding;

      if (customerId) {
        customerIds.add(customerId);
      }

      if (agingBucket) {
        agingAnalysis[agingBucket].count += 1;
        agingAnalysis[agingBucket].amount += invoiceOutstanding;
        totalOverdue += invoiceOutstanding;
      }
    });

    Object.keys(agingAnalysis).forEach((bucket) => {
      agingAnalysis[bucket].amount = roundCurrency(agingAnalysis[bucket].amount);
    });

    totalSales = roundCurrency(totalSales);
    totalRecovery = roundCurrency(totalRecovery);
    totalOutstanding = roundCurrency(totalOutstanding);
    totalOverdue = roundCurrency(totalOverdue);

    return {
      totalSales,
      totalRecovery,
      totalOutstanding,
      totalOverdue,
      recoveryRate: totalSales > 0 ? roundCurrency((totalRecovery / totalSales) * 100) : 0,
      activeSalesmen: summaries.length,
      totalCustomers: customerIds.size,
      agingAnalysis,
    };
  }

  async buildReport(filters = {}) {
    const normalizedFilters = this.normalizeFilters(filters);
    const invoices = await this.getReportInvoices(normalizedFilters);
    const summaries = this.buildSummaries(invoices, normalizedFilters.asOfDate);
    const statistics = this.buildStatistics(invoices, summaries, normalizedFilters.asOfDate);
    const skip = (normalizedFilters.page - 1) * normalizedFilters.limit;

    return {
      summaries: summaries.slice(skip, skip + normalizedFilters.limit),
      pagination: {
        page: normalizedFilters.page,
        limit: normalizedFilters.limit,
        total: summaries.length,
        pages: Math.ceil(summaries.length / normalizedFilters.limit) || 1,
      },
      statistics,
    };
  }

  /**
     * Create a new recovery summary
     * @param {Object} data - Recovery summary data
     * @returns {Promise<Object>} Created recovery summary
     */
  async createRecoverySummary(data) {
    const {
      date, salesmanId, town, accounts, notes, createdBy,
    } = data;

    if (!salesmanId) {
      throw new Error('Salesman ID is required');
    }

    if (!town) {
      throw new Error('Town is required');
    }

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('At least one account is required');
    }

    if (!createdBy) {
      throw new Error('Created by user is required');
    }

    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      throw new Error('Salesman not found');
    }

    const accountIds = accounts.map((account) => account.accountId);
    const customers = await Customer.find({ _id: { $in: accountIds } });

    if (customers.length !== accountIds.length) {
      throw new Error('One or more accounts not found');
    }

    const recoverySummary = new RecoverySummary({
      date: date || new Date(),
      salesmanId,
      town,
      accounts,
      notes,
      createdBy,
    });

    await recoverySummary.save();
    await recoverySummary.populate('salesmanId', 'code name');
    await recoverySummary.populate('accounts.accountId', 'code name');
    await recoverySummary.populate('createdBy', 'name email');

    return recoverySummary;
  }

  /**
     * Get all recovery summaries with optional filters
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} List of recovery summaries
     */
  async getRecoverySummaries(filters = {}) {
    const report = await this.buildReport(filters);

    return {
      summaries: report.summaries,
      pagination: report.pagination,
    };
  }

  /**
     * Get recovery summary by ID
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Recovery summary
     */
  async getRecoverySummaryById(id) {
    const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false })
      .populate('salesmanId', 'code name phone email')
      .populate('accounts.accountId', 'code name phone address')
      .populate('createdBy', 'name email');

    if (!summary) {
      throw new Error('Recovery summary not found');
    }

    return summary;
  }

  /**
     * Update recovery summary
     * @param {string} id - Recovery summary ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated recovery summary
     */
  async updateRecoverySummary(id, data) {
    const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false });

    if (!summary) {
      throw new Error('Recovery summary not found');
    }

    const allowedFields = ['date', 'town', 'accounts', 'notes'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        summary[field] = data[field];
      }
    });

    if (data.accounts) {
      const accountIds = data.accounts.map((account) => account.accountId);
      const customers = await Customer.find({ _id: { $in: accountIds } });

      if (customers.length !== accountIds.length) {
        throw new Error('One or more accounts not found');
      }
    }

    await summary.save();
    await summary.populate('salesmanId', 'code name');
    await summary.populate('accounts.accountId', 'code name');
    await summary.populate('createdBy', 'name email');

    return summary;
  }

  /**
     * Delete (soft delete) recovery summary
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Deleted recovery summary
     */
  async deleteRecoverySummary(id) {
    const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false });

    if (!summary) {
      throw new Error('Recovery summary not found');
    }

    summary.isDeleted = true;
    await summary.save();

    return summary;
  }

  /**
     * Get recovery summary statistics
     * @param {Object} filters - Query filters
     * @returns {Promise<Object>} Recovery statistics
     */
  async getRecoveryStatistics(filters = {}) {
    const report = await this.buildReport(filters);
    return report.statistics;
  }

  /**
     * Generate recovery summary for printing
     * Phase 2 - Requirement 15.3, 15.6 - Task 54.3
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Formatted print data
     */
  async generateRecoverySummaryPrint(id) {
    const summary = await this.getRecoverySummaryById(id);

    const printDate = new Date().toLocaleDateString();
    const summaryDate = new Date(summary.date).toLocaleDateString();

    const totalInvoice = summary.totalInvoiceAmount || 0;
    const totalRecovery = summary.totalRecovery || 0;
    const totalBalance = summary.totalBalance || 0;

    const accountRows = summary.accounts.map((account) => ({
      customerName: account.accountId.name,
      customerCode: account.accountId.code,
      town: summary.town,
      invoiceAmount: account.invoiceAmount,
      balance: account.balance,
      recoveryAmount: account.recoveryAmount,
      remainingBalance: account.balance - account.recoveryAmount,
    }));

    return {
      companyInfo: {
        name: 'Indus Traders',
        address: '123 Main St, City',
        phone: '555-0123',
      },
      reportInfo: {
        title: 'Cash Recovery Summary',
        generatedAt: printDate,
        generatedBy: summary.createdBy.name,
      },
      summaryDetails: {
        id: summary._id,
        date: summaryDate,
        salesman: {
          name: summary.salesmanId.name,
          code: summary.salesmanId.code,
        },
        town: summary.town,
        notes: summary.notes,
      },
      financials: {
        totalInvoiceAmount: totalInvoice,
        totalBalance,
        totalRecovery,
        netOutstanding: totalBalance - totalRecovery,
        recoveryPercentage: totalInvoice > 0 ? `${((totalRecovery / totalInvoice) * 100).toFixed(2)}%` : '0%',
      },
      accounts: accountRows,
    };
  }
}

module.exports = new RecoverySummaryService();
