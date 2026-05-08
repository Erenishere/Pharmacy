const mongoose = require('mongoose');
const CashReceipt = require('../models/CashReceipt');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const ledgerService = require('./ledgerService');
const counterService = require('../utils/counterService');
const { resolveCashAccount } = require('./cashAccountResolver');
const {
  applyInvoiceAllocations,
  reverseInvoiceAllocations,
} = require('./invoicePaymentAllocationService');

/**
 * Cash Receipt Service
 * Requirement 1: Cash Receipt Management with invoice-wise allocation
 */
class CashReceiptService {
  async createCashReceipt(receiptData) {
    return this.createReceipt(receiptData, receiptData.createdBy);
  }

  async getAllCashReceipts(filters = {}, options = {}) {
    return this.getReceipts({
      ...filters,
      dateFrom: filters.dateFrom || filters.startDate,
      dateTo: filters.dateTo || filters.endDate,
    }, options);
  }

  async getCashReceiptById(id) {
    return this.getReceiptById(id);
  }

  async updateCashReceipt(id, receiptData) {
    const existing = await CashReceipt.findById(id);
    if (!existing) {
      throw new Error('Cash receipt not found');
    }

    const protectedFields = [
      'amount',
      'customerId',
      'cashAccountId',
      'cashAccount',
      'paymentMethod',
      'invoiceAllocations',
      'allocations',
      'receiptDate',
    ];
    const changesProtectedAccounting = protectedFields.some((field) => receiptData[field] !== undefined);
    if (changesProtectedAccounting) {
      throw new Error('Accounting fields cannot be edited after posting. Cancel and recreate the receipt.');
    }

    const receipt = await CashReceipt.findByIdAndUpdate(id, receiptData, {
      new: true,
      runValidators: true,
    });
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }
    return receipt;
  }

  async clearCashReceipt(id, userId) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    if (typeof receipt.clearReceipt === 'function') {
      return receipt.clearReceipt();
    }
    receipt.status = 'cleared';
    receipt.clearedDate = new Date();
    receipt.clearedBy = userId;
    return receipt.save();
  }

  async cancelCashReceipt(id, userId, reason = 'Cash receipt cancelled') {
    const session = await mongoose.startSession();
    let receipt;

    try {
      await session.withTransaction(async () => {
        receipt = await CashReceipt.findById(id).session(session);
        if (!receipt) {
          throw new Error('Receipt not found');
        }
        if (receipt.status === 'cancelled') {
          throw new Error('Receipt is already cancelled');
        }

        await this.reverseReceiptEffects(receipt, userId || receipt.createdBy, reason, { session });

        receipt.status = 'cancelled';
        receipt.cancellationReason = reason;
        receipt.cancelledAt = new Date();
        receipt.cancelledBy = userId;
        await receipt.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return receipt;
  }

  async getPendingReceipts() {
    return CashReceipt.findPendingReceipts();
  }

  async getReceiptStatistics(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
      query.receiptDate = {};
      if (startDate) query.receiptDate.$gte = startDate;
      if (endDate) query.receiptDate.$lte = endDate;
    }

    const byStatus = await CashReceipt.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const total = await CashReceipt.countDocuments(query);
    return { total, byStatus };
  }

  /**
   * Create cash receipt with invoice allocation
   * @param {Object} receiptData - Receipt data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created receipt
   */
  async createReceipt(receiptData, userId) {
    const {
      customerId,
      receiptDate,
      amount,
      paymentMethod,
      bankDetails,
      chequeDetails,
      cashAccountId,
      cashAccount,
      notes,
      description,
    } = receiptData;
    const selectedPaymentMethod = paymentMethod || 'cash';
    const selectedBankDetails = bankDetails || chequeDetails;
    const invoiceAllocations = receiptData.invoiceAllocations || receiptData.allocations || [];

    const session = await mongoose.startSession();
    let receipt;

    try {
      await session.withTransaction(async () => {
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
          throw new Error('Customer not found');
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
            if (invoice.customerId.toString() !== customerId.toString()) {
              throw new Error(`Invoice ${invoice.invoiceNumber} does not belong to selected customer`);
            }
            const allocationAmount = Number(allocation.amount || 0);
            if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
              throw new Error('Allocation amount must be greater than 0');
            }
            totalAllocated += allocationAmount;
          }
        }

        if (totalAllocated > Number(amount || 0)) {
          throw new Error('Total allocated amount cannot exceed receipt amount');
        }

        const difference = amount - totalAllocated;
        const receiptNumber = await this.generateReceiptNumber();

        [receipt] = await CashReceipt.create([{
          receiptNumber,
          customerId,
          cashAccountId: cashLedgerAccount._id,
          receiptDate: receiptDate || new Date(),
          amount,
          paymentMethod: selectedPaymentMethod,
          bankDetails: selectedPaymentMethod === 'cheque' ? selectedBankDetails : undefined,
          invoiceAllocations: invoiceAllocations || [],
          totalAllocated,
          difference,
          notes: notes || description || '',
          description: description || notes || '',
          status: selectedPaymentMethod === 'cheque' && (selectedBankDetails?.isPostDated || receiptData.postDatedCheque) ? 'pending' : 'cleared',
          postDatedCheque: Boolean(receiptData.postDatedCheque || selectedBankDetails?.isPostDated),
          createdBy: userId,
        }], { session });

        if (invoiceAllocations && invoiceAllocations.length > 0) {
          await this.updateInvoicePayments(invoiceAllocations, { session });
        }

        await this.createLedgerEntries(receipt, userId, { session });
      });
    } finally {
      await session.endSession();
    }

    return receipt;
  }

  /**
   * Generate unique receipt number
   * @returns {Promise<string>} Receipt number
   */
  async generateReceiptNumber() {
    return counterService.nextSequence('CR', CashReceipt, 'receiptNumber');
  }

  /**
   * Update invoice payment status based on allocations
   * @param {Array} allocations - Invoice allocations
   */
  async updateInvoicePayments(allocations, options = {}) {
    await applyInvoiceAllocations(allocations, options);
  }

  /**
   * Create ledger entries for cash receipt
   * @param {Object} receipt - Receipt object
   * @param {string} userId - User ID
   */
  async createLedgerEntries(receipt, userId, options = {}) {
    const description = `Cash Receipt ${receipt.receiptNumber} - ${receipt.notes || 'Payment received'}`;

    // Debit Cash/Bank Account
    const debitAccount = {
      accountId: receipt.cashAccountId,
      accountType: 'Account',
    };

    // Credit Customer Account
    const creditAccount = {
      accountId: receipt.customerId,
      accountType: 'Customer',
    };

    await ledgerService.createDoubleEntry(
      debitAccount,
      creditAccount,
      receipt.amount,
      description,
      'cash_receipt',
      receipt._id,
      userId,
      options,
    );
  }

  /**
   * Get all cash receipts with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated receipts
   */
  async getReceipts(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-receiptDate' } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters.dateFrom || filters.dateTo) {
      query.receiptDate = {};
      if (filters.dateFrom) query.receiptDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.receiptDate.$lte = new Date(filters.dateTo);
    }

    const [receipts, total] = await Promise.all([
      CashReceipt.find(query)
        .populate('customerId', 'name code')
        .populate('cashAccountId', 'name code balance')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CashReceipt.countDocuments(query),
    ]);

    return {
      receipts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get receipt by ID
   * @param {string} id - Receipt ID
   * @returns {Promise<Object>} Receipt
   */
  async getReceiptById(id) {
    const receipt = await CashReceipt.findById(id)
      .populate('customerId', 'name code contactPerson phone')
      .populate('cashAccountId', 'name code balance')
      .populate('invoiceAllocations.invoiceId', 'invoiceNumber invoiceDate totals')
      .populate('createdBy', 'username email');

    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    return receipt;
  }

  async recordPostDatedCheque(receiptData) {
    return this.createReceipt({
      ...receiptData,
      paymentMethod: 'cheque',
      postDatedCheque: true,
    }, receiptData.createdBy);
  }

  async clearCheque(id, userId) {
    return this.clearPDC(id, userId);
  }

  async bounceCheque(id, reason, userId) {
    return this.bouncePDC(id, reason, userId);
  }

  async getPendingPostDatedCheques() {
    return this.getPendingPDCs();
  }

  async applyPaymentToInvoices(receiptData) {
    return this.createReceipt(receiptData, receiptData.createdBy);
  }

  /**
   * Get pending PDCs
   * @returns {Promise<Array>} Pending PDCs
   */
  async getPendingPDCs() {
    return await CashReceipt.find({
      paymentMethod: 'cheque',
      postDatedCheque: true,
      status: 'pending',
    })
      .populate('customerId', 'name code')
      .populate('cashAccountId', 'name code balance')
      .sort({ 'bankDetails.chequeDate': 1 })
      .lean();
  }

  /**
   * Clear PDC
   * @param {string} id - Receipt ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated receipt
   */
  async clearPDC(id, userId) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (receipt.status !== 'pending') {
      throw new Error('Receipt is not pending');
    }

    receipt.status = 'cleared';
    receipt.chequeStatus = 'cleared';
    receipt.clearedDate = new Date();
    receipt.clearedBy = userId;
    await receipt.save();

    return receipt;
  }

  /**
   * Mark PDC as bounced
   * @param {string} id - Receipt ID
   * @param {string} reason - Bounce reason
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated receipt
   */
  async bouncePDC(id, reason, userId) {
    const session = await mongoose.startSession();
    let receipt;

    try {
      await session.withTransaction(async () => {
        receipt = await CashReceipt.findById(id).session(session);
        if (!receipt) {
          throw new Error('Receipt not found');
        }
        if (receipt.status === 'bounced') {
          throw new Error('Receipt is already bounced');
        }
        if (receipt.status === 'cancelled') {
          throw new Error('Cancelled receipt cannot be bounced');
        }

        await this.reverseReceiptEffects(receipt, userId || receipt.createdBy, reason || 'Cheque bounced', { session });

        receipt.status = 'bounced';
        receipt.chequeStatus = 'bounced';
        receipt.bounceReason = reason;
        receipt.bouncedDate = new Date();
        receipt.bouncedBy = userId;
        await receipt.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return receipt;
  }

  async reverseReceiptEffects(receipt, userId, reason, options = {}) {
    if (receipt.invoiceAllocations && receipt.invoiceAllocations.length > 0) {
      await this.reverseInvoicePayments(receipt.invoiceAllocations, options);
    }

    try {
      await ledgerService.reverseLedgerEntries('cash_receipt', receipt._id, reason, userId, options);
    } catch (error) {
      if (!error.message.includes('No ledger entries found')) {
        throw error;
      }
    }
  }

  /**
   * Reverse invoice payments
   * @param {Array} allocations - Invoice allocations
   */
  async reverseInvoicePayments(allocations, options = {}) {
    await reverseInvoiceAllocations(allocations, options);
  }

  /**
   * Get outstanding invoices for customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Outstanding invoices
   */
  async getOutstandingInvoices(customerId) {
    return await Invoice.find({
      customerId,
      type: 'sales',
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] },
    })
      .select('invoiceNumber invoiceDate totals')
      .sort({ invoiceDate: 1 })
      .lean();
  }
}

module.exports = new CashReceiptService();
