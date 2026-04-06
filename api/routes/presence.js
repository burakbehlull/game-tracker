const express = require('express');
const auth = require('../middleware/auth');
const Presence = require('../models/Presence');
const Friendship = require('../models/Friendship');
const { setPlaying } = require('../services/presenceService');

const router = express.Router();

router.get('/friends', auth, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      users: req.userId,
      deletedAt: null
    }).select('users');

    const friendIds = friendships
      .map((entry) => entry.users.find((id) => String(id) !== String(req.userId)))
      .filter(Boolean);

    const statuses = await Presence.find({ userId: { $in: friendIds } }).select(
      'userId isOnline isPlaying currentGame lastSeen'
    );

    const byUserId = new Map(statuses.map((s) => [String(s.userId), s]));
    const payload = friendIds.map((id) => {
      const status = byUserId.get(String(id));
      return {
        userId: String(id),
        isOnline: !!status?.isOnline,
        isPlaying: !!status?.isPlaying,
        currentGame: status?.currentGame || null,
        lastSeen: status?.lastSeen || null
      };
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Durum bilgisi alınamadı' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { isPlaying, currentGame } = req.body || {};
    const presence = await setPlaying(req.userId, isPlaying ? currentGame : null);
    res.json(presence);
  } catch (error) {
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

module.exports = router;
