const mongoose = require('mongoose');

const matchQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  gameName: {
    type: String,
    default: '' // Empty means "General"
  },
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Auto-remove from queue after 5 minutes
  }
});

module.exports = mongoose.model('MatchQueue', matchQueueSchema);
