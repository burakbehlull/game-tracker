const DiscussionService = require('../services/discussionService');
const Discussion = require('../models/Discussion');
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
      const { communityId } = req.query;
      const discussions = await Discussion.find({ communityId, approved: true })
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
      const { communityId } = req.query;
      const discussions = await Discussion.find({ communityId, approved: false })
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
      const { communityId } = req.body;
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
