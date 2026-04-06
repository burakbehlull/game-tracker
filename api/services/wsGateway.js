const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const { markOnline, markOffline } = require('./presenceService');
const { setIO } = require('./realtime');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-unsafe';

function setupWebSocket(io) {
  setIO(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.userId);
    socket.join(`user:${userId}`);
    await markOnline(userId);

    const conversations = await Conversation.find({ participants: userId }).select('_id');
    conversations.forEach((c) => socket.join(`conversation:${String(c._id)}`));

    socket.on('conversation:join', async ({ conversationId }) => {
      if (conversationId) socket.join(`conversation:${String(conversationId)}`);
    });

    socket.on('disconnect', async () => {
      const room = io.sockets.adapter.rooms.get(`user:${userId}`);
      if (!room || room.size === 0) {
        await markOffline(userId);
      }
    });
  });
}

module.exports = {
  setupWebSocket
};
