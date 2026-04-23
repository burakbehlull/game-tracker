const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    const cleanGameName = (gameName || '').trim().toLowerCase();

    // Sadece sıraya gir, eşleşmeyi polling'e bırak (Daha sağlam)
    await MatchQueue.deleteMany({ userId });
    await MatchQueue.create({
      userId,
      gameName: cleanGameName,
      matchedWith: null,
      conversationId: null
    });

    console.log(`[MATCH_JOIN] User ${userId} added to queue for: "${cleanGameName}"`);
    res.json({ matched: false, message: 'Searching...' });
  } catch (error) {
    console.error('[MATCH_JOIN_ERROR]', error);
    res.status(500).json({ error: 'Eşleştirme başlatılamadı' });
  }
});

// Instant Matchmaking - Check Status
router.get('/instant/status', auth, async (req, res) => {
  const userId = req.userId;
  try {
    // 1. Kendi kaydımı bul
    const myRecord = await MatchQueue.findOne({ userId });
    
    if (!myRecord) {
       console.log(`[MATCH_STATUS] No record found for user ${userId}. They might have been deleted or never joined.`);
       return res.status(404).json({ error: 'Not in queue' });
    }

    // 2. Eğer zaten eşleşmişsem (Biri beni bulmuş ve conversation kurmuş)
    if (myRecord.matchedWith && myRecord.conversationId) {
      console.log(`[MATCH_SUCCESS] User ${userId} was matched by partner ${myRecord.matchedWith}`);
      
      const otherUser = await User.findById(myRecord.matchedWith).select('username avatar level globalName xp library');
      const conversationId = myRecord.conversationId;
      
      // Kaydı siliyoruz (Eşleşme tamamlandı)
      await MatchQueue.deleteOne({ _id: myRecord._id });
      
      return res.json({ 
        matched: true, 
        otherUser: otherUser ? {
          ...otherUser.toObject(),
          commonGames: []
        } : null, 
        conversationId 
      });
    }

    // 3. Ben birini bulmaya çalışayım
    const me = await User.findById(userId).select('blockedUsers');
    const myBlocks = (me?.blockedUsers || []).map(id => id.toString());
    const whoBlockedMe = (await User.find({ blockedUsers: userId }).select('_id')).map(u => u._id.toString());
    const excludeIds = [...new Set([userId.toString(), ...myBlocks, ...whoBlockedMe])];

    const validExcludeIds = excludeIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));

    let matchQuery = {
      userId: { $nin: validExcludeIds },
      matchedWith: null
    };

    if (myRecord.gameName) {
      matchQuery.$or = [{ gameName: myRecord.gameName }, { gameName: '' }];
    }

    // Atomik rezerve
    const partner = await MatchQueue.findOneAndUpdate(
      matchQuery,
      { matchedWith: new mongoose.Types.ObjectId(userId) },
      { new: true, sort: { createdAt: 1 } }
    );

    if (partner) {
      console.log(`[MATCH_FOUND] User ${userId} found partner ${partner.userId}. Creating conversation...`);
      
      try {
        let conversation = await Conversation.findOne({
          type: 'dm',
          participants: { $all: [new mongoose.Types.ObjectId(userId), partner.userId], $size: 2 }
        });

        if (!conversation) {
          conversation = await Conversation.create({
            type: 'dm',
            participants: [new mongoose.Types.ObjectId(userId), partner.userId],
            createdBy: new mongoose.Types.ObjectId(userId)
          });
        }

        // Partnerin kaydını güncelle
        partner.conversationId = conversation._id;
        await partner.save();

        const otherUser = await User.findById(partner.userId).select('username avatar level globalName xp library');
        
        // Kendi kaydımı sil
        await MatchQueue.deleteOne({ _id: myRecord._id });

        return res.json({ 
          matched: true, 
          otherUser: otherUser ? {
            ...otherUser.toObject(),
            commonGames: partner.gameName ? [partner.gameName] : []
          } : null, 
          conversationId: conversation._id 
        });
      } catch (convError) {
        console.error('[MATCH_CONV_ERROR] Error creating conversation for match:', convError);
        // Hata durumunda partneri serbest bırak ki başkasıyla eşleşebilsin
        partner.matchedWith = null;
        await partner.save();
        throw convError;
      }
    }

    // Hala aranıyor
    res.json({ matched: false });
  } catch (error) {
    console.error('[MATCH_STATUS_500] Critical error in status check:', error);
    res.status(500).json({ 
      error: 'Status error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id').lean();
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

    // If not enough matches found, add some active users as fallback (even if gameName was requested)
    if (matchesWithCommonGames.length < 15) {
      const currentMatchIds = matchesWithCommonGames.map(m => String(m._id));
      const fallbackExcludeIds = [...new Set([...finalExcludeIds, ...currentMatchIds])];
      
      // Get some random active users who haven't been matched yet
      const fallbackMatches = await User.aggregate([
        { $match: { 
          _id: { $nin: fallbackExcludeIds.map(id => new mongoose.Types.ObjectId(id)) },
          'settings.privacy.passiveMatchmakingEnabled': { $ne: false }
        }},
        { $sample: { size: 20 } }, // Randomly sample users
        { $project: { username: 1, globalName: 1, avatar: 1, level: 1, xp: 1, library: 1, lastLogin: 1 } }
      ]);
      
      const fallbacks = fallbackMatches.map(match => {
        const matchLibrary = match.library || [];
        const commonGames = matchLibrary
          .filter(g => g.gameName && currentUserGames.includes(g.gameName.toLowerCase()))
          .map(g => g.gameName);
          
        return {
          ...match,
          commonGames,
          library: undefined
        };
      });
      
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
