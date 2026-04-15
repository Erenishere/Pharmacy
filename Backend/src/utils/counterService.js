const mongoose = require('mongoose');

/**
 * Atomic counter service for generating sequential document numbers.
 * Replaces race-prone findOne().sort() pattern with atomic $inc operations.
 */

const counterSchema = new mongoose.Schema({
  _id: { type: String }, // e.g. "CR2025", "CP2025", "CA2025", "EO2025"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Get the next sequence number atomically.
 * On first call for a year, seeds from existing document count to ensure continuity.
 *
 * @param {string} prefix - e.g. 'CR', 'CP', 'CA', 'EO', 'QT'
 * @param {mongoose.Model} Model - Mongoose model to seed from on first use
 * @param {string} fieldName - Field name storing the number (e.g. 'receiptNumber')
 * @returns {Promise<string>} e.g. "CR2026000001"
 */
async function nextSequence(prefix, Model, fieldName) {
  const year = new Date().getFullYear();
  const id = `${prefix}${year}`;

  // Attempt atomic increment
  let counter = await Counter.findOneAndUpdate(
    { _id: id },
    { $inc: { seq: 1 } },
    { new: true, upsert: false },
  );

  if (!counter) {
    // First use this year: seed from existing documents for continuity
    const existing = await Model.countDocuments({
      [fieldName]: { $regex: `^${id}` },
    });
    counter = await Counter.findOneAndUpdate(
      { _id: id },
      { $setOnInsert: { seq: existing + 1 } },
      { new: true, upsert: true },
    );
  }

  return `${id}${String(counter.seq).padStart(6, '0')}`;
}

module.exports = { nextSequence };
