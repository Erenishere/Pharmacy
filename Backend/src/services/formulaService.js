const Formula = require('../models/formula');
const FormulaSize = require('../models/formulasize');
const Item = require('../models/Item');

class FormulaService {
  async createFormula(data, userId) {
    if (!data.name) throw new Error('Formula name is required');
    const existing = await Formula.findOne({ name: new RegExp(`^${data.name}$`, 'i') });
    if (existing) throw new Error('Formula with this name already exists');
    const formula = new Formula(data);
    await formula.save();
    return this.getFormulaById(formula._id);
  }

  async getFormulas(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.keyword) query.$or = [{ name: new RegExp(filters.keyword, 'i') }, { composition: new RegExp(filters.keyword, 'i') }];
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    const [formulas, total] = await Promise.all([Formula.find(query).sort(sort).skip(skip).limit(limit)
      .lean(), Formula.countDocuments(query)]);
    return {
      formulas,
      pagination: {
        totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1,
      },
    };
  }

  async getFormulaById(id) {
    const formula = await Formula.findById(id).lean();
    if (!formula) throw new Error('Formula not found');
    return formula;
  }

  async updateFormula(id, updateData, userId) {
    const formula = await Formula.findById(id);
    if (!formula) throw new Error('Formula not found');
    if (updateData.name && updateData.name !== formula.name) {
      const existing = await Formula.findOne({ name: new RegExp(`^${updateData.name}$`, 'i'), _id: { $ne: id } });
      if (existing) throw new Error('Formula with this name already exists');
    }
    Object.assign(formula, updateData);
    formula.updatedAt = Date.now();
    await formula.save();
    return this.getFormulaById(id);
  }

  async deleteFormula(id) {
    const formula = await Formula.findById(id);
    if (!formula) throw new Error('Formula not found');
    const itemCount = await Item.countDocuments({ formulaId: id });
    if (itemCount > 0) throw new Error('Cannot delete formula with associated items. Please reassign items first.');
    const sizeCount = await FormulaSize.countDocuments({ formulaId: id });
    if (sizeCount > 0) throw new Error('Cannot delete formula with associated sizes. Please delete sizes first.');
    formula.isActive = false;
    formula.updatedAt = Date.now();
    await formula.save();
    return this.getFormulaById(id);
  }

  async toggleFormulaStatus(id) {
    const formula = await Formula.findById(id);
    if (!formula) throw new Error('Formula not found');
    formula.isActive = !formula.isActive;
    formula.updatedAt = Date.now();
    await formula.save();
    return this.getFormulaById(id);
  }
}

module.exports = new FormulaService();
