const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Start session
router.post('/start', auth, async (req, res) => {
  try {
    const { gameName, processName } = req.body;

    // Aktif session varsa kapat
    await GameSession.updateMany(
      { userId: req.userId, endTime: null },
      { endTime: new Date() }
    );

    const session = new GameSession({
      userId: req.userId,
      gameName,
      processName,
      startTime: new Date()
    });

    await session.save();

    res.json({
      sessionId: session._id,
      startTime: session.startTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End session
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

    // Only update if not already ended (or force update/confirmation)
    session.endTime = new Date();
    session.duration = Math.floor(
      (session.endTime - session.startTime) / 1000
    );

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

    session.endTime = new Date();
    session.duration = Math.floor(
      (session.endTime - session.startTime) / 1000
    );

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
    { $sort: { totalTime: -1 } }
  ]);

  res.json(stats);
});

module.exports = router;
