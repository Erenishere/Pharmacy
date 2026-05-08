const mongoose = require('mongoose');
const CashPayment = require('../models/CashPayment');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const ledgerService = require('./ledgerService');
const counterService = require('../utils/counterService');
const { resolveCashAccount } = require('./cashAccountResolver');
const {
  applyInvoiceAllocations,
  reverseInvoiceAllocations,
} = require('./invoicePaymentAllocationService');

/**
 * Cash Payment Service
 * Requirement 2: Cash Payment Management with invoice-wise allocation
 */
class CashPaymentService {
  async createCashPayment(paymentData) {
    return this.createPayment(paymentData, paymentData.createdBy);
  }

  async getAllCashPayments(filters = {}, options = {}) {
    return this.getPayments({
      ...filters,
      dateFrom: filters.dateFrom || filters.startDate,
      dateTo: filters.dateTo || filters.endDate,
    }, options);
  }

  async getCashPaymentById(id) {
    return this.getPaymentById(id);
  }

  async updateCashPayment(id, paymentData) {
    const existing = await CashPayment.findById(id);
    if (!existing) {
      throw new Error('Cash payment not found');
    }

    const protectedFields = [
      'amount',
      'supplierId',
      'cashAccountId',
      'cashAccount',
      'paymentMethod',
      'invoiceAllocations',
      'allocations',
      'paymentDate',
    ];
    const changesProtectedAccounting = protectedFields.some((field) => paymentData[field] !== undefined);
    if (changesProtectedAccounting) {
      throw new Error('Accounting fields cannot be edited after posting. Cancel and recreate the payment.');
    }

    const payment = await CashPayment.findByIdAndUpdate(id, paymentData, {
      new: true,
      runValidators: true,
    });
    if (!payment) {
      throw new Error('Cash payment not found');
    }
    return payment;
  }

  async clearCashPayment(id, userId) {
    const payment = await CashPayment.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    if (typeof payment.clearPayment === 'function') {
      return payment.clearPayment();
    }
    payment.status = 'cleared';
    payment.clearedDate = new Date();
    payment.clearedBy = userId;
    return payment.save();
  }

  async cancelCashPayment(id, userId, reason = 'Cash payment cancelled') {
    const session = await mongoose.startSession();
    let payment;

    try {
      await session.withTransaction(async () => {
        payment = await CashPayment.findById(id).session(session);
        if (!payment) {
          throw new Error('Payment not found');
        }
        if (payment.status === 'cancelled') {
          throw new Error('Payment is already cancelled');
        }

        await this.reversePaymentEffects(payment, userId || payment.createdBy, reason, { session });

        payment.status = 'cancelled';
        payment.cancellationReason = reason;
        payment.cancelledAt = new Date();
        payment.cancelledBy = userId;
        await payment.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return payment;
  }

  async getPendingPayments() {
    return CashPayment.findPendingPayments();
  }

  async getPaymentStatistics(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = startDate;
      if (endDate) query.paymentDate.$lte = endDate;
    }

    const byStatus = await CashPayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const total = await CashPayment.countDocuments(query);
    return { total, byStatus };
  }

  /**
   * Create cash payment with invoice allocation
   * @param {Object} paymentData - Payment data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData, userId) {
    const {
      supplierId,
      paymentDate,
      amount,
      paymentMethod,
      bankDetails,
      chequeDetails,
      cashAccountId,
      cashAccount,
      notes,
      description,
    } = paymentData;
    const selectedPaymentMethod = paymentMethod || 'cash';
    const selectedBankDetails = bankDetails || chequeDetails;
    const invoiceAllocations = paymentData.invoiceAllocations || paymentData.allocations || [];

    const session = await mongoose.startSession();
    let payment;

    try {
      await session.withTransaction(async () => {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) {
          throw new Error('Supplier not found');
        }

        const cashLedgerAccount = await resolveCashAccount({
          cashAccountId,
          cashAccount,
          paymentMethod: selectedPaymentMethod,
        }, session);

        let totalAllocated = 0;
        if (invoiceAllocations && invoiceAllocations.length > 0) {
          for (const allocation of invoiceAllocations) {
            const invoice = await Invoice.findById(allocation.invoiceId).session(session);
            if (!invoice) {
              throw new Error(`Invoice ${allocation.invoiceId} not found`);
            }
            if (invoice.supplierId.toString() !== supplierId.toString()) {
              throw new Error(`Invoice ${invoice.invoiceNumber} does not belong to selected supplier`);
            }
            const allocationAmount = Number(allocation.amount || 0);
            if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
              throw new Error('Allocation amount must be greater than 0');
            }
            totalAllocated += allocationAmount;
          }
        }

        if (totalAllocated > Number(amount || 0)) {
          throw new Error('Total allocated amount cannot exceed payment amount');
        }

        const difference = amount - totalAllocated;
        const paymentNumber = await this.generatePaymentNumber();

        [payment] = await CashPayment.create([{
          paymentNumber,
          supplierId,
          cashAccountId: cashLedgerAccount._id,
          paymentDate: paymentDate || new Date(),
          amount,
          paymentMethod: selectedPaymentMethod,
          bankDetails: selectedPaymentMethod === 'cheque' ? selectedBankDetails : undefined,
          invoiceAllocations: invoiceAllocations || [],
          totalAllocated,
          difference,
          notes: notes || description || '',
          description: description || notes || '',
          status: 'cleared',
          createdBy: userId,
        }], { session });

        if (invoiceAllocations && invoiceAllocations.length > 0) {
          await this.updateInvoicePayments(invoiceAllocations, { session });
        }

        await this.createLedgerEntries(payment, userId, { session });
      });
    } finally {
      await session.endSession();
    }

    return payment;
  }

  /**
   * Generate unique payment number
   * @returns {Promise<string>} Payment number
   */
  async generatePaymentNumber() {
    return counterService.nextSequence('CP', CashPayment, 'paymentNumber');
  }

  /**
   * Update invoice payment status based on allocations
   * @param {Array} allocations - Invoice allocations
   */
  async updateInvoicePayments(allocations, options = {}) {
    await applyInvoiceAllocations(allocations, options);
  }

  async reversePaymentEffects(payment, userId, reason, options = {}) {
    if (payment.invoiceAllocations && payment.invoiceAllocations.length > 0) {
      await reverseInvoiceAllocations(payment.invoiceAllocations, options);
    }

    try {
      await ledgerService.reverseLedgerEntries('cash_payment', payment._id, reason, userId, options);
    } catch (error) {
      if (!error.message.includes('No ledger entries found')) {
        throw error;
      }
    }
  }

  /**
   * Create ledger entries for cash payment
   * @param {Object} payment - Payment object
   * @param {string} userId - User ID
   */
  async createLedgerEntries(payment, userId, options = {}) {
    const description = `Cash Payment ${payment.paymentNumber} - ${payment.notes || 'Payment made'}`;

    // Credit Cash/Bank Account
    const creditAccount = {
      accountId: payment.cashAccountId,
      accountType: 'Account',
    };

    // Debit Supplier Account
    const debitAccount = {
      accountId: payment.supplierId,
      accountType: 'Supplier',
    };

    await ledgerService.createDoubleEntry(
      debitAccount,
      creditAccount,
      payment.amount,
      description,
      'cash_payment',
      payment._id,
      userId,
      options,
    );
  }

  /**
   * Get all cash payments with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated payments
   */
  async getPayments(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-paymentDate' } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.supplierId) query.supplierId = filters.supplierId;
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters.dateFrom || filters.dateTo) {
      query.paymentDate = {};
      if (filters.dateFrom) query.paymentDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.paymentDate.$lte = new Date(filters.dateTo);
    }

    const [payments, total] = await Promise.all([
      CashPayment.find(query)
        .populate('supplierId', 'name code')
        .populate('cashAccountId', 'name code balance')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CashPayment.countDocuments(query),
    ]);

    return {
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment
   */
  async getPaymentById(id) {
    const payment = await CashPayment.findById(id)
      .populate('supplierId', 'name code contactPerson phone')
      .populate('cashAccountId', 'name code balance')
      .populate('invoiceAllocations.invoiceId', 'invoiceNumber invoiceDate totals')
      .populate('createdBy', 'username email');

    if (!payment) {
      throw new Error('Cash payment not found');
    }

    return payment;
  }

  /**
   * Get outstanding invoices for supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Array>} Outstanding invoices
   */
  async getOutstandingInvoices(supplierId) {
    return await Invoice.find({
      supplierId,
      type: 'purchase',
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] },
    })
      .select('invoiceNumber invoiceDate totals')
      .sort({ invoiceDate: 1 })
      .lean();
  }
}

module.exports = new CashPaymentService();
