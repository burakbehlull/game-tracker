const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};
    if (q) {
      query = { username: { $regex: q, $options: 'i' } };
    }
    
    // Default to latest 20 users if no query or just searching
    const users = await User.find(query)
      .select('username avatar createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile (public stats)
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get public stats
    const stats = await GameSession.aggregate([
      { $match: { userId: user._id } },
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

    res.json({ user, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
