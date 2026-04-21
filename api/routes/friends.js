const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');
const { emitToUsers } = require('../services/realtime');

const router = express.Router();

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

async function areFriends(userA, userB) {
  const ids = [String(userA), String(userB)].sort();
  const friendship = await Friendship.findOne({
    userA: ids[0],
    userB: ids[1],
    deletedAt: null
  });
  return !!friendship;
}

router.post('/request', auth, async (req, res) => {
  try {
    const { targetUserId, username } = req.body;
    
    // NoSQL injection protection
    if (targetUserId && !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (username && (typeof username !== 'string' || username.length < 3 || username.length > 20)) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username || '')) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    
    let target = null;

    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      target = await User.findById(targetUserId).select('_id');
    } else if (username) {
      target = await User.findOne({ username }).select('_id');
    }

    if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (String(target._id) === String(req.userId)) {
      return res.status(400).json({ error: 'Kendine istek gönderemezsin' });
    }

    if (await areFriends(req.userId, target._id)) {
      return res.status(400).json({ error: 'Bu kullanıcı zaten arkadaşın' });
    }

    const pending = await FriendRequest.findOne({
      fromUserId: req.userId,
      toUserId: target._id,
      status: 'pending'
    });
    if (pending) return res.status(400).json({ error: 'Bekleyen bir istek zaten var' });

    const request = await FriendRequest.create({
      fromUserId: req.userId,
      toUserId: target._id,
      status: 'pending'
    });

    const currentUser = await User.findById(req.userId).select('username');
    const NotificationService = require('../services/notificationService');
    await NotificationService.createNotification(target._id, 'FRIEND_REQUEST', {
      senderName: currentUser.username,
      requestId: request._id
    });

    emitToUsers([target._id], 'friend:request:new', { requestId: request._id, fromUserId: req.userId });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Arkadaş isteği gönderilemedi' });
  }
});

router.get('/requests', auth, async (req, res) => {
  try {
    const incoming = await FriendRequest.find({
      toUserId: req.userId,
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'username globalName avatar level');

    const outgoing = await FriendRequest.find({
      fromUserId: req.userId,
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .populate('toUserId', 'username globalName avatar level');

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ error: 'İstekler alınamadı' });
  }
});

router.post('/requests/:id/accept', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // NoSQL injection protection
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const request = await FriendRequest.findOne({
      _id: requestId,
      toUserId: req.userId,
      status: 'pending'
    });
    if (!request) return res.status(404).json({ error: 'İstek bulunamadı' });

    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    const ids = [String(request.fromUserId), String(request.toUserId)].sort();
    await Friendship.updateOne(
      { userA: ids[0], userB: ids[1] },
      {
        $set: {
          users: [toObjectId(ids[0]), toObjectId(ids[1])],
          userA: toObjectId(ids[0]),
          userB: toObjectId(ids[1]),
          deletedAt: null
        }
      },
      { upsert: true }
    );

    const accepter = await User.findById(req.userId).select('username');
    const NotificationService = require('../services/notificationService');
    await NotificationService.createNotification(request.fromUserId, 'FRIEND_ACCEPTED', {
      username: accepter.username,
      userId: req.userId
    });

    emitToUsers([request.fromUserId, request.toUserId], 'friend:request:resolved', {
      requestId: request._id,
      status: 'accepted'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'İstek kabul edilemedi' });
  }
});

router.post('/requests/:id/reject', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // NoSQL injection protection
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const request = await FriendRequest.findOne({
      _id: requestId,
      toUserId: req.userId,
      status: 'pending'
    });
    if (!request) return res.status(404).json({ error: 'İstek bulunamadı' });

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    emitToUsers([request.fromUserId, request.toUserId], 'friend:request:resolved', {
      requestId: request._id,
      status: 'rejected'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'İstek reddedilemedi' });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const friends = await Friendship.find({
      users: req.userId,
      deletedAt: null
    }).sort({ updatedAt: -1 });

    const friendIds = friends.map((entry) => {
      const [a, b] = entry.users.map((id) => String(id));
      return a === String(req.userId) ? b : a;
    });

    const users = await User.find({ _id: { $in: friendIds } })
      .select('username globalName avatar level xp createdAt')
      .sort({ xp: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Arkadaş listesi alınamadı' });
  }
});

router.delete('/:friendId', auth, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    
    // NoSQL injection protection
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı' });
    }
    
    const ids = [String(req.userId), String(friendId)].sort();

    const result = await Friendship.updateOne(
      { userA: ids[0], userB: ids[1], deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Arkadaş bulunamadı' });

    emitToUsers(ids, 'friend:removed', { byUserId: req.userId, friendId: req.params.friendId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Arkadaş silinemedi' });
  }
});

module.exports = router;
