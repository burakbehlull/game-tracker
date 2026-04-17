const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const User = require('../models/User'); // Need User model to check tokenVersion
const { markOnline, markOffline } = require('./presenceService');
const { setIO } = require('./realtime');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  process.exit(1);
}

function setupWebSocket(io) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Unauthorized'));
      
      // Token format validation
      if (typeof token !== 'string' || token.length < 10) {
        return next(new Error('Invalid token format'));
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // JWT payload validation
      if (!decoded.userId || !mongoose.Types.ObjectId.isValid(decoded.userId)) {
        return next(new Error('Invalid token payload'));
      }

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
    
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      socket.disconnect();
      return;
    }
    
    socket.join(`user:${userId}`);
    await markOnline(userId);

    const conversations = await Conversation.find({ participants: userId }).select('_id');
    conversations.forEach((c) => {
      if (c._id) socket.join(`conversation:${String(c._id)}`);
    });

    socket.on('conversation:join', async ({ conversationId }) => {
      // Validate conversationId
      if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
        socket.join(`conversation:${String(conversationId)}`);
      }
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
