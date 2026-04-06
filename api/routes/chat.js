const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const { emitToConversation, emitToUsers } = require('../services/realtime');

const router = express.Router();

const MAX_PAGE_SIZE = 50;

function toPublicMessage(message) {
  return {
    _id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    kind: message.kind,
    createdAt: message.createdAt,
    readBy: message.readBy || []
  };
}

async function ensureParticipant(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;
  const isParticipant = conversation.participants.some((id) => String(id) === String(userId));
  return isParticipant ? conversation : null;
}

router.post('/conversations', auth, async (req, res) => {
  try {
    const { type = 'dm', participantIds = [], title = '' } = req.body || {};
    if (!Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'Geçersiz katılımcı listesi' });
    }

    const normalizedParticipants = [...new Set([String(req.userId), ...participantIds.map(String)])];
    if (type === 'dm' && normalizedParticipants.length !== 2) {
      return res.status(400).json({ error: 'DM için tam bir kullanıcı seçmelisin' });
    }
    if (type === 'group' && normalizedParticipants.length < 3) {
      return res.status(400).json({ error: 'Grup için en az 3 katılımcı gerekir' });
    }

    if (type === 'dm') {
      const ids = normalizedParticipants.sort();
      const existing = await Conversation.findOne({
        type: 'dm',
        participants: { $all: ids, $size: 2 }
      });
      if (existing) return res.json(existing);

      const areFriends = await Friendship.findOne({
        userA: ids[0],
        userB: ids[1],
        deletedAt: null
      });
      if (!areFriends) return res.status(403).json({ error: 'Sadece arkadaşlarınla DM başlatabilirsin' });
    }

    const conversation = await Conversation.create({
      type,
      participants: normalizedParticipants.map((id) => new mongoose.Types.ObjectId(id)),
      title: type === 'group' ? title : '',
      createdBy: req.userId
    });

    emitToUsers(normalizedParticipants, 'conversation:updated', {
      type: 'created',
      conversationId: conversation._id
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Konuşma oluşturulamadı' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username globalName avatar')
      .lean();

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Konuşmalar alınamadı' });
  }
});

router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await ensureParticipant(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const pageSize = Math.min(Number(req.query.limit) || 30, MAX_PAGE_SIZE);
    const query = { conversationId: req.params.id, deletedAt: null };
    if (req.query.cursor) query._id = { $lt: req.query.cursor };

    const messages = await Message.find(query).sort({ _id: -1 }).limit(pageSize).lean();
    res.json(messages.reverse().map(toPublicMessage));
  } catch (error) {
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

router.post('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await ensureParticipant(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const content = (req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Mesaj boş olamaz' });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.userId,
      content,
      kind: 'text',
      readBy: [{ userId: req.userId }]
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    const payload = toPublicMessage(message);
    emitToConversation(conversation._id, 'message:new', payload);
    emitToUsers(conversation.participants, 'conversation:updated', {
      type: 'message',
      conversationId: conversation._id,
      messageId: message._id
    });

    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

router.post('/conversations/:id/read', auth, async (req, res) => {
  try {
    const conversation = await ensureParticipant(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    await Message.updateMany(
      {
        conversationId: conversation._id,
        'readBy.userId': { $ne: req.userId },
        deletedAt: null
      },
      { $push: { readBy: { userId: req.userId, readAt: new Date() } } }
    );

    emitToConversation(conversation._id, 'message:read', {
      conversationId: conversation._id,
      userId: req.userId
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Okundu bilgisi güncellenemedi' });
  }
});

module.exports = router;
