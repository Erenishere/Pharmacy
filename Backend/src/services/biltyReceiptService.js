const BiltyReceipt = require('../models/BiltyReceipt');

const NUG_TYPES = ['Single', 'Double', 'Triple', 'Bundle of 4', 'Single Kata', 'Double Kata'];
const NUG_MULTIPLIERS = { Single: 1, Double: 2, Triple: 3, 'Bundle of 4': 4, 'Single Kata': 6, 'Double Kata': 12 };

class BiltyReceiptService {
  async create(data, userId) {
    // Compute totalLooseNug for each nugDetail row
    const nugDetail = (data.nugDetail || []).map(row => ({
      nugType: row.nugType,
      qtyNug: row.qtyNug || 0,
      totalLooseNug: (row.qtyNug || 0) * (NUG_MULTIPLIERS[row.nugType] || 1),
    }));

    const totalNug = nugDetail.reduce((sum, r) => sum + r.totalLooseNug, 0);

    const doc = new BiltyReceipt({
      ...data,
      nugDetail,
      totalNug: data.totalNug || totalNug,
      createdBy: userId,
    });

    await doc.save();
    return doc.populate([
      { path: 'partyId', select: 'name town' },
      { path: 'claimAccountId', select: 'name' },
      { path: 'createdBy', select: 'name username' },
    ]);
  }

  async getAll(filters = {}, options = {}) {
    const query = {};
    if (filters.biltyType) query.biltyType = filters.biltyType;
    if (filters.status) query.status = filters.status;
    if (filters.partyId) query.partyId = filters.partyId;
    if (filters.fromDate || filters.toDate) {
      query.biltyDate = {};
      if (filters.fromDate) query.biltyDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.biltyDate.$lte = new Date(filters.toDate);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      BiltyReceipt.find(query)
        .populate('partyId', 'name town')
        .populate('claimAccountId', 'name')
        .populate('createdBy', 'name username')
        .sort({ biltyDate: -1 })
        .skip(skip)
        .limit(limit),
      BiltyReceipt.countDocuments(query),
    ]);

    return {
      data: records,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id) {
    const doc = await BiltyReceipt.findById(id)
      .populate('partyId', 'name town')
      .populate('claimAccountId', 'name')
      .populate('createdBy', 'name username');
    if (!doc) throw new Error('Bilty receipt not found');
    return doc;
  }

  async update(id, data) {
    if (data.nugDetail) {
      data.nugDetail = data.nugDetail.map(row => ({
        nugType: row.nugType,
        qtyNug: row.qtyNug || 0,
        totalLooseNug: (row.qtyNug || 0) * (NUG_MULTIPLIERS[row.nugType] || 1),
      }));
      data.totalNug = data.nugDetail.reduce((sum, r) => sum + r.totalLooseNug, 0);
    }

    const doc = await BiltyReceipt.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('partyId', 'name town')
      .populate('claimAccountId', 'name')
      .populate('createdBy', 'name username');
    if (!doc) throw new Error('Bilty receipt not found');
    return doc;
  }

  async updateStatus(id, status) {
    if (!['pending', 'received', 'sent'].includes(status)) {
      throw new Error('Status must be one of: pending, received, sent');
    }

    const doc = await BiltyReceipt.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .populate('partyId', 'name town')
      .populate('claimAccountId', 'name')
      .populate('createdBy', 'name username');
    if (!doc) throw new Error('Bilty receipt not found');
    return doc;
  }

  async delete(id) {
    const doc = await BiltyReceipt.findByIdAndDelete(id);
    if (!doc) throw new Error('Bilty receipt not found');
    return doc;
  }

  getDefaultNugDetail() {
    return NUG_TYPES.map(nugType => ({ nugType, qtyNug: 0, totalLooseNug: 0 }));
  }
}

module.exports = new BiltyReceiptService();
