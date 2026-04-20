const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const NotificationService = require('./notificationService');

class CommunityService {
  static async createCommunity(data, ownerId) {
    const slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const existing = await Community.findOne({ $or: [{ name: data.name }, { slug }] });
    if (existing) throw new Error('Community name or slug already exists');

    const community = new Community({
      ...data,
      slug,
      ownerId,
      members: [ownerId] // Owner is the first member
    });

    await community.save();
    return community;
  }

  static async joinCommunity(slug, userId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');

    if (community.members.includes(userId) || community.pendingMembers.includes(userId)) {
      throw new Error('Already a member or request pending');
    }

    if (community.settings.requireApprovalForMembers) {
      community.pendingMembers.push(userId);
      await community.save();
      
      // Notify owner/admins about new request
      await NotificationService.createNotification(community.ownerId, 'MEMBER_REQUEST', {
        communityName: community.name,
        communitySlug: community.slug,
        userId
      });

      return { status: 'pending' };
    } else {
      community.members.push(userId);
      await community.save();
      return { status: 'joined' };
    }
  }

  static async leaveCommunity(slug, userId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');
    if (community.ownerId.toString() === userId.toString()) throw new Error('Owner cannot leave');

    community.members = community.members.filter(m => m.toString() !== userId.toString());
    community.admins = community.admins.filter(m => m.toString() !== userId.toString());
    community.moderators = community.moderators.filter(m => m.toString() !== userId.toString());
    
    await community.save();
    return { status: 'left' };
  }

  static async updateMemberRole(slug, targetUserId, role, adminId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');

    // Remove from all roles first
    community.admins = community.admins.filter(m => m.toString() !== targetUserId);
    community.moderators = community.moderators.filter(m => m.toString() !== targetUserId);

    if (role === 'admin') community.admins.push(targetUserId);
    if (role === 'moderator') community.moderators.push(targetUserId);

    await community.save();

    await NotificationService.createNotification(targetUserId, 'ROLE_UPDATED', {
      communityName: community.name,
      communitySlug: community.slug,
      role
    });

    return community;
  }

  static async approveMember(slug, targetUserId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');

    community.pendingMembers = community.pendingMembers.filter(m => m.toString() !== targetUserId);
    if (!community.members.includes(targetUserId)) {
      community.members.push(targetUserId);
    }

    await community.save();

    await NotificationService.createNotification(targetUserId, 'MEMBER_ACCEPTED', {
      communityName: community.name,
      communitySlug: community.slug
    });

    return community;
  }

  static async rejectMember(slug, targetUserId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');

    community.pendingMembers = community.pendingMembers.filter(m => m.toString() !== targetUserId.toString());
    
    // Add to a "rejected" list or just remove from pending? 
    // The user wants "if rejected, show join again". 
    // In our current model, removing from pending is enough for them to click join again.
    
    await community.save();

    await NotificationService.createNotification(targetUserId, 'MEMBER_REJECTED', {
      communityName: community.name,
      communitySlug: community.slug
    });

    return community;
  }

  static async kickMember(slug, targetUserId, requesterId) {
    const community = await Community.findOne({ slug });
    if (!community) throw new Error('Community not found');

    // Prevent kicking the owner
    if (community.ownerId.toString() === targetUserId.toString()) {
      throw new Error('Topluluk kurucusu gruptan atılamaz');
    }

    // Check if requester is admin or owner
    const isOwner = community.ownerId.toString() === requesterId.toString();
    const isAdmin = community.admins.some(a => a.toString() === requesterId.toString());
    
    if (!isOwner && !isAdmin) {
      throw new Error('Üye atmak için yetkiniz yok');
    }

    // If requester is admin, they cannot kick other admins (only owner can)
    const targetIsAdmin = community.admins.some(a => a.toString() === targetUserId.toString());
    if (isAdmin && !isOwner && targetIsAdmin) {
      throw new Error('Yöneticiler diğer yöneticileri atamaz');
    }

    // Remove from members and any roles
    community.members = community.members.filter(m => m.toString() !== targetUserId.toString());
    community.admins = community.admins.filter(m => m.toString() !== targetUserId.toString());
    community.moderators = community.moderators.filter(m => m.toString() !== targetUserId.toString());

    await community.save();

    await NotificationService.createNotification(targetUserId, 'MEMBER_KICKED', {
      communityName: community.name,
      communitySlug: community.slug
    });

    return community;
  }
}

module.exports = CommunityService;
