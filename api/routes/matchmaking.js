const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const FriendRequest = require('../models/FriendRequest');
const MatchQueue = require('../models/MatchQueue');
const Conversation = require('../models/Conversation');

// Instant Matchmaking - Join Queue
router.post('/instant/join', auth, async (req, res) => {
  try {
    const { gameName } = req.body;
    const userId = req.userId;

    // Remove if already in queue
    await MatchQueue.findOneAndDelete({ userId });

    // Try to find a match in the queue
    const match = await MatchQueue.findOne({
      userId: { $ne: userId },
      gameName: gameName || '',
      matchedWith: null
    }).sort({ createdAt: 1 });

    if (match) {
      // Create a DM conversation for the matched users
      let conversation = await Conversation.findOne({
        type: 'dm',
        participants: { $all: [userId, match.userId], $size: 2 }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: 'dm',
          participants: [userId, match.userId]
        });
      }

      // Update the match in the queue
      match.matchedWith = userId;
      match.conversationId = conversation._id;
      await match.save();

      // Return match info
      const otherUser = await User.findById(match.userId).select('username avatar level');
      return res.json({ 
        matched: true, 
        otherUser, 
        conversationId: conversation._id 
      });
    }

    // No match found, add to queue
    await MatchQueue.create({
      userId,
      gameName: gameName || ''
    });

    res.json({ matched: false, message: 'Sıraya girildi, eşleşme bekleniyor...' });
  } catch (error) {
    console.error('[Instant Join Error]', error);
    res.status(500).json({ error: 'Sıraya girilemedi' });
  }
});

// Instant Matchmaking - Check Status
router.get('/instant/status', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const myQueueEntry = await MatchQueue.findOne({ userId });

    if (!myQueueEntry) {
      return res.status(404).json({ error: 'Sırada değilsiniz' });
    }

    if (myQueueEntry.matchedWith) {
      const otherUser = await User.findById(myQueueEntry.matchedWith).select('username avatar level');
      const conversationId = myQueueEntry.conversationId;
      
      // Remove from queue after finding match
      await MatchQueue.findByIdAndDelete(myQueueEntry._id);
      
      return res.json({ 
        matched: true, 
        otherUser, 
        conversationId 
      });
    }

    res.json({ matched: false });
  } catch (error) {
    console.error('[Instant Status Error]', error);
    res.status(500).json({ error: 'Durum kontrol edilemedi' });
  }
});

// Instant Matchmaking - Leave Queue
router.post('/instant/leave', auth, async (req, res) => {
  try {
    await MatchQueue.findOneAndDelete({ userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Sıradan çıkılamadı' });
  }
});

// Matchmaking - Find friends based on common games or general
router.get('/match', auth, async (req, res) => {
  try {
    const { gameName } = req.query;
    const userId = req.userId;

    // Get current user's library and friends to exclude them
    const currentUser = await User.findById(userId).select('library');
    if (!currentUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Get friend IDs and pending request IDs to exclude
    const friends = await Friendship.find({
      users: userId,
      deletedAt: null
    }).lean();
    
    const friendIds = friends.map(f => {
      if (!f.users || !Array.isArray(f.users)) return null;
      const otherId = f.users.find(id => String(id) !== String(userId));
      return otherId ? String(otherId) : null;
    }).filter(Boolean);

    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ],
      status: 'pending'
    }).lean();
    
    const pendingUserIds = pendingRequests.map(r => {
      const fromId = String(r.fromUserId);
      const toId = String(r.toUserId);
      return fromId === String(userId) ? toId : fromId;
    }).filter(Boolean);

    const excludeIds = [String(userId), ...friendIds, ...pendingUserIds];

    // Get current user's blocked list and who blocked the current user
    const userWithBlocks = await User.findById(userId).select('blockedUsers');
    const blockedByUserIds = (userWithBlocks.blockedUsers || []).map(id => String(id));
    
    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id');
    const whoBlockedMeIds = usersWhoBlockedMe.map(u => String(u._id));

    const finalExcludeIds = [...new Set([...excludeIds, ...blockedByUserIds, ...whoBlockedMeIds])];

    let query = {
      _id: { $nin: finalExcludeIds },
      'settings.privacy.passiveMatchmakingEnabled': { $ne: false } // Only users who have passive matchmaking enabled
    };

    if (gameName) {
      // Escape special characters in gameName for regex
      const escapedGameName = gameName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['library.gameName'] = { $regex: new RegExp(escapedGameName, 'i') };
    } else if (currentUser.library && currentUser.library.length > 0) {
      // Find users who have ANY of the games in current user's library
      const gameNames = currentUser.library.map(g => g.gameName);
      if (gameNames.length > 0) {
        query['library.gameName'] = { $in: gameNames };
      }
    }

    // Find matches
    const matches = await User.find(query)
      .select('username globalName avatar level xp library')
      .limit(50) // Increase limit for better matching
      .lean();

    const currentUserGames = (currentUser.library || []).map(g => (g.gameName || '').toLowerCase());
    
    // Process matches
    const matchesWithCommonGames = matches.map(match => {
      const matchLibrary = match.library || [];
      const commonGames = matchLibrary
        .filter(g => g.gameName && currentUserGames.includes(g.gameName.toLowerCase()))
        .map(g => g.gameName);
      
      return {
        ...match,
        commonGames,
        library: undefined // Remove full library for privacy/size
      };
    });

    // If no specific game requested and not enough common game matches found, 
    // add some active users as fallback
    if (!gameName && matchesWithCommonGames.length < 5) {
      const currentMatchIds = matchesWithCommonGames.map(m => String(m._id));
      const fallbackExcludeIds = [...excludeIds, ...currentMatchIds];
      
      const fallbackMatches = await User.find({
        _id: { $nin: fallbackExcludeIds }
      })
      .select('username globalName avatar level xp')
      .sort({ lastLogin: -1 })
      .limit(10 - matchesWithCommonGames.length)
      .lean();
      
      const fallbacks = fallbackMatches.map(m => ({ ...m, commonGames: [] }));
      return res.json([...matchesWithCommonGames, ...fallbacks]);
    }

    res.json(matchesWithCommonGames);
  } catch (error) {
    console.error('[Matchmaking API Error]', error);
    res.status(500).json({ 
      error: 'Eşleştirme sırasında bir hata oluştu',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
