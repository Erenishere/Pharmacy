const Letter = require('../models/Letter');

class LetterService {
  async createLetter(data, userId) {
    const { date, letterType, accountId, subject, content, attachmentPath, status } = data;

    if (!letterType || !subject || !content) {
      throw new Error('Letter type, subject, and content are required');
    }

    return await Letter.create({
      date: date || new Date(),
      letterType,
      accountId: accountId || undefined,
      subject,
      content,
      attachmentPath,
      status: status || 'Draft',
      createdBy: userId,
    });
  }

  async getLetters(filters = {}, options = {}) {
    const query = {};

    if (filters.letterType) query.letterType = filters.letterType;
    if (filters.status) query.status = filters.status;
    if (filters.accountId) query.accountId = filters.accountId;

    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.date.$lte = new Date(filters.toDate);
    }

    if (filters.search) {
      query.$or = [
        { subject: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    const [letters, total] = await Promise.all([
      Letter.find(query)
        .populate('accountId', 'name code')
        .populate('createdBy', 'username')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Letter.countDocuments(query),
    ]);

    return {
      letters,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLetterById(id) {
    const letter = await Letter.findById(id)
      .populate('accountId', 'name code')
      .populate('createdBy', 'username');
    if (!letter) throw new Error('Letter not found');
    return letter;
  }

  async updateLetter(id, updates, userId) {
    const letter = await Letter.findById(id);
    if (!letter) throw new Error('Letter not found');

    const allowedUpdates = ['date', 'letterType', 'accountId', 'subject', 'content', 'attachmentPath', 'status'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) letter[field] = updates[field];
    });

    await letter.save();
    return letter;
  }

  async deleteLetter(id) {
    const letter = await Letter.findById(id);
    if (!letter) throw new Error('Letter not found');
    await Letter.findByIdAndDelete(id);
    return { message: 'Letter deleted successfully' };
  }
}

module.exports = new LetterService();
