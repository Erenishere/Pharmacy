const SubCategory = require('../models/subcategory');
const Category = require('../models/category');
const Item = require('../models/Item');

class SubCategoryService {
  async createSubCategory(data, userId) {
    if (!data.name) throw new Error('Sub-category name is required');
    if (!data.categoryId) throw new Error('Category reference is required');

    const category = await Category.findById(data.categoryId);
    if (!category) throw new Error('Invalid category reference');

    const existing = await SubCategory.findOne({ name: new RegExp(`^${data.name}$`, 'i'), categoryId: data.categoryId });
    if (existing) throw new Error('Sub-category with this name already exists in this category');

    const subCategory = new SubCategory(data);
    await subCategory.save();
    return this.getSubCategoryById(subCategory._id);
  }

  async getSubCategories(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.keyword) query.name = new RegExp(filters.keyword, 'i');
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.categoryId) query.categoryId = filters.categoryId;

    const [subCategories, total] = await Promise.all([
      SubCategory.find(query).populate('categoryId', 'name').sort(sort).skip(skip)
        .limit(limit)
        .lean(),
      SubCategory.countDocuments(query),
    ]);

    return {
      subCategories,
      pagination: {
        totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1,
      },
    };
  }

  async getSubCategoryById(id) {
    const subCategory = await SubCategory.findById(id).populate('categoryId', 'name').lean();
    if (!subCategory) throw new Error('Sub-category not found');
    return subCategory;
  }

  async getSubCategoriesByCategory(categoryId) {
    return SubCategory.find({ categoryId, isActive: true }).sort({ name: 1 }).lean();
  }

  async updateSubCategory(id, updateData, userId) {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) throw new Error('Sub-category not found');

    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      if (!category) throw new Error('Invalid category reference');
    }

    if (updateData.name || updateData.categoryId) {
      const checkName = updateData.name || subCategory.name;
      const checkCategoryId = updateData.categoryId || subCategory.categoryId;
      const existing = await SubCategory.findOne({ name: new RegExp(`^${checkName}$`, 'i'), categoryId: checkCategoryId, _id: { $ne: id } });
      if (existing) throw new Error('Sub-category with this name already exists in this category');
    }

    Object.assign(subCategory, updateData);
    subCategory.updatedAt = Date.now();
    await subCategory.save();
    return this.getSubCategoryById(id);
  }

  async deleteSubCategory(id) {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) throw new Error('Sub-category not found');

    const itemCount = await Item.countDocuments({ subCategoryId: id });
    if (itemCount > 0) throw new Error('Cannot delete sub-category with associated items. Please reassign items first.');

    subCategory.isActive = false;
    subCategory.updatedAt = Date.now();
    await subCategory.save();
    return this.getSubCategoryById(id);
  }

  async toggleSubCategoryStatus(id) {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) throw new Error('Sub-category not found');

    subCategory.isActive = !subCategory.isActive;
    subCategory.updatedAt = Date.now();
    await subCategory.save();
    return this.getSubCategoryById(id);
  }
}

module.exports = new SubCategoryService();
