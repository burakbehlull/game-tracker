const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

const ChallengeService = require('../services/challengeService');

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

    // Görev ilerlemesi: Oyun açılışı
    await ChallengeService.updateProgress(req.userId, 'open_game', 1, { gameName });
    await ChallengeService.updateProgress(req.userId, 'session_start', 1, { startHour, dayOfWeek });

    res.json({
      sessionId: session._id,
      startTime: session.startTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
          await user.save();
        }
      }

      // Görev ilerlemesi: Oynama süresi
      await ChallengeService.updateProgress(req.userId, 'play_time', extraMinutes);
      // Aralıksız oynama süresi
      await ChallengeService.updateProgress(req.userId, 'steady_play', Math.floor(session.duration / 60));
    }

    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.json({ success: true, duration: session.duration });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        lastPlayed: { $max: '$endTime' }
      }
    },
    { $sort: { lastPlayed: -1 } }
  ]);

  res.json(stats);
});

module.exports = router;
