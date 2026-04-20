const CommunityService = require('../services/communityService');
const Community = require('../models/Community');
const Discussion = require('../models/Discussion');

class CommunityController {
  static async getAll(req, res) {
    try {
      const communities = await Community.find().select('name slug description avatar members').lean();
      const communitiesWithCount = communities.map(c => ({
        ...c,
        memberCount: c.members.length
      }));
      res.json(communitiesWithCount);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getBySlug(req, res) {
    try {
      const community = await Community.findOne({ slug: req.params.slug })
        .populate('ownerId', 'username avatar')
        .populate('admins', 'username avatar')
        .populate('moderators', 'username avatar')
        .populate('members', 'username avatar')
        .lean();
      
      if (!community) return res.status(404).json({ error: 'Community not found' });
      
      // Rename members to membersList for the frontend mapping if needed, 
      // but let's just make sure it's consistent.
      community.membersList = community.members;
      
      res.json(community);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const community = await CommunityService.createCommunity(req.body, req.userId);
      res.status(201).json(community);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async join(req, res) {
    try {
      const result = await CommunityService.joinCommunity(req.params.slug, req.userId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async leave(req, res) {
    try {
      const result = await CommunityService.leaveCommunity(req.params.slug, req.userId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getFeed(req, res) {
    try {
      const discussions = await Discussion.find({ approved: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('authorId', 'username avatar')
        .populate('communityId', 'name slug avatar')
        .lean();
      res.json(discussions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getUserCommunities(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId || userId === 'undefined') {
        return res.json([]);
      }

      const communities = await Community.find({ 
        $or: [
          { members: userId },
          { ownerId: userId }
        ]
      }).select('name slug avatar members').lean();
      
      const result = communities.map(c => ({
        ...c,
        memberCount: (c.members?.length || 0),
        members: undefined 
      }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateSettings(req, res) {
    try {
      const { slug } = req.params;
      const community = await Community.findOneAndUpdate(
        { slug },
        { $set: { settings: req.body.settings, description: req.body.description, avatar: req.body.avatar, banner: req.body.banner } },
        { new: true }
      );
      res.json(community);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteCommunity(req, res) {
    try {
      const { slug } = req.params;
      const community = await Community.findOne({ slug });
      if (community.ownerId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Only owner can delete' });
      }
      await Community.deleteOne({ slug });
      res.json({ message: 'Community deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getPendingMembers(req, res) {
    try {
      const community = await Community.findOne({ slug: req.params.slug })
        .populate('pendingMembers', 'username avatar')
        .lean();
      res.json(community.pendingMembers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveMember(req, res) {
    try {
      const { userId } = req.body;
      const community = await CommunityService.approveMember(req.params.slug, userId);
      res.json(community);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectMember(req, res) {
    try {
      const { userId } = req.body;
      const community = await CommunityService.rejectMember(req.params.slug, userId);
      res.json(community);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async kickMember(req, res) {
    try {
      const { userId } = req.body;
      const community = await CommunityService.kickMember(req.params.slug, userId, req.userId);
      res.json(community);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = CommunityController;
