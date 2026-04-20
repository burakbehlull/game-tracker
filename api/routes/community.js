const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkCommunityRole } = require('../middleware/communityRole');
const CommunityController = require('../controllers/communityController');
const DiscussionController = require('../controllers/discussionController');
const EventController = require('../controllers/eventController');

// Global Community Routes
router.get('/', CommunityController.getAll);
router.get('/feed', CommunityController.getFeed);
router.get('/user/:userId', CommunityController.getUserCommunities);
router.post('/create', auth, CommunityController.create);

// Community Specific Routes
router.get('/:slug', CommunityController.getBySlug);
router.post('/:slug/join', auth, CommunityController.join);
router.post('/:slug/leave', auth, CommunityController.leave);

// Management Routes
router.get('/:slug/pending-members', auth, checkCommunityRole(['admin']), CommunityController.getPendingMembers);
router.post('/:slug/approve-member', auth, checkCommunityRole(['admin']), CommunityController.approveMember);
router.post('/:slug/reject-member', auth, checkCommunityRole(['admin']), CommunityController.rejectMember);
router.post('/:slug/kick-member', auth, checkCommunityRole(['admin']), CommunityController.kickMember);
router.put('/:slug/settings', auth, checkCommunityRole(['admin']), CommunityController.updateSettings);
router.delete('/:slug', auth, checkCommunityRole(['owner']), CommunityController.deleteCommunity);

// Discussion Routes
router.get('/:slug/discussions', DiscussionController.getByCommunity);
router.get('/:slug/discussions/pending', auth, checkCommunityRole(['moderator']), DiscussionController.getPending);
router.get('/discussions/:id', DiscussionController.getById);
router.post('/:slug/discussions', auth, checkCommunityRole(['member']), DiscussionController.create);
router.post('/discussions/:id/approve', auth, DiscussionController.approve);
router.delete('/:slug/discussions/:id', auth, checkCommunityRole(['member']), DiscussionController.delete);

// Comment Routes
router.get('/discussions/:discussionId/comments', DiscussionController.getComments);
router.post('/discussions/:discussionId/comments', auth, DiscussionController.createComment);
router.delete('/comments/:id', auth, DiscussionController.deleteComment);

// Event Routes
router.get('/:slug/events', EventController.getByCommunity);
router.post('/:slug/events', auth, checkCommunityRole(['moderator', 'admin']), EventController.create);
router.delete('/:slug/events/:id', auth, checkCommunityRole(['moderator', 'admin']), EventController.delete);

module.exports = router;
