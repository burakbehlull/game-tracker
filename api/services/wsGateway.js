const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const User = require('../models/User'); // Need User model to check tokenVersion
const { markOnline, markOffline } = require('./presenceService');
const { setIO } = require('./realtime');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function setupWebSocket(io) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await User.findById(decoded.userId).select('tokenVersion');
      if (!user) return next(new Error('User not found'));
      if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
        return next(new Error('Session expired or password changed'));
      }

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
