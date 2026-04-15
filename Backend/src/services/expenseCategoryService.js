const ExpenseCategory = require('../models/ExpenseCategory');

class ExpenseCategoryService {
  async createCategory(data) {
    if (!data.categoryName) throw new Error('Category name is required');
    return await ExpenseCategory.create(data);
  }

  async getCategories(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    return await ExpenseCategory.find(query).sort({ categoryName: 1 }).lean();
  }

  async getCategoryById(id) {
    const category = await ExpenseCategory.findById(id);
    if (!category) throw new Error('Expense category not found');
    return category;
  }

  async updateCategory(id, updates) {
    const category = await ExpenseCategory.findById(id);
    if (!category) throw new Error('Expense category not found');

    if (updates.categoryName) category.categoryName = updates.categoryName;
    if (updates.status) category.status = updates.status;

    await category.save();
    return category;
  }

  async deleteCategory(id) {
    const category = await ExpenseCategory.findById(id);
    if (!category) throw new Error('Expense category not found');
    await ExpenseCategory.findByIdAndDelete(id);
    return { message: 'Expense category deleted successfully' };
  }
}

module.exports = new ExpenseCategoryService();
