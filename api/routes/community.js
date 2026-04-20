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
router.put('/:slug/settings', auth, checkCommunityRole(['admin']), CommunityController.updateSettings);
router.delete('/:slug', auth, checkCommunityRole(['owner']), CommunityController.deleteCommunity);

// Discussion Routes
router.get('/discussions/list', DiscussionController.getByCommunity);
router.get('/discussions/pending', auth, DiscussionController.getPending);
router.get('/discussions/:id', DiscussionController.getById);
router.post('/discussions', auth, DiscussionController.create);
router.post('/discussions/:id/approve', auth, DiscussionController.approve);
router.delete('/discussions/:id', auth, DiscussionController.delete);

// Comment Routes
router.get('/discussions/:discussionId/comments', DiscussionController.getComments);
router.post('/discussions/:discussionId/comments', auth, DiscussionController.createComment);
router.delete('/comments/:id', auth, DiscussionController.deleteComment);

// Event Routes
router.get('/events/list', EventController.getByCommunity);
router.post('/events', auth, checkCommunityRole(['admin']), EventController.create);
router.delete('/events/:id', auth, checkCommunityRole(['admin']), EventController.delete);

module.exports = router;
