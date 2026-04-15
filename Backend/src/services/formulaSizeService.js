const FormulaSize = require('../models/formulasize');
const Formula = require('../models/formula');
const Item = require('../models/Item');

class FormulaSizeService {
  async createFormulaSize(data, userId) {
    if (!data.size) throw new Error('Size is required');
    if (!data.formulaId) throw new Error('Formula reference is required');
    const formula = await Formula.findById(data.formulaId);
    if (!formula) throw new Error('Invalid formula reference');
    const existing = await FormulaSize.findOne({ formulaId: data.formulaId, size: new RegExp(`^${data.size}$`, 'i') });
    if (existing) throw new Error('Formula size already exists for this formula');
    const formulaSize = new FormulaSize(data);
    await formulaSize.save();
    return this.getFormulaSizeById(formulaSize._id);
  }

  async getFormulaSizes(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { size: 1 } } = options;
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.keyword) query.size = new RegExp(filters.keyword, 'i');
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.formulaId) query.formulaId = filters.formulaId;
    const [formulaSizes, total] = await Promise.all([FormulaSize.find(query).populate('formulaId', 'name composition').sort(sort).skip(skip)
      .limit(limit)
      .lean(), FormulaSize.countDocuments(query)]);
    return {
      formulaSizes,
      pagination: {
        totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1,
      },
    };
  }

  async getFormulaSizeById(id) {
    const formulaSize = await FormulaSize.findById(id).populate('formulaId', 'name composition').lean();
    if (!formulaSize) throw new Error('Formula size not found');
    return formulaSize;
  }

  async getFormulaSizesByFormula(formulaId) {
    return FormulaSize.find({ formulaId, isActive: true }).sort({ size: 1 }).lean();
  }

  async updateFormulaSize(id, updateData, userId) {
    const formulaSize = await FormulaSize.findById(id);
    if (!formulaSize) throw new Error('Formula size not found');
    if (updateData.formulaId) {
      const formula = await Formula.findById(updateData.formulaId);
      if (!formula) throw new Error('Invalid formula reference');
    }
    if (updateData.size || updateData.formulaId) {
      const checkSize = updateData.size || formulaSize.size;
      const checkFormulaId = updateData.formulaId || formulaSize.formulaId;
      const existing = await FormulaSize.findOne({ formulaId: checkFormulaId, size: new RegExp(`^${checkSize}$`, 'i'), _id: { $ne: id } });
      if (existing) throw new Error('Formula size already exists for this formula');
    }
    Object.assign(formulaSize, updateData);
    formulaSize.updatedAt = Date.now();
    await formulaSize.save();
    return this.getFormulaSizeById(id);
  }

  async deleteFormulaSize(id) {
    const formulaSize = await FormulaSize.findById(id);
    if (!formulaSize) throw new Error('Formula size not found');
    const itemCount = await Item.countDocuments({ formulaSizeId: id });
    if (itemCount > 0) throw new Error('Cannot delete formula size with associated items. Please reassign items first.');
    formulaSize.isActive = false;
    formulaSize.updatedAt = Date.now();
    await formulaSize.save();
    return this.getFormulaSizeById(id);
  }

  async toggleFormulaSizeStatus(id) {
    const formulaSize = await FormulaSize.findById(id);
    if (!formulaSize) throw new Error('Formula size not found');
    formulaSize.isActive = !formulaSize.isActive;
    formulaSize.updatedAt = Date.now();
    await formulaSize.save();
    return this.getFormulaSizeById(id);
  }
}

module.exports = new FormulaSizeService();
