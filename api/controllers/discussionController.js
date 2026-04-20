const DiscussionService = require('../services/discussionService');
const Discussion = require('../models/Discussion');
const Community = require('../models/Community');
const Comment = require('../models/Comment');

class DiscussionController {
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const discussion = await Discussion.findById(id)
        .populate('authorId', 'username avatar')
        .populate('communityId', 'name slug avatar')
        .lean();
      if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
      res.json(discussion);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getByCommunity(req, res) {
    try {
      const slug = req.params.slug?.toLowerCase();
      const community = await Community.findOne({ slug });
      if (!community) return res.status(404).json({ error: 'Community not found' });

      // If user is logged in, show their own pending posts too.
      // We check for auth token manually since this route is public
      const query = { communityId: community._id };
      
      const authHeader = req.headers.authorization;
      let userId = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
          userId = decoded.id || decoded.userId;
        } catch (err) {
          // Token invalid, ignore
        }
      }

      if (userId) {
        query.$or = [
          { approved: true },
          { authorId: userId }
        ];
      } else {
        query.approved = true;
      }

      const discussions = await Discussion.find(query)
        .sort({ createdAt: -1 })
        .populate('authorId', 'username avatar')
        .lean();
      res.json(discussions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getPending(req, res) {
    try {
      const { slug } = req.params;
      const community = await Community.findOne({ slug: slug.toLowerCase() });
      if (!community) return res.status(404).json({ error: 'Community not found' });

      const discussions = await Discussion.find({ communityId: community._id, approved: false })
        .sort({ createdAt: -1 })
        .populate('authorId', 'username avatar')
        .lean();
      res.json(discussions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const communityId = req.community._id;
      const discussion = await DiscussionService.createDiscussion(communityId, req.userId, req.body);
      res.status(201).json(discussion);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async approve(req, res) {
    try {
      const { id } = req.params;
      const discussion = await DiscussionService.approveDiscussion(id);
      res.json(discussion);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const discussion = await Discussion.findById(id);
      if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

      // Permission check: Author OR (Admin/Mod/Owner of community)
      // Note: req.community and req.userRole are set by checkCommunityRole middleware
      const isAuthor = discussion.authorId.toString() === req.userId;
      const isStaff = ['owner', 'admin', 'moderator'].includes(req.userRole);

      if (!isAuthor && !isStaff) {
        return res.status(403).json({ error: 'You do not have permission to delete this discussion' });
      }

      await Discussion.findByIdAndDelete(id);
      await Comment.deleteMany({ discussionId: id });
      res.json({ message: 'Discussion deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getComments(req, res) {
    try {
      const { discussionId } = req.params;
      const comments = await Comment.find({ discussionId })
        .sort({ createdAt: 1 })
        .populate('authorId', 'username avatar')
        .lean();
      res.json(comments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createComment(req, res) {
    try {
      const { discussionId } = req.params;
      const comment = new Comment({
        discussionId,
        authorId: req.userId,
        content: req.body.content
      });
      await comment.save();
      const populated = await comment.populate('authorId', 'username avatar');
      res.status(201).json(populated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteComment(req, res) {
    try {
      const { id } = req.params;
      await Comment.findByIdAndDelete(id);
      res.json({ message: 'Comment deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = DiscussionController;
