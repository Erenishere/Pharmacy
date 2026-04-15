const Business = require('../models/business');
const Item = require('../models/Item');

class BusinessTypeService {
  async createBusinessType(data, userId) {
    if (!data.name) throw new Error('Business type name is required');
    const existing = await Business.findOne({ name: new RegExp(`^${data.name}$`, 'i') });
    if (existing) throw new Error('Business type with this name already exists');
    const businessType = new Business(data);
    await businessType.save();
    return this.getBusinessTypeById(businessType._id);
  }

  async getBusinessTypes(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.keyword) query.name = new RegExp(filters.keyword, 'i');
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    const [businessTypes, total] = await Promise.all([Business.find(query).sort(sort).skip(skip).limit(limit)
      .lean(), Business.countDocuments(query)]);
    return {
      businessTypes,
      pagination: {
        totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1,
      },
    };
  }

  async getBusinessTypeById(id) {
    const businessType = await Business.findById(id).lean();
    if (!businessType) throw new Error('Business type not found');
    return businessType;
  }

  async updateBusinessType(id, updateData, userId) {
    const businessType = await Business.findById(id);
    if (!businessType) throw new Error('Business type not found');
    if (updateData.name && updateData.name !== businessType.name) {
      const existing = await Business.findOne({ name: new RegExp(`^${updateData.name}$`, 'i'), _id: { $ne: id } });
      if (existing) throw new Error('Business type with this name already exists');
    }
    Object.assign(businessType, updateData);
    businessType.updatedAt = Date.now();
    await businessType.save();
    return this.getBusinessTypeById(id);
  }

  async deleteBusinessType(id) {
    const businessType = await Business.findById(id);
    if (!businessType) throw new Error('Business type not found');
    const itemCount = await Item.countDocuments({ businessTypeId: id });
    if (itemCount > 0) throw new Error('Cannot delete business type with associated items. Please reassign items first.');
    businessType.isActive = false;
    businessType.updatedAt = Date.now();
    await businessType.save();
    return this.getBusinessTypeById(id);
  }

  async toggleBusinessTypeStatus(id) {
    const businessType = await Business.findById(id);
    if (!businessType) throw new Error('Business type not found');
    businessType.isActive = !businessType.isActive;
    businessType.updatedAt = Date.now();
    await businessType.save();
    return this.getBusinessTypeById(id);
  }
}

module.exports = new BusinessTypeService();
