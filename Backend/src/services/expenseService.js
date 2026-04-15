const Expense = require('../models/Expense');
const Account = require('../models/Account');
const ledgerService = require('./ledgerService');

class ExpenseService {
  async createExpense(data, userId) {
    const { date, categoryId, accountId, cashAccountId, amount, detail, dimensionId } = data;

    if (!date || !categoryId || !accountId || !cashAccountId || !amount) {
      throw new Error('All required fields must be provided');
    }

    if (amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const cashAccount = await Account.findById(cashAccountId);
    if (!cashAccount) throw new Error('Cash account not found');

    const expenseAccount = await Account.findById(accountId);
    if (!expenseAccount) throw new Error('Expense account not found');

    const expense = await Expense.create({
      date,
      categoryId,
      accountId,
      cashAccountId,
      amount,
      detail,
      dimensionId: dimensionId || undefined,
      createdBy: userId,
    });

    // Debit expense account, Credit cash account
    await ledgerService.createEntry({
      accountId,
      accountType: 'Account',
      entryType: 'debit',
      amount,
      description: `Expense: ${detail || 'N/A'}`,
      referenceType: 'expense',
      referenceId: expense._id,
      transactionDate: date,
      createdBy: userId,
    });

    await ledgerService.createEntry({
      accountId: cashAccountId,
      accountType: 'Account',
      entryType: 'credit',
      amount,
      description: `Expense: ${detail || 'N/A'}`,
      referenceType: 'expense',
      referenceId: expense._id,
      transactionDate: date,
      createdBy: userId,
    });

    await Account.findByIdAndUpdate(cashAccountId, { $inc: { balance: -amount } });
    await Account.findByIdAndUpdate(accountId, { $inc: { balance: amount } });

    return expense;
  }

  async getExpenses(filters = {}, options = {}) {
    const query = {};

    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.dimensionId) query.dimensionId = filters.dimensionId;
    if (filters.accountId) query.accountId = filters.accountId;

    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.date.$lte = new Date(filters.toDate);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('categoryId', 'categoryName')
        .populate('accountId', 'name code')
        .populate('cashAccountId', 'name code')
        .populate('dimensionId', 'name')
        .populate('createdBy', 'username')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query),
    ]);

    return {
      expenses,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getExpenseById(id) {
    const expense = await Expense.findById(id)
      .populate('categoryId', 'categoryName')
      .populate('accountId', 'name code')
      .populate('cashAccountId', 'name code')
      .populate('dimensionId', 'name')
      .populate('createdBy', 'username');

    if (!expense) throw new Error('Expense not found');
    return expense;
  }

  async updateExpense(id, updates, userId) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error('Expense not found');

    const allowedUpdates = ['date', 'categoryId', 'detail', 'dimensionId'];
    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) updateData[field] = updates[field];
    });

    Object.assign(expense, updateData);
    await expense.save();
    return expense;
  }

  async deleteExpense(id) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error('Expense not found');
    await Expense.findByIdAndDelete(id);
    return { message: 'Expense deleted successfully' };
  }
}

module.exports = new ExpenseService();
