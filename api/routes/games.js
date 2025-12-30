const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Start a game session
router.post('/start', auth, async (req, res) => {
  try {
    const { gameName, processName } = req.body;
    const session = new GameSession({
      userId: req.userId,
      gameName,
      processName,
      startTime: new Date()
    });
    await session.save();
    res.json({ sessionId: session._id, startTime: session.startTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End a game session
router.post('/end', auth, async (req, res) => {
  try {
    const { sessionId, duration } = req.body;
    
    const session = await GameSession.findOne({ _id: sessionId, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.endTime = new Date();
    session.duration = duration || Math.floor((session.endTime - session.startTime) / 1000);
    
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ userId: req.userId })
      .sort({ startTime: -1 })
      .limit(100);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated stats
router.get('/stats', auth, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
