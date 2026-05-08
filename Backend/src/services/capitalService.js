const Capital = require('../models/Capital');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const ledgerService = require('./ledgerService');
const ledgerRepository = require('../repositories/ledgerRepository');

const getAccountName = (account) => account?.accountName || account?.name || account?.code || 'Unknown Account';
const getAccountBalance = (account) => {
  if (typeof account?.balance === 'number') return account.balance;
  if (typeof account?.currentBalance === 'number') return account.currentBalance;
  return 0;
};
const toSignedAmount = (capital) => {
  if (typeof capital.effectiveAmount === 'number' && capital.effectiveAmount !== 0) {
    return capital.effectiveAmount;
  }
  return capital.transactionType === 'out' ? -Math.abs(capital.amount || 0) : Math.abs(capital.amount || 0);
};
const isBankAccount = (account) => {
  const haystack = [account?.name, account?.accountName, account?.code].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes('bank');
};

/**
 * Capital Service
 * Handles business logic for capital asset management
 */
class CapitalService {
  /**
   * Create capital entry
   * @param {Object} capitalData - Capital entry data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created capital entry
   */
  async createCapitalEntry(capitalData, userId) {
    const {
      capitalDate,
      capitalAssetName,
      cashAccountId,
      investorAccountId,
      transactionType,
      amount,
      detailReference,
      status,
    } = capitalData;

    // Validate required fields
    if (!capitalDate || !capitalAssetName || !cashAccountId || !investorAccountId || !transactionType || !amount) {
      throw new Error('All required fields must be provided');
    }

    // Validate amount is positive
    if (amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Validate transaction type
    if (!['in', 'out'].includes(transactionType)) {
      throw new Error('Transaction type must be "in" or "out"');
    }

    // Verify cash account exists
    const cashAccount = await Account.findById(cashAccountId);
    if (!cashAccount) {
      throw new Error('Cash account not found');
    }

    // Verify investor account exists
    const investorAccount = await Account.findById(investorAccountId);
    if (!investorAccount) {
      throw new Error('Investor account not found');
    }

    // Check cash balance for 'out' transactions
    const normalizedAmount = Number(amount);
    const cashBalance = getAccountBalance(cashAccount);
    const investorBalance = getAccountBalance(investorAccount);

    if (transactionType === 'out' && cashBalance < normalizedAmount) {
      throw new Error('Insufficient cash balance for withdrawal');
    }

    // Calculate effective amount
    const effectiveAmount = transactionType === 'in' ? normalizedAmount : -normalizedAmount;

    // Determine status based on request body, default to 'Investor'
    const finalStatus = ['Proprietor', 'Investor'].includes(status) ? status : 'Investor';

    // Create capital entry
    const capital = await Capital.create({
      capitalDate,
      capitalAssetName,
      cashAccountId,
      cashAccountName: getAccountName(cashAccount),
      cashAccountBalance: cashBalance,
      investorAccountId,
      investorAccountName: getAccountName(investorAccount),
      investorAccountBalance: investorBalance,
      transactionType,
      amount: normalizedAmount,
      effectiveAmount,
      detailReference,
      status: finalStatus,
      createdBy: userId,
    });

    const description = `Capital ${transactionType === 'in' ? 'In' : 'Out'}: ${capitalAssetName}`;

    // Create ledger entries
    if (transactionType === 'in') {
      // Asset In: Debit Cash, Credit Investor
      await ledgerService.createLedgerEntry({
        accountId: cashAccountId,
        accountType: 'Account',
        transactionType: 'debit',
        amount: normalizedAmount,
        description,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      await ledgerService.createLedgerEntry({
        accountId: investorAccountId,
        accountType: 'Account',
        transactionType: 'credit',
        amount: normalizedAmount,
        description,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      // Update balances
      await Account.findByIdAndUpdate(cashAccountId, { $inc: { balance: normalizedAmount } });
      await Account.findByIdAndUpdate(investorAccountId, { $inc: { balance: normalizedAmount } });
    } else {
      // Asset Out: Debit Investor, Credit Cash
      await ledgerService.createLedgerEntry({
        accountId: investorAccountId,
        accountType: 'Account',
        transactionType: 'debit',
        amount: normalizedAmount,
        description,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      await ledgerService.createLedgerEntry({
        accountId: cashAccountId,
        accountType: 'Account',
        transactionType: 'credit',
        amount: normalizedAmount,
        description,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      // Update balances
      await Account.findByIdAndUpdate(cashAccountId, { $inc: { balance: -normalizedAmount } });
      await Account.findByIdAndUpdate(investorAccountId, { $inc: { balance: -normalizedAmount } });
    }

    return capital;
  }

  /**
   * Get capital entries with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Capital entries with pagination
   */
  async getCapitalEntries(filters = {}, options = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.investorAccountId) query.investorAccountId = filters.investorAccountId;

    if (filters.fromDate || filters.toDate) {
      query.capitalDate = {};
      if (filters.fromDate) query.capitalDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.capitalDate.$lte = new Date(filters.toDate);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [capitals, total] = await Promise.all([
      Capital.find(query)
        .populate('cashAccountId', 'name code balance')
        .populate('investorAccountId', 'name code balance')
        .populate('createdBy', 'username')
        .sort({ capitalDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Capital.countDocuments(query),
    ]);

    return {
      capitals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get capital entry by ID
   * @param {string} id - Capital ID
   * @returns {Promise<Object>} Capital entry
   */
  async getCapitalById(id) {
    const capital = await Capital.findById(id)
      .populate('cashAccountId', 'name code balance')
      .populate('investorAccountId', 'name code balance')
      .populate('createdBy', 'username email');

    if (!capital) {
      throw new Error('Capital entry not found');
    }

    return capital;
  }

  /**
   * Update capital entry
   * @param {string} id - Capital ID
   * @param {Object} updates - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated capital entry
   */
  async updateCapitalEntry(id, updates, userId) {
    const capital = await Capital.findById(id);
    if (!capital) {
      throw new Error('Capital entry not found');
    }

    // Note: Updating capital entries requires reversing and recreating ledger entries
    // For simplicity, only allow updating non-financial fields
    const allowedUpdates = ['capitalAssetName', 'detailReference'];
    const updateData = {};

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    Object.assign(capital, updateData);
    capital.updatedAt = Date.now();
    await capital.save();

    return capital;
  }

  /**
   * Delete capital entry
   * @param {string} id - Capital ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCapitalEntry(id, userId) {
    const capital = await Capital.findById(id);
    if (!capital) {
      throw new Error('Capital entry not found');
    }

    const signedAmount = toSignedAmount(capital);
    const reversalDelta = Math.abs(signedAmount);

    if (signedAmount >= 0) {
      await Account.findByIdAndUpdate(capital.cashAccountId, { $inc: { balance: -reversalDelta } });
      await Account.findByIdAndUpdate(capital.investorAccountId, { $inc: { balance: -reversalDelta } });
    } else {
      await Account.findByIdAndUpdate(capital.cashAccountId, { $inc: { balance: reversalDelta } });
      await Account.findByIdAndUpdate(capital.investorAccountId, { $inc: { balance: reversalDelta } });
    }

    await ledgerRepository.deleteByReference('capital', capital._id);
    await Capital.findByIdAndDelete(id);

    return { message: 'Capital entry deleted successfully' };
  }

  /**
   * Get capital statement
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Object>} Capital statement
   */
  async getCapitalStatement(asOfDate) {
    const capitalEntries = await Capital.find({
      capitalDate: { $lte: asOfDate },
    })
      .populate('cashAccountId', 'name code balance')
      .populate('investorAccountId', 'name code balance')
      .sort({ capitalDate: 1, createdAt: 1 })
      .lean();

    let totalCapitalIn = 0;
    let totalCapitalOut = 0;
    let proprietorCapital = 0;
    let investorCapital = 0;
    let runningCapital = 0;

    const runningCapitalList = capitalEntries.map((entry) => {
      const signedAmount = toSignedAmount(entry);
      runningCapital += signedAmount;

      if (signedAmount >= 0) {
        totalCapitalIn += signedAmount;
      } else {
        totalCapitalOut += Math.abs(signedAmount);
      }

      if (entry.status === 'Proprietor') {
        proprietorCapital += signedAmount;
      } else {
        investorCapital += signedAmount;
      }

      return {
        ...entry,
        signedAmount,
        runningCapital,
      };
    });

    const fixedCapitalList = runningCapitalList
      .filter((entry) => entry.signedAmount > 0)
      .map((entry) => ({
        _id: entry._id,
        capitalDate: entry.capitalDate,
        capitalAssetName: entry.capitalAssetName,
        amount: entry.amount,
        status: entry.status,
        cashAccountName: entry.cashAccountName || getAccountName(entry.cashAccountId),
        investorAccountName: entry.investorAccountName || getAccountName(entry.investorAccountId),
      }));

    const cashAccountIds = [...new Set(capitalEntries.map((entry) => entry.cashAccountId?._id?.toString() || entry.cashAccountId?.toString()).filter(Boolean))];
    const cashAccounts = cashAccountIds.length > 0
      ? await Account.find({ _id: { $in: cashAccountIds } }).select('name code balance').lean()
      : [];

    const cashBreakdown = cashAccounts.reduce((acc, account) => {
      const balance = getAccountBalance(account);
      if (isBankAccount(account)) {
        acc.bankCash += balance;
      } else {
        acc.cashInHand += balance;
      }
      return acc;
    }, { bankCash: 0, cashInHand: 0 });

    const inventoryRows = await Inventory.find({ quantity: { $gt: 0 } })
      .populate('item', 'pricing.costPrice')
      .lean();
    const stockValue = inventoryRows.reduce(
      (sum, row) => sum + (row.quantity * (row.item?.pricing?.costPrice || 0)),
      0,
    );

    let receivables = 0;
    let payables = 0;
    try {
      receivables = (await ledgerService.getCustomerReceivablesAging(asOfDate)).summary.total || 0;
    } catch (error) {
      receivables = 0;
    }
    try {
      payables = (await ledgerService.getSupplierPayables(asOfDate)).summary.total || 0;
    } catch (error) {
      payables = 0;
    }

    return {
      asOfDate,
      bankCash: Math.round(cashBreakdown.bankCash * 100) / 100,
      cashInHand: Math.round(cashBreakdown.cashInHand * 100) / 100,
      stockValue: Math.round(stockValue * 100) / 100,
      receivables: Math.round(receivables * 100) / 100,
      payables: Math.round(payables * 100) / 100,
      fixedAssets: Math.round(totalCapitalIn * 100) / 100,
      netCapital: Math.round(runningCapital * 100) / 100,
      capitalSummary: {
        totalCapitalIn: Math.round(totalCapitalIn * 100) / 100,
        totalCapitalOut: Math.round(totalCapitalOut * 100) / 100,
        runningCapital: Math.round(runningCapital * 100) / 100,
        proprietorCapital: Math.round(proprietorCapital * 100) / 100,
        investorCapital: Math.round(investorCapital * 100) / 100,
        totalEntries: runningCapitalList.length,
      },
      cashAccounts: cashAccounts.map((account) => ({
        accountId: account._id,
        accountName: getAccountName(account),
        code: account.code,
        balance: Math.round(getAccountBalance(account) * 100) / 100,
        accountBucket: isBankAccount(account) ? 'bankCash' : 'cashInHand',
      })),
      fixedCapitalList,
      runningCapitalList,
    };
  }
}

module.exports = new CapitalService();
