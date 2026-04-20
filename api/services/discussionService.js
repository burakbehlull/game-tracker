const Discussion = require('../models/Discussion');
const Community = require('../models/Community');
const NotificationService = require('./notificationService');

class DiscussionService {
  static async createDiscussion(communityId, authorId, data) {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');

    const isApproved = !community.settings.requireApprovalForPosts;
    
    const discussion = new Discussion({
      communityId,
      authorId,
      title: data.title,
      content: data.content,
      approved: isApproved
    });

    await discussion.save();

    if (isApproved) {
      // Notify all members about new post
      await NotificationService.notifyCommunityMembers(communityId, 'NEW_POST', {
        communityName: community.name,
        communitySlug: community.slug,
        discussionId: discussion._id,
        title: discussion.title
      }, authorId);
    } else {
      // Notify admins about pending post
      await NotificationService.createNotification(community.ownerId, 'DISCUSSION_PENDING', {
        communityName: community.name,
        communitySlug: community.slug,
        discussionId: discussion._id
      });
    }

    return discussion;
  }

  static async approveDiscussion(discussionId) {
    const discussion = await Discussion.findById(discussionId).populate('communityId');
    if (!discussion) throw new Error('Discussion not found');

    discussion.approved = true;
    await discussion.save();

    await NotificationService.createNotification(discussion.authorId, 'DISCUSSION_APPROVED', {
      communityName: discussion.communityId.name,
      communitySlug: discussion.communityId.slug,
      discussionId: discussion._id,
      title: discussion.title
    });

    return discussion;
  }
}

module.exports = DiscussionService;
