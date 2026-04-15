const Capital = require('../models/Capital');
const Account = require('../models/Account');
const ledgerService = require('./ledgerService');

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
    if (transactionType === 'out' && cashAccount.currentBalance < amount) {
      throw new Error('Insufficient cash balance for withdrawal');
    }

    // Calculate effective amount
    const effectiveAmount = transactionType === 'in' ? amount : -amount;

    // Determine status based on request body, default to 'Investor'
    const finalStatus = ['Proprietor', 'Investor'].includes(status) ? status : 'Investor';

    // Create capital entry
    const capital = await Capital.create({
      capitalDate,
      capitalAssetName,
      cashAccountId,
      cashAccountName: cashAccount.accountName,
      cashAccountBalance: cashAccount.currentBalance,
      investorAccountId,
      investorAccountName: investorAccount.accountName,
      investorAccountBalance: investorAccount.currentBalance,
      transactionType,
      amount,
      effectiveAmount,
      detailReference,
      status: finalStatus,
      createdBy: userId,
    });

    // Create ledger entries
    if (transactionType === 'in') {
      // Asset In: Debit Cash, Credit Investor
      await ledgerService.createEntry({
        accountId: cashAccountId,
        accountType: 'Account',
        entryType: 'debit',
        amount,
        description: `Capital In: ${capitalAssetName}`,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      await ledgerService.createEntry({
        accountId: investorAccountId,
        accountType: 'Account',
        entryType: 'credit',
        amount,
        description: `Capital In: ${capitalAssetName}`,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      // Update balances
      await Account.findByIdAndUpdate(cashAccountId, { $inc: { currentBalance: amount } });
      await Account.findByIdAndUpdate(investorAccountId, { $inc: { currentBalance: amount } });
    } else {
      // Asset Out: Credit Cash, Debit Investor
      await ledgerService.createEntry({
        accountId: cashAccountId,
        accountType: 'Account',
        entryType: 'credit',
        amount,
        description: `Capital Out: ${capitalAssetName}`,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      await ledgerService.createEntry({
        accountId: investorAccountId,
        accountType: 'Account',
        entryType: 'debit',
        amount,
        description: `Capital Out: ${capitalAssetName}`,
        referenceType: 'capital',
        referenceId: capital._id,
        transactionDate: capitalDate,
        createdBy: userId,
      });

      // Update balances
      await Account.findByIdAndUpdate(cashAccountId, { $inc: { currentBalance: -amount } });
      await Account.findByIdAndUpdate(investorAccountId, { $inc: { currentBalance: -amount } });
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
        .populate('cashAccountId', 'accountName currentBalance')
        .populate('investorAccountId', 'accountName currentBalance')
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
      .populate('cashAccountId', 'accountName currentBalance')
      .populate('investorAccountId', 'accountName currentBalance')
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

    // Note: Deleting requires reversing ledger entries and updating balances
    // For production, implement proper reversal logic
    await Capital.findByIdAndDelete(id);

    return { message: 'Capital entry deleted successfully' };
  }

  /**
   * Get capital statement
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Object>} Capital statement
   */
  async getCapitalStatement(asOfDate) {
    // This would integrate with other services to calculate complete capital position
    // For now, return basic structure
    return {
      asOfDate,
      bankCash: 0,
      cashInHand: 0,
      stockValue: 0,
      receivables: 0,
      payables: 0,
      fixedAssets: 0,
      netCapital: 0,
    };
  }
}

module.exports = new CapitalService();
