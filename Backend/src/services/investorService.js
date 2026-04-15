const Account = require('../models/Account');
const Capital = require('../models/Capital');

/**
 * Investor Service
 * Handles business logic for investor account management
 */
class InvestorService {
  /**
   * Create investor account
   * @param {Object} investorData - Investor account data
   * @returns {Promise<Object>} Created investor account
   */
  async createInvestor(investorData) {
    const {
      name, code, contactPerson, phone, email, address, openingBalance = 0,
    } = investorData;

    // Create investor account in chart of accounts
    const investorAccount = new Account({
      code,
      name,
      type: 'equity',
      category: 'capital',
      parentAccount: null,
      balance: openingBalance,
      isActive: true,
      metadata: {
        contactPerson,
        phone,
        email,
        address,
        accountType: 'investor',
      },
    });

    await investorAccount.save();

    return investorAccount;
  }

  /**
   * Get all investors
   * @returns {Promise<Array>} List of investors
   */
  async getAllInvestors() {
    const investors = await Account.find({
      type: 'equity',
      category: 'capital',
      'metadata.accountType': 'investor',
    }).sort({ code: 1 });

    return investors;
  }

  /**
   * Get investor by ID
   * @param {string} investorId - Investor account ID
   * @returns {Promise<Object>} Investor account
   */
  async getInvestorById(investorId) {
    const investor = await Account.findById(investorId);

    if (!investor || investor.metadata?.accountType !== 'investor') {
      throw new Error('Investor not found');
    }

    return investor;
  }

  /**
   * Update investor account
   * @param {string} investorId - Investor account ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated investor account
   */
  async updateInvestor(investorId, updateData) {
    const investor = await this.getInvestorById(investorId);

    const {
      name, contactPerson, phone, email, address,
    } = updateData;

    if (name) investor.name = name;
    if (contactPerson) investor.metadata.contactPerson = contactPerson;
    if (phone) investor.metadata.phone = phone;
    if (email) investor.metadata.email = email;
    if (address) investor.metadata.address = address;

    await investor.save();

    return investor;
  }

  /**
   * Delete investor account
   * @param {string} investorId - Investor account ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteInvestor(investorId) {
    const investor = await this.getInvestorById(investorId);

    // Check if investor has any capital transactions
    const capitalTransactions = await Capital.countDocuments({ investorId });

    if (capitalTransactions > 0) {
      throw new Error('Cannot delete investor with existing capital transactions');
    }

    investor.isActive = false;
    await investor.save();

    return { message: 'Investor account deactivated successfully' };
  }

  /**
   * Get investor statement
   * @param {string} investorId - Investor account ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Investor statement
   */
  async getInvestorStatement(investorId, startDate, endDate) {
    const investor = await this.getInvestorById(investorId);

    const capitalTransactions = await Capital.find({
      investorId,
      transactionDate: { $gte: startDate, $lte: endDate },
    }).sort({ transactionDate: 1 });

    let runningBalance = investor.balance;

    const transactions = capitalTransactions.map((txn) => {
      const amount = txn.transactionType === 'asset_in' ? txn.amount : -txn.amount;
      runningBalance += amount;

      return {
        date: txn.transactionDate,
        description: txn.description,
        type: txn.transactionType,
        amount: txn.amount,
        balance: runningBalance,
      };
    });

    return {
      investor: {
        id: investor._id,
        name: investor.name,
        code: investor.code,
      },
      period: { startDate, endDate },
      openingBalance: investor.balance,
      transactions,
      closingBalance: runningBalance,
    };
  }
}

module.exports = new InvestorService();
