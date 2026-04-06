let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${String(userId)}`).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
  if (!Array.isArray(userIds)) return;
  userIds.forEach((userId) => emitToUser(userId, event, payload));
}

function emitToConversation(conversationId, event, payload) {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(`conversation:${String(conversationId)}`).emit(event, payload);
}

module.exports = {
  setIO,
  getIO,
  emitToUser,
  emitToUsers,
  emitToConversation
};
