const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const BadgeService = require('../services/badgeService');
const ImageUploadService = require('../services/imageUploadService');

// Simple in-memory cache for profile stats
const profileStatsCache = new Map();
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      .select('username email globalName role avatar createdAt level xp settings dailyChallenges lastChallengeReset library badges stats blockedUsers');

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
  const { username, globalName, email, password, avatar, settings } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Profile Avatar Upload
    if (avatar && avatar.startsWith('data:image')) {
      try {
        const imageUrl = await ImageUploadService.uploadImage(avatar);
        user.avatar = imageUrl;
      } catch (uploadError) {
        console.error('[Avatar Upload Error]', uploadError);
        return res.status(500).json({ error: 'Profil fotoğrafı yüklenemedi: ' + uploadError.message });
      }
    } else if (avatar === null) {
      user.avatar = undefined;
    }

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
      // Deep merge for nested settings (privacy, timer, etc.)
      const mergeDeep = (target, source, prefix = 'settings') => {
        Object.keys(source).forEach(key => {
          const fullKey = `${prefix}.${key}`;
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            mergeDeep(target, source[key], fullKey);
          } else {
            user.set(fullKey, source[key]);
          }
        });
      };
      mergeDeep(user, settings);
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

    // Check cache for stats
    const cacheKey = `stats_${updatedUser._id}`;
    let stats = profileStatsCache.get(cacheKey);
    const now = Date.now();

    if (!stats || (now - stats.lastFetched > STATS_CACHE_TTL)) {
      stats = {
        data: await GameSession.aggregate([
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
        ]),
        lastFetched: now
      };
      profileStatsCache.set(cacheKey, stats);
    }

    const responseUser = updatedUser.toObject();
    
    // Check friendship status if user is logged in
    let friendshipStatus = 'none'; // none, pending, accepted
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = decoded.userId;

        if (currentUserId && String(currentUserId) !== String(updatedUser._id)) {
          const Friendship = require('../models/Friendship');
          const FriendRequest = require('../models/FriendRequest');

          // Check if already friends
          const ids = [String(currentUserId), String(updatedUser._id)].sort();
          const friendship = await Friendship.findOne({
            userA: ids[0],
            userB: ids[1],
            deletedAt: null
          });

          if (friendship) {
            friendshipStatus = 'accepted';
          } else {
            // Check for pending request
            const request = await FriendRequest.findOne({
              $or: [
                { fromUserId: currentUserId, toUserId: updatedUser._id },
                { fromUserId: updatedUser._id, toUserId: currentUserId }
              ],
              status: 'pending'
            });

            if (request) {
              friendshipStatus = 'pending';
            }
          }
        }
      } catch (err) {
        // Token invalid, ignore friendship check
      }
    }
    
    res.json({ user: responseUser, stats: stats.data, friendshipStatus });
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
      .limit(20)
      .lean();
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

// User Blocking
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı ID' });
    }

    if (String(targetUserId) === String(req.userId)) {
      return res.status(400).json({ error: 'Kendinizi engelleyemezsiniz' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (!user.blockedUsers.includes(targetUserId)) {
      user.blockedUsers.push(targetUserId);
      await user.save();
    }

    // Arkadaşlığı da bitir (varsa)
    const Friendship = require('../models/Friendship');
    const ids = [String(req.userId), String(targetUserId)].sort();
    await Friendship.findOneAndUpdate(
      { userA: ids[0], userB: ids[1] },
      { deletedAt: new Date() }
    );

    res.json({ message: 'Kullanıcı engellendi' });
  } catch (error) {
    console.error('[Block User Error]', error);
    res.status(500).json({ error: 'Kullanıcı engellenemedi' });
  }
});

router.post('/unblock/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı ID' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    user.blockedUsers = user.blockedUsers.filter(id => String(id) !== String(targetUserId));
    await user.save();

    res.json({ message: 'Engelleme kaldırıldı' });
  } catch (error) {
    console.error('[Unblock User Error]', error);
    res.status(500).json({ error: 'Engelleme kaldırılamadı' });
  }
});

module.exports = router;