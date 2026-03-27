const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');

const ChallengeService = require('../services/challengeService');

// Me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId)
    .select('username email globalName avatar createdAt level xp settings dailyChallenges lastChallengeReset library');

  res.json(user);
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

    if (username) {
      if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
      user.username = username;
    }
    
    if (globalName !== undefined) user.globalName = globalName;
    if (email !== undefined) user.email = email;
    
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      user.password = password;
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
  const user = await User.findOne({ username: req.params.username })
    .select('username globalName avatar createdAt settings.privacy.hiddenGames');

  if (!user) return res.status(404).json({ error: 'User not found' });

  const hiddenGames = user.settings?.privacy?.hiddenGames || [];

  const stats = await GameSession.aggregate([
    { 
      $match: { 
        userId: user._id,
        gameName: { $nin: hiddenGames }
      } 
    },
    {
      $group: {
        _id: '$gameName',
        totalTime: { $sum: '$duration' },
        lastPlayed: { $max: '$endTime' }
      }
    }
  ]);

  res.json({ user, stats });
});

// Search for users
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const filter = q ? { username: { $regex: q, $options: 'i' } } : {};
    const users = await User.find(filter)
      .select('username globalName avatar createdAt level xp')
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
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    user.library = user.library.filter(g => g.gameName !== req.params.gameName);
    await user.save();
    res.json(user.library);
  } catch (error) {
    console.error('[Library API Error]', error);
    res.status(500).json({ error: 'Silinemedi.' });
  }
});

module.exports = router;
""