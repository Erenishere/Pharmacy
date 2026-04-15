const CashAdjustment = require('../models/CashAdjustment');
const Account = require('../models/Account');
const User = require('../models/User');
const ledgerService = require('./ledgerService');
const counterService = require('../utils/counterService');

/**
 * Cash Adjustment Service
 * Requirement 4: Cash Adjustment for internal transfers
 */
class CashAdjustmentService {
  /**
   * Create cash adjustment
   * @param {Object} adjustmentData - Adjustment data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created adjustment
   */
  async createAdjustment(adjustmentData, userId) {
    const {
      adjustmentDate,
      adjustmentType,
      fromAccountId,
      toAccountId,
      amount,
      detailReference,
      notes,
    } = adjustmentData;

    // Validate adjustment type
    const validTypes = ['account_to_account', 'user_to_user', 'employee_adjustment'];
    if (!validTypes.includes(adjustmentType)) {
      throw new Error('Invalid adjustment type');
    }

    // Validate accounts/users based on type
    if (adjustmentType === 'account_to_account') {
      const fromAccount = await Account.findById(fromAccountId);
      const toAccount = await Account.findById(toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error('Invalid account(s)');
      }
    } else if (adjustmentType === 'user_to_user') {
      const fromUser = await User.findById(fromAccountId);
      const toUser = await User.findById(toAccountId);
      if (!fromUser || !toUser) {
        throw new Error('Invalid user(s)');
      }
    }

    // Generate adjustment number
    const adjustmentNumber = await this.generateAdjustmentNumber();

    // Create adjustment
    const adjustment = await CashAdjustment.create({
      adjustmentNumber,
      adjustmentDate: adjustmentDate || new Date(),
      adjustmentType,
      fromAccountId,
      toAccountId,
      amount,
      detailReference: detailReference || '',
      notes: notes || '',
      status: 'completed',
      createdBy: userId,
    });

    // Create ledger entries
    await this.createLedgerEntries(adjustment, userId);

    return adjustment;
  }

  /**
   * Generate unique adjustment number
   * @returns {Promise<string>} Adjustment number
   */
  async generateAdjustmentNumber() {
    return counterService.nextSequence('CA', CashAdjustment, 'adjustmentNumber');
  }

  /**
   * Create ledger entries for cash adjustment
   * @param {Object} adjustment - Adjustment object
   * @param {string} userId - User ID
   */
  async createLedgerEntries(adjustment, userId) {
    const description = `Cash Adjustment ${adjustment.adjustmentNumber} - ${adjustment.detailReference || adjustment.notes}`;

    const debitAccountType = (adjustment.adjustmentType === 'user_to_user' || adjustment.adjustmentType === 'employee_adjustment') ? 'User' : 'Account';
    const creditAccountType = adjustment.adjustmentType === 'user_to_user' ? 'User' : 'Account';

    const debitAccount = {
      accountId: adjustment.toAccountId,
      accountType: debitAccountType,
    };

    const creditAccount = {
      accountId: adjustment.fromAccountId,
      accountType: creditAccountType,
    };

    await ledgerService.createDoubleEntry(
      debitAccount,
      creditAccount,
      adjustment.amount,
      description,
      'cash_adjustment',
      adjustment._id,
      userId,
    );
  }

  /**
   * Get all cash adjustments with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated adjustments
   */
  async getAdjustments(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-adjustmentDate' } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.adjustmentType) query.adjustmentType = filters.adjustmentType;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.adjustmentDate = {};
      if (filters.dateFrom) query.adjustmentDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.adjustmentDate.$lte = new Date(filters.dateTo);
    }

    const [adjustments, total] = await Promise.all([
      CashAdjustment.find(query)
        .populate('fromAccountId')
        .populate('toAccountId')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CashAdjustment.countDocuments(query),
    ]);

    return {
      adjustments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get adjustment by ID
   * @param {string} id - Adjustment ID
   * @returns {Promise<Object>} Adjustment
   */
  async getAdjustmentById(id) {
    const adjustment = await CashAdjustment.findById(id)
      .populate('fromAccountId')
      .populate('toAccountId')
      .populate('createdBy', 'username email');

    if (!adjustment) {
      throw new Error('Cash adjustment not found');
    }

    return adjustment;
  }
}

module.exports = new CashAdjustmentService();
