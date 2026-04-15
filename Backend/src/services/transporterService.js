const Transporter = require('../models/Transporter');

class TransporterService {
  async createTransporter(data, userId) {
    if (!data.name) throw new Error('Transporter name is required');
    const transporter = new Transporter({ ...data, createdBy: userId });
    await transporter.save();
    return this.getTransporterById(transporter._id);
  }

  async getTransporters(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = { name: 1 } } = options;
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.keyword) query.$or = [{ name: new RegExp(filters.keyword, 'i') }, { code: new RegExp(filters.keyword, 'i') }];
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    const [transporters, total] = await Promise.all([Transporter.find(query).sort(sort).skip(skip).limit(limit)
      .lean(), Transporter.countDocuments(query)]);
    return {
      transporters,
      pagination: {
        totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1,
      },
    };
  }

  async getTransporterById(id) {
    const transporter = await Transporter.findById(id).lean();
    if (!transporter) throw new Error('Transporter not found');
    return transporter;
  }

  async updateTransporter(id, updateData, userId) {
    const transporter = await Transporter.findById(id);
    if (!transporter) throw new Error('Transporter not found');
    Object.assign(transporter, updateData);
    transporter.updatedAt = Date.now();
    await transporter.save();
    return this.getTransporterById(id);
  }

  async deleteTransporter(id) {
    const transporter = await Transporter.findById(id);
    if (!transporter) throw new Error('Transporter not found');
    transporter.isActive = false;
    transporter.updatedAt = Date.now();
    await transporter.save();
    return this.getTransporterById(id);
  }

  async toggleTransporterStatus(id) {
    const transporter = await Transporter.findById(id);
    if (!transporter) throw new Error('Transporter not found');
    transporter.isActive = !transporter.isActive;
    transporter.updatedAt = Date.now();
    await transporter.save();
    return this.getTransporterById(id);
  }
}

module.exports = new TransporterService();
