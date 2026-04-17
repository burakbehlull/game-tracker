const mongoose = require('mongoose');

const adminLoginAttemptSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  attemptTime: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 dakika sonra otomatik silinir
  },
  success: {
    type: Boolean,
    default: false
  }
});

// Compound index for efficient queries
adminLoginAttemptSchema.index({ username: 1, attemptTime: -1 });

module.exports = mongoose.model('AdminLoginAttempt', adminLoginAttemptSchema);
