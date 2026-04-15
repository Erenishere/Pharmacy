const BankReconciliation = require('../models/BankReconciliation');
const CashReceipt = require('../models/CashReceipt');
const CashPayment = require('../models/CashPayment');

/**
 * Bank Reconciliation Service
 * Requirement 5: Bank Reconciliation
 */
class BankReconciliationService {
  /**
   * Perform bank reconciliation
   * @param {Object} reconciliationData - Reconciliation data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reconciliation result
   */
  async reconcile(reconciliationData, userId) {
    const {
      bankAccountId,
      reconciliationDate,
      bankBalance,
      bookBalance,
      unclearedCheques,
      unclearedDeposits,
      notes,
    } = reconciliationData;

    // Calculate reconciled balance
    const totalUnclearedCheques = unclearedCheques.reduce((sum, item) => sum + item.amount, 0);
    const totalUnclearedDeposits = unclearedDeposits.reduce((sum, item) => sum + item.amount, 0);
    const reconciledBalance = bankBalance + totalUnclearedDeposits - totalUnclearedCheques;

    const reconciliation = await BankReconciliation.create({
      bankAccountId,
      reconciliationDate: reconciliationDate || new Date(),
      bankBalance,
      bookBalance,
      unclearedCheques,
      unclearedDeposits,
      totalUnclearedCheques,
      totalUnclearedDeposits,
      reconciledBalance,
      difference: Math.abs(reconciledBalance - bookBalance),
      notes: notes || '',
      status: Math.abs(reconciledBalance - bookBalance) < 0.01 ? 'reconciled' : 'pending',
      createdBy: userId,
    });

    return reconciliation;
  }

  /**
   * Get uncleared items for bank account
   * @param {string} bankAccountId - Bank account ID
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Object>} Uncleared items
   */
  async getUnclearedItems(bankAccountId, asOfDate) {
    const date = asOfDate || new Date();

    // Get uncleared cheques (payments)
    const unclearedCheques = await CashPayment.find({
      paymentMethod: 'cheque',
      status: 'pending',
      paymentDate: { $lte: date },
    })
      .populate('supplierId', 'name')
      .select('paymentNumber paymentDate amount supplierId chequeDetails')
      .lean();

    // Get uncleared deposits (receipts)
    const unclearedDeposits = await CashReceipt.find({
      paymentMethod: 'cheque',
      status: 'pending',
      receiptDate: { $lte: date },
    })
      .populate('customerId', 'name')
      .select('receiptNumber receiptDate amount customerId chequeDetails')
      .lean();

    return {
      unclearedCheques: unclearedCheques.map((c) => ({
        referenceNumber: c.paymentNumber,
        date: c.paymentDate,
        amount: c.amount,
        party: c.supplierId?.name,
        chequeNumber: c.chequeDetails?.chequeNumber,
      })),
      unclearedDeposits: unclearedDeposits.map((d) => ({
        referenceNumber: d.receiptNumber,
        date: d.receiptDate,
        amount: d.amount,
        party: d.customerId?.name,
        chequeNumber: d.chequeDetails?.chequeNumber,
      })),
    };
  }

  /**
   * Get reconciliation history
   * @param {string} bankAccountId - Bank account ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Reconciliation history
   */
  async getReconciliationHistory(bankAccountId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const query = bankAccountId ? { bankAccountId } : {};

    const [reconciliations, total] = await Promise.all([
      BankReconciliation.find(query)
        .populate('bankAccountId', 'name code')
        .populate('createdBy', 'username')
        .sort({ reconciliationDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BankReconciliation.countDocuments(query),
    ]);

    return {
      reconciliations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new BankReconciliationService();
