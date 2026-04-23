const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  globalName: {
    type: String,
    required: false,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: [String],
    enum: ['user', 'admin', 'moderator'],
    default: ['user']
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  verificationCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  tokenVersion: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  // XP & Level Sistemi
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  // Günlük Görev Sistemi
  dailyChallenges: [
    {
      id: { type: String },
      type: { type: String }, // 'play_time', 'different_games', 'night_owl', etc.
      title: { type: String },
      description: { type: String },
      goal: { type: Number },
      current: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      xpReward: { type: Number },
      requirements: { type: mongoose.Schema.Types.Mixed } // Ek veriler için
    }
  ],
  lastChallengeReset: {
    type: Date,
    default: null
  },
  // Kişiselleştirme & Ayarlar
  settings: {
    theme: {
      type: String,
      default: 'dark' // dark, neon, retro
    },
    notificationSound: {
      type: String,
      default: 'default'
    },
    discordRPCEnabled: {
      type: Boolean,
      default: true
    },
    // Akıllı Zamanlayıcı Ayarları
    timer: {
      globalLimitMinutes: {
        type: Number,
        default: 0 // 0 = limit yok
      },
      gameSpecificLimits: {
        type: Map,
        of: Number,
        default: {}
      },
      autoQuit: {
        type: Boolean,
        default: false
      }
    },
    // Gizlilik Ayarları
    privacy: {
      disabledTrackingGames: {
        type: [String],
        default: []
      },
      hiddenGames: {
        type: [String],
        default: []
      },
      passiveMatchmakingEnabled: {
        type: Boolean,
        default: true
      }
    }
  },
  blockedUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  // Oyun Kütüphanesi
  library: [
    {
      gameName: { type: String, required: true },
      exeName: { type: String, default: '' }, // Takip edilecek exe adı (örn: Valorant.exe)
      exePath: { type: String, default: '' }, // Oyunun tam yolu (başlatmak için)
      genre: { type: String, default: 'Genel' }, // Oyun türü (Fps, Çiftçi Oyunu vb.)
      addedAt: { type: Date, default: Date.now }
    }
  ],
  // Rozetler & Başarımlar
  badges: {
    type: [String],
    default: []
  },
  stats: {
    totalChallengesCompleted: { type: Number, default: 0 },
    consecutiveLoginDays: { type: Number, default: 0 },
    lastLoginDate: { type: Date, default: null },
    totalPlayTimeMinutes: { type: Number, default: 0 },
    differentGamesPlayed: { type: [String], default: [] }
  }
});

// Şifre hashleme
userSchema.index({ 'library.gameName': 1 });
userSchema.index({ 'settings.privacy.passiveMatchmakingEnabled': 1 });
userSchema.index({ xp: -1 }); // Liderlik tabloları için
userSchema.index({ level: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Şifre karşılaştırma
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ blockedUsers: 1 });

module.exports = mongoose.model('User', userSchema);
