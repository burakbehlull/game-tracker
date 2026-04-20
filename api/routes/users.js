const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const BadgeService = require('../services/badgeService');

const ChallengeService = require('../services/challengeService');

// Badges definitions
router.get('/badges/all', async (req, res) => {
  res.json(BadgeService.getAllBadges());
});

// Me
router.get('/me', auth, async (req, res) => {
  try {
    // Rozetleri kontrol et
    const BadgeService = require('../services/badgeService');
    await BadgeService.checkBadges(req.userId);

    const user = await User.findById(req.userId)
      .select('username email globalName avatar createdAt level xp settings dailyChallenges lastChallengeReset library badges stats');

    res.json(user);
  } catch (err) {
    console.error('[Me API Error]', err);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// Challenges
router.get('/challenges', auth, async (req, res) => {
  try {
    const challenges = await ChallengeService.getOrResetChallenges(req.userId);
    res.json(challenges);
  } catch (error) {
    console.error('[Users API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Update
router.put('/me', auth, async (req, res) => {
  const { username, globalName, email, password, settings } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
      user.username = username;
    }
    
    if (globalName !== undefined) {
      if (typeof globalName !== 'string') return res.status(400).json({ error: 'Geçersiz veri formatı' });
      user.globalName = globalName;
    }
    
    if (email !== undefined) {
      if (typeof email !== 'string') return res.status(400).json({ error: 'Geçersiz veri formatı' });
      user.email = email;
    }
    
    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      }
      
      const { oldPassword } = req.body;
      if (!oldPassword || typeof oldPassword !== 'string') {
        return res.status(400).json({ error: 'Lütfen mevcut şifrenizi (Eski Şifre) giriniz.' });
      }

      if (!(await user.comparePassword(oldPassword))) {
        return res.status(400).json({ error: 'Eski şifre doğru değil.' });
      }

      user.password = password;
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate existing active sessions
    }

    if (settings && typeof settings === 'object') {
      Object.keys(settings).forEach(key => {
        user.set(`settings.${key}`, settings[key]);
      });
    }

    await user.save();

    const responseUser = user.toObject();
    delete responseUser.password;
    
    res.json(responseUser);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanımda' });
    }
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? e.message : undefined 
    });
  }
});

// Public profile
router.get('/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    // NoSQL injection protection
    if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    
    const user = await User.findOne({ username })
      .select('username globalName avatar createdAt level xp badges settings.privacy.hiddenGames');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Rozetleri kontrol et (her profil görüntülemede güncel kalsın)
    const BadgeService = require('../services/badgeService');
    await BadgeService.checkBadges(user._id);
    
    // Güncellenmiş kullanıcıyı tekrar çek
    const updatedUser = await User.findById(user._id)
      .select('username globalName avatar createdAt level xp badges settings.privacy.hiddenGames');

    const hiddenGames = updatedUser.settings?.privacy?.hiddenGames || [];

    const stats = await GameSession.aggregate([
      { 
        $match: { 
          userId: updatedUser._id,
          gameName: { $nin: hiddenGames }
        } 
      },
      {
        $group: {
          _id: '$gameName',
          totalTime: { $sum: '$duration' },
          lastPlayed: { $max: { $ifNull: ['$endTime', '$startTime'] } }
        }
      },
      { $sort: { lastPlayed: -1 } }
    ]);

    const responseUser = updatedUser.toObject();
    // Keep _id as it's needed for community/profile lookups
    
    res.json({ user: responseUser, stats });
  } catch (err) {
    console.error('[Profile API Error]', err);
    res.status(500).json({ error: 'Profil bilgileri alınamadı' });
  }
});

// Search for users
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    // NoSQL injection protection
    if (q && (typeof q !== 'string' || q.length > 50)) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    
    // Sanitize search query to prevent regex injection
    const sanitizedQuery = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const filter = sanitizedQuery ? { username: { $regex: sanitizedQuery, $options: 'i' } } : {};
    const users = await User.find(filter)
      .select('-_id username globalName avatar createdAt level xp badges')
      .sort({ xp: -1 })
      .limit(20);
    res.json(users);
  } catch (error) {
    console.error('[Users API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Game Library Methods
router.post('/library/add', auth, async (req, res) => {
  const { gameName, exePath } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Check if already in library
    const exists = user.library.find(g => g.gameName === gameName);
    if (exists) return res.status(400).json({ error: 'Bu oyun zaten kütüphanende!' });

    user.library.push({ gameName, exePath });
    await user.save();
    
    // Check for library badges
    const BadgeService = require('../services/badgeService');
    await BadgeService.checkBadges(user._id);
    
    res.json(user.library);
  } catch (error) {
    console.error('[Library API Error]', error);
    res.status(500).json({ error: 'Oyun eklenemedi.' });
  }
});

router.put('/library/update', auth, async (req, res) => {
  const { gameName, exePath } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const game = user.library.find(g => g.gameName === gameName);
    if (!game) return res.status(404).json({ error: 'Oyun bulunamadı' });

    game.exePath = exePath;
    await user.save();
    res.json(user.library);
  } catch (error) {
    console.error('[Library API Error]', error);
    res.status(500).json({ error: 'Güncellenemedi.' });
  }
});

router.delete('/library/:gameName', auth, async (req, res) => {
  try {
    const gameName = req.params.gameName;
    
    // NoSQL injection protection
    if (typeof gameName !== 'string' || gameName.length < 1 || gameName.length > 100) {
      return res.status(400).json({ error: 'Invalid game name' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    user.library = user.library.filter(g => g.gameName !== gameName);
    await user.save();
    res.json(user.library);
  } catch (error) {
    console.error('[Library API Error]', error);
    res.status(500).json({ error: 'Silinemedi.' });
  }
});

module.exports = router;