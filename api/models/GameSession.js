const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameName: {
    type: String,
    required: true
  },
  processName: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // saniye cinsinden
    default: 0
  },
  // Analitik için:
  startHour: Number, // 0-23
  dayOfWeek: Number, // 0-6 (Pazar-Cumartesi)
  isNightSession: Boolean 
});

module.exports = mongoose.model('GameSession', gameSessionSchema);

