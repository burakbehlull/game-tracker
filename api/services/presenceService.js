const Presence = require('../models/Presence');
const Friendship = require('../models/Friendship');
const { emitToUsers } = require('./realtime');

async function setPresence(userId, patch) {
  const now = new Date();
  const update = {
    ...patch,
    lastSeen: now
  };
  const presence = await Presence.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const friends = await Friendship.find({ users: userId, deletedAt: null }).select('users');
  const friendIds = friends.map((f) => f.users.find((id) => String(id) !== String(userId))).filter(Boolean);

  emitToUsers(friendIds, 'presence:update', {
    userId: String(userId),
    isOnline: !!presence.isOnline,
    isPlaying: !!presence.isPlaying,
    currentGame: presence.currentGame || null,
    lastSeen: presence.lastSeen
  });

  return presence;
}

async function markOnline(userId) {
  return setPresence(userId, { isOnline: true });
}

async function markOffline(userId) {
  return setPresence(userId, { isOnline: false, isPlaying: false, currentGame: null });
}

async function setPlaying(userId, gameName) {
  return setPresence(userId, {
    isOnline: true,
    isPlaying: !!gameName,
    currentGame: gameName || null
  });
}

module.exports = {
  setPresence,
  markOnline,
  markOffline,
  setPlaying
};
