const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const auth = require('../middleware/auth');

// Me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId)
    .select('username email globalName avatar createdAt level xp settings');

  res.json(user);
});

// Update
router.put('/me', auth, async (req, res) => {
  const { username, globalName, settings } = req.body;

  if (username && username.length < 3) {
    return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
  }

  try {
    const updateData = {};
    if (username) updateData.username = username;
    if (globalName) updateData.globalName = globalName;
    if (settings) updateData.settings = settings;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('username globalName avatar level xp settings');

    res.json(user);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Username kullanılıyor' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Public profile
router.get('/profile/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select('username globalName avatar createdAt');

  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = await GameSession.aggregate([
    { $match: { userId: user._id } },
    {
      $group: {
        _id: '$gameName',
        totalTime: { $sum: '$duration' }
      }
    }
  ]);

  res.json({ user, stats });
});

module.exports = router;
