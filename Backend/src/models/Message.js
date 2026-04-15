const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for fast message history retrieval
messageSchema.index({ channelId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
