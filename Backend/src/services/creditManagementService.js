const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/appError');

/**
 * Credit Management Service
 * Handles credit limit validation, utilization tracking, and aging analysis
 */
class CreditManagementService {
  /**
   * Check if customer is within credit limit
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to check
   * @returns {Promise<Object>} Credit check result
   */
  async checkCreditLimit(customerId, amount) {
    if (!customerId || !amount) {
      throw new AppError('Customer ID and amount are required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const currentBalance = customer.currentBalance || 0;
    const creditLimit = customer.creditLimit || 0;
    const newBalance = currentBalance + amount;
    const available = creditLimit - currentBalance;
    const exceeded = newBalance > creditLimit;
    const utilizationPercent = creditLimit > 0 ? (newBalance / creditLimit) * 100 : 0;

    return {
      customerId,
      customerName: customer.name,
      currentBalance,
      creditLimit,
      availableCredit: available,
      requestedAmount: amount,
      newBalance,
      exceeded,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      requiresAuthorization: exceeded,
      message: exceeded
        ? `Credit limit exceeded. Available: ${available}, Requested: ${amount}`
        : 'Within credit limit',
    };
  }

  /**
   * Get credit utilization percentage for customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Credit utilization details
   */
  async getCreditUtilization(customerId) {
    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const currentBalance = customer.currentBalance || 0;
    const creditLimit = customer.creditLimit || 0;
    const availableCredit = Math.max(0, creditLimit - currentBalance);
    const utilizationPercent = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

    // Determine risk level
    let riskLevel = 'low';
    if (utilizationPercent >= 90) {
      riskLevel = 'critical';
    } else if (utilizationPercent >= 75) {
      riskLevel = 'high';
    } else if (utilizationPercent >= 50) {
      riskLevel = 'medium';
    }

    return {
      customerId,
      customerName: customer.name,
      currentBalance,
      creditLimit,
      availableCredit,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      riskLevel,
      status: currentBalance > creditLimit ? 'exceeded' : 'within_limit',
    };
  }

  /**
   * Get aging analysis for customer
   * Breaks down outstanding balance by age buckets
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Aging analysis
   */
  async getAgingAnalysis(customerId) {
    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Get all unpaid/partially paid invoices
    const invoices = await Invoice.find({
      customerId,
      invoiceType: 'sales',
      status: { $in: ['confirmed'] },
      paymentStatus: { $in: ['pending', 'partial'] },
    }).sort({ invoiceDate: 1 });

    const now = new Date();
    const aging = {
      current: 0, // 0-30 days
      days31to60: 0, // 31-60 days
      days61to90: 0, // 61-90 days
      over90: 0, // >90 days
      total: 0,
    };

    const agingDetails = [];

    invoices.forEach((invoice) => {
      const remainingAmount = invoice.remainingAmount || 0;
      if (remainingAmount <= 0) return;

      const invoiceDate = new Date(invoice.invoiceDate);
      const daysDiff = Math.floor((now - invoiceDate) / (1000 * 60 * 60 * 24));

      let bucket = 'current';
      if (daysDiff > 90) {
        aging.over90 += remainingAmount;
        bucket = 'over90';
      } else if (daysDiff > 60) {
        aging.days61to90 += remainingAmount;
        bucket = 'days61to90';
      } else if (daysDiff > 30) {
        aging.days31to60 += remainingAmount;
        bucket = 'days31to60';
      } else {
        aging.current += remainingAmount;
        bucket = 'current';
      }

      aging.total += remainingAmount;

      agingDetails.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totals?.netBillTotal || 0,
        paidAmount: invoice.paidAmount || 0,
        remainingAmount,
        daysOutstanding: daysDiff,
        bucket,
      });
    });

    return {
      customerId,
      customerName: customer.name,
      aging: {
        current: Math.round(aging.current * 100) / 100,
        days31to60: Math.round(aging.days31to60 * 100) / 100,
        days61to90: Math.round(aging.days61to90 * 100) / 100,
        over90: Math.round(aging.over90 * 100) / 100,
        total: Math.round(aging.total * 100) / 100,
      },
      invoiceCount: invoices.length,
      details: agingDetails,
    };
  }

  /**
   * Get overdue invoices for customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Overdue invoices
   */
  async getOverdueInvoices(customerId) {
    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const now = new Date();

    // Get all overdue invoices
    const invoices = await Invoice.find({
      customerId,
      invoiceType: 'sales',
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] },
      dueDate: { $lt: now },
    }).sort({ dueDate: 1 });

    let totalOverdue = 0;
    const overdueDetails = [];

    invoices.forEach((invoice) => {
      const remainingAmount = invoice.remainingAmount || 0;
      if (remainingAmount <= 0) return;

      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      totalOverdue += remainingAmount;

      overdueDetails.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totals?.netBillTotal || 0,
        paidAmount: invoice.paidAmount || 0,
        remainingAmount,
        daysOverdue,
      });
    });

    return {
      customerId,
      customerName: customer.name,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      invoiceCount: overdueDetails.length,
      invoices: overdueDetails,
    };
  }

  /**
   * Update customer balance after invoice
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to add (positive) or subtract (negative)
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomerBalance(customerId, amount) {
    if (!customerId || amount === undefined) {
      throw new AppError('Customer ID and amount are required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const previousBalance = customer.currentBalance || 0;
    const newBalance = previousBalance + amount;

    await Customer.findByIdAndUpdate(
      customerId,
      {
        currentBalance: newBalance,
        lastTransactionDate: new Date(),
      },
    );

    return {
      customerId,
      customerName: customer.name,
      previousBalance,
      amount,
      newBalance,
    };
  }

  /**
   * Get customers exceeding credit limit
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Customers exceeding limit
   */
  async getCustomersExceedingLimit(options = {}) {
    const { limit = 50, skip = 0 } = options;

    const customers = await Customer.find({
      $expr: { $gt: ['$currentBalance', '$creditLimit'] },
    })
      .select('name code currentBalance creditLimit')
      .limit(limit)
      .skip(skip)
      .sort({ currentBalance: -1 });

    return customers.map((customer) => ({
      customerId: customer._id,
      customerName: customer.name,
      customerCode: customer.code,
      currentBalance: customer.currentBalance || 0,
      creditLimit: customer.creditLimit || 0,
      exceeded: (customer.currentBalance || 0) - (customer.creditLimit || 0),
      utilizationPercent: customer.creditLimit > 0
        ? Math.round(((customer.currentBalance || 0) / customer.creditLimit) * 10000) / 100
        : 0,
    }));
  }

  /**
   * Get credit summary for all customers
   * @returns {Promise<Object>} Credit summary statistics
   */
  async getCreditSummary() {
    const customers = await Customer.find({
      creditLimit: { $gt: 0 },
    }).select('currentBalance creditLimit');

    let totalCreditLimit = 0;
    let totalUtilized = 0;
    let customersExceeded = 0;
    let customersNearLimit = 0; // >75% utilization

    customers.forEach((customer) => {
      const balance = customer.currentBalance || 0;
      const limit = customer.creditLimit || 0;

      totalCreditLimit += limit;
      totalUtilized += balance;

      if (balance > limit) {
        customersExceeded++;
      } else if (limit > 0 && (balance / limit) > 0.75) {
        customersNearLimit++;
      }
    });

    const utilizationPercent = totalCreditLimit > 0
      ? (totalUtilized / totalCreditLimit) * 100
      : 0;

    return {
      totalCustomers: customers.length,
      totalCreditLimit: Math.round(totalCreditLimit * 100) / 100,
      totalUtilized: Math.round(totalUtilized * 100) / 100,
      totalAvailable: Math.round((totalCreditLimit - totalUtilized) * 100) / 100,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      customersExceeded,
      customersNearLimit,
    };
  }

  /**
   * Validate credit limit override
   * Logs credit limit overrides for audit purposes
   * @param {string} customerId - Customer ID
   * @param {number} amount - Invoice amount
   * @param {string} userId - User authorizing override
   * @param {string} reason - Reason for override
   * @returns {Promise<Object>} Override log
   */
  async logCreditLimitOverride(customerId, amount, userId, reason) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const creditCheck = await this.checkCreditLimit(customerId, amount);

    // Create override log (you might want to create a separate model for this)
    const overrideLog = {
      customerId,
      customerName: customer.name,
      amount,
      currentBalance: creditCheck.currentBalance,
      creditLimit: creditCheck.creditLimit,
      exceeded: creditCheck.exceeded,
      authorizedBy: userId,
      reason,
      timestamp: new Date(),
    };

    // In a production system, you would save this to a CreditOverrideLog model
    // For now, we'll just return the log object
    return overrideLog;
  }
}

module.exports = new CreditManagementService();
