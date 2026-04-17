const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

const ChallengeService = require('../services/challengeService');
const { setPlaying } = require('../services/presenceService');

// Start session
router.post('/start', auth, async (req, res) => {
  try {
    const { gameName, processName } = req.body;

    // Görevleri sıfırla/başlat
    await ChallengeService.getOrResetChallenges(req.userId);

    // Aktif session varsa kapat
    await GameSession.updateMany(
      { userId: req.userId, endTime: null },
      { endTime: new Date() }
    );

    const now = new Date();
    const startHour = now.getHours();
    const dayOfWeek = now.getDay();
    const isNightSession = startHour >= 23 || startHour <= 5;

    const session = new GameSession({
      userId: req.userId,
      gameName,
      processName,
      startTime: now,
      startHour,
      dayOfWeek,
      isNightSession
    });

    await session.save();
    await setPlaying(req.userId, gameName);

    // Görev ilerlemesi: Oyun açılışı
    await ChallengeService.updateProgress(req.userId, 'open_game', 1, { gameName });
    await ChallengeService.updateProgress(req.userId, 'session_start', 1, { startHour, dayOfWeek });

    res.json({
      sessionId: session._id,
      startTime: session.startTime
    });
  } catch (error) {
    console.error('[Games API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// End session
router.post('/end', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await GameSession.findOne({
      _id: sessionId,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const oldDuration = session.duration || 0;
    session.endTime = new Date();
    session.duration = Math.floor(
      (session.endTime - session.startTime) / 1000
    );

    const extraSeconds = session.duration - oldDuration;
    if (extraSeconds > 0) {
      const extraMinutes = extraSeconds / 60;
      const xpGained = Math.floor(extraMinutes); // 1 dk = 1 XP
      
      if (xpGained > 0) {
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        if (user) {
          user.xp += xpGained;
          user.level = Math.floor(user.xp / 1000) + 1;
          
          // Update total play time and different games played
          if (!user.stats) user.stats = {};
          user.stats.totalPlayTimeMinutes = (user.stats.totalPlayTimeMinutes || 0) + extraMinutes;
          
          if (!user.stats.differentGamesPlayed) user.stats.differentGamesPlayed = [];
          if (!user.stats.differentGamesPlayed.includes(session.gameName)) {
            user.stats.differentGamesPlayed.push(session.gameName);
          }
          
          user.markModified('stats');
          await user.save();
          
          // Check badges
          const BadgeService = require('../services/badgeService');
          await BadgeService.checkBadges(user._id);
        }
      }

      // Görev ilerlemesi: Oynama süresi
      await ChallengeService.updateProgress(req.userId, 'play_time', extraMinutes);
      // Aralıksız oynama süresi
      await ChallengeService.updateProgress(req.userId, 'steady_play', Math.floor(session.duration / 60));
    }

    await session.save();
    await setPlaying(req.userId, null);
    res.json(session);
  } catch (error) {
    console.error('[Games API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Heartbeat - Periodically update session to prevent data loss on crash
router.put('/:id/heartbeat', auth, async (req, res) => {
  try {
    const session = await GameSession.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const oldDuration = session.duration || 0;
    session.endTime = new Date();
    session.duration = Math.floor(
      (session.endTime - session.startTime) / 1000
    );

    const extraSeconds = session.duration - oldDuration;
    if (extraSeconds > 0) {
      const extraMinutes = extraSeconds / 60;
      const xpGained = Math.floor(extraMinutes);
      
      if (xpGained > 0) {
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        if (user) {
          user.xp += xpGained;
          user.level = Math.floor(user.xp / 1000) + 1;
          await user.save();
        }
      }

      // Görev ilerlemesi: Oynama süresi
      await ChallengeService.updateProgress(req.userId, 'play_time', extraMinutes);
      // Aralıksız oynama süresi
      await ChallengeService.updateProgress(req.userId, 'steady_play', Math.floor(session.duration / 60));
    }

    await session.save();
    await setPlaying(req.userId, session.gameName);
    res.json({ success: true, duration: session.duration });
  } catch (error) {
    console.error('[Games API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// History
router.get('/history', auth, async (req, res) => {
  const sessions = await GameSession.find({ userId: req.userId })
    .sort({ startTime: -1 })
    .limit(100);

  res.json(sessions);
});

// Stats
router.get('/stats', auth, async (req, res) => {
  const stats = await GameSession.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
    {
      $group: {
        _id: '$gameName',
        totalTime: { $sum: '$duration' },
        sessionCount: { $sum: 1 },
        lastPlayed: { $max: { $ifNull: ['$endTime', '$startTime'] } }
      }
    },
    { $sort: { lastPlayed: -1 } }
  ]);

  res.json(stats);
});

// Today's total playtime
router.get('/today', auth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const stats = await GameSession.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(req.userId),
          startTime: { $gte: startOfDay }
        } 
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: '$duration' }
        }
      }
    ]);

    res.json({ totalTime: stats.length > 0 ? stats[0].totalTime : 0 });
  } catch (error) {
    console.error('[Games API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Game Details & Top Players
router.get('/details/:gameName', async (req, res) => {
  try {
    const { gameName } = req.params;
    
    // NoSQL injection protection
    if (typeof gameName !== 'string' || gameName.length < 1 || gameName.length > 100) {
      return res.status(400).json({ error: 'Invalid game name' });
    }
    
    // Sanitize game name to prevent regex injection
    const sanitizedGameName = gameName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Get top 10 players for this game
    const stats = await GameSession.aggregate([
      { $match: { gameName: { $regex: new RegExp(`^${sanitizedGameName}$`, 'i') } } },
      {
        $group: {
          _id: '$userId',
          totalTime: { $sum: '$duration' },
          lastPlayed: { $max: { $ifNull: ['$endTime', '$startTime'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalTime: 1,
          lastPlayed: 1,
          'user.username': 1,
          'user.globalName': 1,
          'user.avatar': 1,
          'user.level': 1
        }
      },
      { $sort: { totalTime: -1 } },
      { $limit: 10 }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('[Games API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
