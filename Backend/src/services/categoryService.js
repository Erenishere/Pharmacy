const Category = require('../models/category');
const SubCategory = require('../models/subcategory');
const Item = require('../models/Item');

/**
 * Category Service
 * Handles business logic for category management
 * Requirements: 7.1-7.7
 */
class CategoryService {
  async createCategory(categoryData, userId) {
    if (!categoryData.name) {
      throw new Error('Category name is required');
    }

    const existingCategory = await Category.findOne({
      name: new RegExp(`^${categoryData.name}$`, 'i'),
    });

    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    if (categoryData.parentCategoryId) {
      const parentCategory = await Category.findById(categoryData.parentCategoryId);
      if (!parentCategory) {
        throw new Error('Invalid parent category reference');
      }
    }

    const category = new Category(categoryData);
    await category.save();
    return this.getCategoryById(category._id);
  }

  async getCategories(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.keyword) {
      query.name = new RegExp(filters.keyword, 'i');
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.parentCategoryId !== undefined) {
      query.parentCategoryId = filters.parentCategoryId;
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate('parentCategoryId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
    ]);

    return {
      categories,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async getCategoryById(id) {
    const category = await Category.findById(id)
      .populate('parentCategoryId', 'name')
      .lean();

    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  }

  async getCategoryHierarchy() {
    return Category.getHierarchy();
  }

  async updateCategory(id, updateData, userId) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({
        name: new RegExp(`^${updateData.name}$`, 'i'),
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }
    }

    Object.assign(category, updateData);
    category.updatedAt = Date.now();
    await category.save();
    return this.getCategoryById(id);
  }

  async deleteCategory(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    const itemCount = await Item.countDocuments({ categoryId: id });
    if (itemCount > 0) {
      throw new Error('Cannot delete category with associated items. Please reassign items first.');
    }

    const subCategoryCount = await SubCategory.countDocuments({ categoryId: id });
    if (subCategoryCount > 0) {
      throw new Error('Cannot delete category with associated sub-categories. Please delete sub-categories first.');
    }

    category.isActive = false;
    category.updatedAt = Date.now();
    await category.save();
    return this.getCategoryById(id);
  }

  async toggleCategoryStatus(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    category.isActive = !category.isActive;
    category.updatedAt = Date.now();
    await category.save();
    return this.getCategoryById(id);
  }
}

module.exports = new CategoryService();
