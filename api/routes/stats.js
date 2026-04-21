const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const GameSession = require('../models/GameSession');

const router = express.Router();

// Cache for global stats
let globalStatsCache = {
  data: null,
  lastFetched: 0
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper function to calculate date ranges
function getDateRanges() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const monthStart = new Date(now);
  monthStart.setMonth(now.getMonth() - 1);
  
  return { now, weekStart, monthStart };
}

// Get global statistics
router.get('/global', async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (globalStatsCache.data && (now - globalStatsCache.lastFetched < CACHE_TTL)) {
      return res.json(globalStatsCache.data);
    }

    // Total users
    const totalUsers = await User.countDocuments();
    
    // Total unique games played across all users
    const uniqueGames = await GameSession.distinct('gameName');
    const totalUniqueGames = uniqueGames.length;

    // Total play time (in seconds) - summing up all durations
    const totalPlayTime = await GameSession.aggregate([
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);
    
    const totalSeconds = totalPlayTime.length > 0 ? totalPlayTime[0].totalDuration : 0;
    const totalHours = Math.floor(totalSeconds / 3600);
    
    const responseData = {
      totalUsers,
      totalUniqueGames,
      totalPlaySeconds: totalSeconds,
      totalPlayHours: totalHours
    };

    // Update cache
    globalStatsCache = {
      data: responseData,
      lastFetched: now
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('[Stats API Error]', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// Get top games by time period
router.get('/top-games/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { now, weekStart, monthStart } = getDateRanges();
    
    let startDate;
    if (period === 'week') {
      startDate = weekStart;
    } else if (period === 'month') {
      startDate = monthStart;
    } else {
      return res.status(400).json({ error: 'Invalid period. Use "week" or "month"' });
    }
    
    const topGames = await GameSession.aggregate([
      {
        $match: {
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$gameName',
          totalDuration: { $sum: '$duration' },
          sessionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalDuration: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          gameName: '$_id',
          totalDuration: 1,
          sessionCount: 1,
          totalHours: { $round: [{ $divide: ['$totalDuration', 60] }, 1] }
        }
      }
    ]);
    
    res.json(topGames);
  } catch (error) {
    console.error('[Stats API Error]', error);
    res.status(500).json({ error: 'Oyun istatistikleri alınamadı' });
  }
});

// Get most active users by time period
router.get('/active-users/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { now, weekStart, monthStart } = getDateRanges();
    
    let startDate;
    if (period === 'week') {
      startDate = weekStart;
    } else if (period === 'month') {
      startDate = monthStart;
    } else {
      return res.status(400).json({ error: 'Invalid period. Use "week" or "month"' });
    }
    
    const activeUsers = await GameSession.aggregate([
      {
        $match: {
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalDuration: { $sum: '$duration' },
          sessionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalDuration: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          globalName: '$user.globalName',
          avatar: '$user.avatar',
          level: '$user.level',
          xp: '$user.xp',
          totalDuration: 1,
          sessionCount: 1,
          totalHours: { $round: [{ $divide: ['$totalDuration', 60] }, 1] }
        }
      }
    ]);
    
    res.json(activeUsers);
  } catch (error) {
    console.error('[Stats API Error]', error);
    res.status(500).json({ error: 'Aktif kullanıcılar alınamadı' });
  }
});

module.exports = router;
