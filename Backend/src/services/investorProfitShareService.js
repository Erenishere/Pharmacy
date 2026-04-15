const InvestorProfitShare = require('../models/InvestorProfitShare');
const Capital = require('../models/Capital');
const Account = require('../models/Account');

class InvestorProfitShareService {
  async createProfitShare(data, userId) {
    const { periodFrom, periodTo, totalProfit, distributionDate, details } = data;

    if (!periodFrom || !periodTo || totalProfit === undefined || !details || !details.length) {
      throw new Error('Period, total profit, and distribution details are required');
    }

    // Validate share percentages sum to 100
    const totalPercent = details.reduce((sum, d) => sum + (d.sharePercent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error('Share percentages must sum to 100%');
    }

    return await InvestorProfitShare.create({
      periodFrom,
      periodTo,
      totalProfit,
      distributionDate: distributionDate || new Date(),
      details,
      createdBy: userId,
    });
  }

  async getProfitShares(filters = {}, options = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;

    if (filters.fromDate || filters.toDate) {
      query.periodFrom = {};
      if (filters.fromDate) query.periodFrom.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.periodFrom.$lte = new Date(filters.toDate);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [profitShares, total] = await Promise.all([
      InvestorProfitShare.find(query)
        .populate('details.investorAccountId', 'name code')
        .populate('createdBy', 'username')
        .sort({ distributionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvestorProfitShare.countDocuments(query),
    ]);

    return {
      profitShares,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProfitShareById(id) {
    const profitShare = await InvestorProfitShare.findById(id)
      .populate('details.investorAccountId', 'name code balance')
      .populate('createdBy', 'username');
    if (!profitShare) throw new Error('Profit share record not found');
    return profitShare;
  }

  async distributeProfitShare(id, userId) {
    const profitShare = await InvestorProfitShare.findById(id);
    if (!profitShare) throw new Error('Profit share record not found');
    if (profitShare.status === 'Distributed') throw new Error('Already distributed');

    // Update investor account balances
    for (const detail of profitShare.details) {
      await Account.findByIdAndUpdate(detail.investorAccountId, {
        $inc: { balance: detail.profitAmount },
      });
    }

    profitShare.status = 'Distributed';
    profitShare.distributionDate = new Date();
    await profitShare.save();
    return profitShare;
  }

  async deleteProfitShare(id) {
    const profitShare = await InvestorProfitShare.findById(id);
    if (!profitShare) throw new Error('Profit share record not found');
    if (profitShare.status === 'Distributed') throw new Error('Cannot delete distributed profit share');
    await InvestorProfitShare.findByIdAndDelete(id);
    return { message: 'Profit share deleted successfully' };
  }

  async calculateShares(totalProfit) {
    // Get all investor capital contributions
    const capitalEntries = await Capital.aggregate([
      { $match: { transactionType: 'in' } },
      {
        $group: {
          _id: '$investorAccountId',
          totalContribution: { $sum: '$effectiveAmount' },
        },
      },
    ]);

    const grandTotal = capitalEntries.reduce((sum, e) => sum + e.totalContribution, 0);

    if (grandTotal === 0) return [];

    return capitalEntries.map((entry) => ({
      investorAccountId: entry._id,
      capitalContribution: entry.totalContribution,
      sharePercent: parseFloat(((entry.totalContribution / grandTotal) * 100).toFixed(2)),
      profitAmount: parseFloat(((entry.totalContribution / grandTotal) * totalProfit).toFixed(2)),
    }));
  }
}

module.exports = new InvestorProfitShareService();
