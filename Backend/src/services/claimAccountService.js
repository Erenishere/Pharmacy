const ClaimAccount = require('../models/ClaimAccount');
const Scheme = require('../models/Scheme');
const ledgerService = require('./ledgerService');

/**
 * Claim Account Service
 * Requirement 1: Claim Account Creation and Management
 */
class ClaimAccountService {
  /**
   * Create claim account
   * @param {Object} accountData - Account data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created claim account
   */
  async createClaimAccount(accountData, userId) {
    const { claimAccountName, createdDate } = accountData;

    // Check for duplicate name
    const existing = await ClaimAccount.findOne({ claimAccountName });
    if (existing) {
      throw new Error('Claim account with this name already exists');
    }

    const claimAccount = await ClaimAccount.create({
      claimAccountName,
      createdDate: createdDate || new Date(),
      status: 'active',
      currentBalance: 0,
      createdBy: userId,
    });

    return claimAccount;
  }

  /**
   * Get all claim accounts
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Claim accounts
   */
  async getClaimAccounts(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;

    return await ClaimAccount.find(query)
      .populate('createdBy', 'username')
      .sort({ createdDate: -1 })
      .lean();
  }

  /**
   * Get claim account by ID
   * @param {string} id - Claim account ID
   * @returns {Promise<Object>} Claim account
   */
  async getClaimAccountById(id) {
    const claimAccount = await ClaimAccount.findById(id)
      .populate('createdBy', 'username email');

    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    return claimAccount;
  }

  /**
   * Update claim account
   * @param {string} id - Claim account ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated claim account
   */
  async updateClaimAccount(id, updates) {
    const claimAccount = await ClaimAccount.findById(id);
    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    if (updates.claimAccountName) {
      const existing = await ClaimAccount.findOne({
        claimAccountName: updates.claimAccountName,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Claim account with this name already exists');
      }
      claimAccount.claimAccountName = updates.claimAccountName;
    }

    if (updates.status) {
      claimAccount.status = updates.status;
    }

    await claimAccount.save();
    return claimAccount;
  }

  /**
   * Toggle claim account status
   * @param {string} id - Claim account ID
   * @returns {Promise<Object>} Updated claim account
   */
  async toggleStatus(id) {
    const claimAccount = await ClaimAccount.findById(id);
    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    claimAccount.status = claimAccount.status === 'active' ? 'inactive' : 'active';
    await claimAccount.save();

    return claimAccount;
  }

  /**
   * Delete claim account
   * @param {string} id - Claim account ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteClaimAccount(id) {
    // Check if any schemes are linked
    const schemesCount = await Scheme.countDocuments({ claimAccountId: id });
    if (schemesCount > 0) {
      throw new Error('Cannot delete claim account with linked schemes');
    }

    await ClaimAccount.findByIdAndDelete(id);
    return { message: 'Claim account deleted successfully' };
  }

  /**
   * Get claim account balance
   * @param {string} id - Claim account ID
   * @returns {Promise<number>} Current balance
   */
  async getBalance(id) {
    const claimAccount = await ClaimAccount.findById(id);
    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    return claimAccount.currentBalance;
  }

  /**
   * Post amount to claim account
   * @param {string} id - Claim account ID
   * @param {number} amount - Amount to post
   * @param {string} description - Description
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated claim account
   */
  async postToClaim(id, amount, description, referenceType, referenceId, userId) {
    const claimAccount = await ClaimAccount.findById(id);
    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    // Update balance
    claimAccount.currentBalance += amount;
    await claimAccount.save();

    // Create ledger entry
    await ledgerService.createEntry({
      accountId: id,
      accountType: 'ClaimAccount',
      entryType: 'debit',
      amount,
      description,
      referenceType,
      referenceId,
      transactionDate: new Date(),
      createdBy: userId,
    });

    return claimAccount;
  }

  /**
   * Settle claim
   * @param {string} id - Claim account ID
   * @param {number} amount - Settlement amount
   * @param {Date} settlementDate - Settlement date
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated claim account
   */
  async settleClaim(id, amount, settlementDate, userId) {
    const claimAccount = await ClaimAccount.findById(id);
    if (!claimAccount) {
      throw new Error('Claim account not found');
    }

    if (amount > claimAccount.currentBalance) {
      throw new Error('Settlement amount exceeds current balance');
    }

    // Update balance
    claimAccount.currentBalance -= amount;
    await claimAccount.save();

    // Create ledger entry
    await ledgerService.createEntry({
      accountId: id,
      accountType: 'ClaimAccount',
      entryType: 'credit',
      amount,
      description: `Claim settlement - ${claimAccount.claimAccountName}`,
      referenceType: 'claim_settlement',
      referenceId: id,
      transactionDate: settlementDate || new Date(),
      createdBy: userId,
    });

    return claimAccount;
  }
}

module.exports = new ClaimAccountService();
