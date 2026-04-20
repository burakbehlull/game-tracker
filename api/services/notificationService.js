const Community = require('../models/Community');
const Notification = require('../models/Notification');
const { emitToUser } = require('./realtime');

class NotificationService {
  static async createNotification(userId, type, data) {
    try {
      const notification = new Notification({
        userId,
        type,
        data
      });
      await notification.save();
      
      // Real-time notification
      emitToUser(userId, 'notification:new', notification);
      
      return notification;
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  static async notifyCommunityMembers(communityId, type, data, excludeUserId = null) {
    try {
      const community = await Community.findById(communityId);
      if (!community) return;

      const membersToNotify = community.members.filter(m => m.toString() !== excludeUserId?.toString());
      
      const notifications = membersToNotify.map(userId => ({
        userId,
        type,
        data
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error('Group notification error:', err);
    }
  }
}

module.exports = NotificationService;
