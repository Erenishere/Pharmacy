const CashReceipt = require('../models/CashReceipt');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Account = require('../models/Account');
const ledgerService = require('./ledgerService');
const counterService = require('../utils/counterService');

/**
 * Cash Receipt Service
 * Requirement 1: Cash Receipt Management with invoice-wise allocation
 */
class CashReceiptService {
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
      chequeDetails,
      invoiceAllocations,
      cashAccountId,
      notes,
    } = receiptData;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate cash account
    const cashAccount = await Account.findById(cashAccountId);
    if (!cashAccount) {
      throw new Error('Cash account not found');
    }

    // Validate invoice allocations
    let totalAllocated = 0;
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      for (const allocation of invoiceAllocations) {
        const invoice = await Invoice.findById(allocation.invoiceId);
        if (!invoice) {
          throw new Error(`Invoice ${allocation.invoiceId} not found`);
        }
        if (invoice.customerId.toString() !== customerId.toString()) {
          throw new Error(`Invoice ${invoice.invoiceNumber} does not belong to selected customer`);
        }
        totalAllocated += allocation.amount;
      }
    }

    // Calculate difference (advance/short)
    const difference = amount - totalAllocated;

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber();

    // Create receipt
    const receipt = await CashReceipt.create({
      receiptNumber,
      customerId,
      cashAccountId,
      receiptDate: receiptDate || new Date(),
      amount,
      paymentMethod: paymentMethod || 'cash',
      chequeDetails: paymentMethod === 'cheque' ? chequeDetails : undefined,
      invoiceAllocations: invoiceAllocations || [],
      totalAllocated,
      difference,
      notes: notes || '',
      status: paymentMethod === 'cheque' && chequeDetails?.isPostDated ? 'pending' : 'cleared',
      createdBy: userId,
    });

    // Update invoice payment status
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      await this.updateInvoicePayments(invoiceAllocations);
    }

    // Create ledger entries
    await this.createLedgerEntries(receipt, userId);

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
   * Create ledger entries for cash receipt
   * @param {Object} receipt - Receipt object
   * @param {string} userId - User ID
   */
  async createLedgerEntries(receipt, userId) {
    const description = `Cash Receipt ${receipt.receiptNumber} - ${receipt.notes || 'Payment received'}`;

    // Debit Cash/Bank Account
    const debitAccount = {
      accountId: receipt.paymentMethod === 'cheque' ? 'BANK_ACCOUNT' : 'CASH_ACCOUNT',
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
      .populate('invoiceAllocations.invoiceId', 'invoiceNumber invoiceDate totals')
      .populate('createdBy', 'username email');

    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    return receipt;
  }

  /**
   * Get pending PDCs
   * @returns {Promise<Array>} Pending PDCs
   */
  async getPendingPDCs() {
    return await CashReceipt.find({
      paymentMethod: 'cheque',
      'chequeDetails.isPostDated': true,
      status: 'pending',
    })
      .populate('customerId', 'name code')
      .sort({ 'chequeDetails.chequeDate': 1 })
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
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    receipt.status = 'bounced';
    receipt.bounceReason = reason;
    receipt.bouncedDate = new Date();
    receipt.bouncedBy = userId;
    await receipt.save();

    // Reverse invoice payments
    if (receipt.invoiceAllocations && receipt.invoiceAllocations.length > 0) {
      await this.reverseInvoicePayments(receipt.invoiceAllocations);
    }

    return receipt;
  }

  /**
   * Reverse invoice payments
   * @param {Array} allocations - Invoice allocations
   */
  async reverseInvoicePayments(allocations) {
    for (const allocation of allocations) {
      const invoice = await Invoice.findById(allocation.invoiceId);
      if (!invoice) continue;

      const paidAmount = Math.max(0, (invoice.paidAmount || 0) - allocation.amount);
      const dueAmount = invoice.totals.grandTotal - paidAmount;

      let paymentStatus = 'pending';
      if (paidAmount > 0) {
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
      .select('invoiceNumber invoiceDate totals paidAmount dueAmount')
      .sort({ invoiceDate: 1 })
      .lean();
  }
}

module.exports = new CashReceiptService();
