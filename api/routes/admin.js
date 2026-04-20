const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminLoginAttempt = require('../models/AdminLoginAttempt');
const GameSession = require('../models/GameSession');
const adminAuth = require('../middleware/adminAuth');

const JWT_SECRET = process.env.JWT_SECRET;

// Admin Login with attempt tracking
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Input validation
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Geçersiz giriş bilgileri' });
    }

    // Check failed attempts in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const failedAttempts = await AdminLoginAttempt.countDocuments({
      username,
      success: false,
      attemptTime: { $gte: tenMinutesAgo }
    });

    if (failedAttempts >= 5) {
      // Log this attempt as failed
      await AdminLoginAttempt.create({
        username,
        ipAddress,
        success: false
      });
      
      return res.status(429).json({ 
        error: 'Çok fazla başarısız giriş denemesi. Hesap 10 dakika kilitlendi.',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000)
      });
    }

    // Find user and verify credentials
    const user = await User.findOne({ username });
    
    if (!user || !(await user.comparePassword(password))) {
      // Log failed attempt
      await AdminLoginAttempt.create({
        username,
        ipAddress,
        success: false
      });
      
      const remainingAttempts = 5 - (failedAttempts + 1);
      return res.status(401).json({ 
        error: 'Kullanıcı adı veya şifre hatalı',
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      });
    }

    // Check if user has admin role
    if (!user.roles || !user.roles.includes('admin')) {
      await AdminLoginAttempt.create({
        username,
        ipAddress,
        success: false
      });
      
      return res.status(403).json({ error: 'Bu hesap admin yetkisine sahip değil' });
    }

    // Successful login - log it
    await AdminLoginAttempt.create({
      username,
      ipAddress,
      success: true
    });

    // Clear old failed attempts for this user
    await AdminLoginAttempt.deleteMany({
      username,
      success: false,
      attemptTime: { $lt: tenMinutesAgo }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion || 0, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('[Admin Login Error]', error);
    res.status(500).json({ error: 'Giriş işlemi başarısız' });
  }
});

// Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalSessions,
      recentUsers,
      topGames
    ] = await Promise.all([
      User.countDocuments({ roles: 'user' }),
      User.countDocuments({ roles: 'admin' }),
      GameSession.countDocuments(),
      User.find()
        .select('username email createdAt lastLogin level xp')
        .sort({ createdAt: -1 })
        .limit(10),
      GameSession.aggregate([
        {
          $group: {
            _id: '$gameName',
            totalSessions: { $sum: 1 },
            totalMinutes: { $sum: '$durationMinutes' }
          }
        },
        { $sort: { totalSessions: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalSessions,
      recentUsers,
      topGames
    });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

// Get all users with pagination
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search 
      ? { 
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email roles createdAt lastLogin level xp isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Users Error]', error);
    res.status(500).json({ error: 'Kullanıcılar yüklenemedi' });
  }
});

// Get user details
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const sessions = await GameSession.find({ userId: user._id })
      .sort({ startTime: -1 })
      .limit(50);

    res.json({ user, sessions });
  } catch (error) {
    console.error('[Admin User Detail Error]', error);
    res.status(500).json({ error: 'Kullanıcı detayları yüklenemedi' });
  }
});

// Update user role
router.put('/users/:userId/role', adminAuth, async (req, res) => {
  try {
    const { roles } = req.body; // Expect an array of roles
    
    if (!Array.isArray(roles) || roles.some(r => !['user', 'admin', 'moderator'].includes(r))) {
      return res.status(400).json({ error: 'Geçersiz roller' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { roles },
      { new: true }
    ).select('username email roles');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user, message: 'Kullanıcı rolleri güncellendi' });
  } catch (error) {
    console.error('[Admin Update Role Error]', error);
    res.status(500).json({ error: 'Roller güncellenemedi' });
  }
});

// Delete user
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Delete user's game sessions
    await GameSession.deleteMany({ userId: user._id });

    res.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('[Admin Delete User Error]', error);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Get all game sessions with pagination
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      GameSession.find()
        .populate('userId', 'username email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit),
      GameSession.countDocuments()
    ]);

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Sessions Error]', error);
    res.status(500).json({ error: 'Oturumlar yüklenemedi' });
  }
});

module.exports = router;
