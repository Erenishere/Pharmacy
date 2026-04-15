const CashPayment = require('../models/CashPayment');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const ledgerService = require('./ledgerService');
const counterService = require('../utils/counterService');

/**
 * Cash Payment Service
 * Requirement 2: Cash Payment Management with invoice-wise allocation
 */
class CashPaymentService {
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
      chequeDetails,
      invoiceAllocations,
      notes,
    } = paymentData;

    // Validate supplier
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Validate invoice allocations
    let totalAllocated = 0;
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      for (const allocation of invoiceAllocations) {
        const invoice = await Invoice.findById(allocation.invoiceId);
        if (!invoice) {
          throw new Error(`Invoice ${allocation.invoiceId} not found`);
        }
        if (invoice.supplierId.toString() !== supplierId.toString()) {
          throw new Error(`Invoice ${invoice.invoiceNumber} does not belong to selected supplier`);
        }
        totalAllocated += allocation.amount;
      }
    }

    // Calculate difference
    const difference = amount - totalAllocated;

    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber();

    // Create payment
    const payment = await CashPayment.create({
      paymentNumber,
      supplierId,
      paymentDate: paymentDate || new Date(),
      amount,
      paymentMethod: paymentMethod || 'cash',
      chequeDetails: paymentMethod === 'cheque' ? chequeDetails : undefined,
      invoiceAllocations: invoiceAllocations || [],
      totalAllocated,
      difference,
      notes: notes || '',
      status: 'completed',
      createdBy: userId,
    });

    // Update invoice payment status
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      await this.updateInvoicePayments(invoiceAllocations);
    }

    // Create ledger entries
    await this.createLedgerEntries(payment, userId);

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
  async updateInvoicePayments(allocations) {
    for (const allocation of allocations) {
      const invoice = await Invoice.findById(allocation.invoiceId);
      if (!invoice) continue;

      const paidAmount = (invoice.paidAmount || 0) + allocation.amount;
      const dueAmount = invoice.totals.grandTotal - paidAmount;

      let paymentStatus = 'pending';
      if (dueAmount <= 0) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }

      await Invoice.findByIdAndUpdate(allocation.invoiceId, {
        paidAmount,
        dueAmount,
        paymentStatus,
      });
    }
  }

  /**
   * Create ledger entries for cash payment
   * @param {Object} payment - Payment object
   * @param {string} userId - User ID
   */
  async createLedgerEntries(payment, userId) {
    const description = `Cash Payment ${payment.paymentNumber} - ${payment.notes || 'Payment made'}`;

    // Credit Cash/Bank Account
    const creditAccount = {
      accountId: payment.paymentMethod === 'cheque' ? 'BANK_ACCOUNT' : 'CASH_ACCOUNT',
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
      .select('invoiceNumber invoiceDate totals paidAmount dueAmount')
      .sort({ invoiceDate: 1 })
      .lean();
  }
}

module.exports = new CashPaymentService();
