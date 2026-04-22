const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BadgeService = require('../services/badgeService');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { sendEmail, getEmailTemplate } = require('../services/emailService');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  process.exit(1);
}
const ACTUAL_SECRET = JWT_SECRET;

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password, email, globalName } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Eksik alanlar var' });
    }

    // Enhanced input validation
    if (typeof username !== 'string' || typeof password !== 'string' || typeof email !== 'string') {
      return res.status(400).json({ error: 'Geçersiz veri formatı' });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Kullanıcı adı 3-20 karakter arasında olmalıdır' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const existingUser = await User.findOne({ 
      $or: [{ username }, { email: email.toLowerCase() }] 
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'Kullanıcı adı veya e-posta zaten kullanımda.' });
      } else {
        // Doğrulanmamış askıda kalan hesabı temizle (DoS Vektörü kapandı)
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    const user = new User({ 
      username, 
      password, 
      email: email.toLowerCase(), 
      globalName, 
      isVerified: true // E-posta doğrulaması devre dışı bırakıldı
    });
    
    await user.save();

    // Giriş yapıp token ver (Doğrulama ekranını atlıyoruz)
    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion || 0 },
      ACTUAL_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        globalName: user.globalName
      }
    });
  } catch (error) {
    console.error('[Auth API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: error.message 
    });
  }
});

// Verify Email
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) return res.status(400).json({ error: 'Eksik parametreler' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.isVerified) return res.status(400).json({ error: 'Kullanıcı zaten doğrulandı.' });

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Hatalı doğrulama kodu.' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    // Giriş yapıp token ver
    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion || 0 },
      ACTUAL_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        globalName: user.globalName
      }
    });

  } catch (error) {
    console.error('[Verify API Error]', error);
    res.status(500).json({ error: 'Geçersiz doğrulama işlemi.' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Enhanced input validation
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Geçersiz veri formatı' });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Kullanıcı adı 3-20 karakter arasında olmalıdır' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }



    const now = new Date();
    const lastLogin = user.stats?.lastLoginDate ? new Date(user.stats.lastLoginDate) : null;
    
    if (!user.stats) user.stats = {};
    
    if (lastLogin) {
      // Start of today and start of last login day
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfLastLogin = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      
      const diffTime = startOfToday - startOfLastLogin;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Next day - increment streak
        user.stats.consecutiveLoginDays = (user.stats.consecutiveLoginDays || 0) + 1;
      } else if (diffDays > 1) {
        // More than one day - reset streak
        user.stats.consecutiveLoginDays = 1;
      }
      // If diffDays === 0 (same day), do nothing to the streak
    } else {
      user.stats.consecutiveLoginDays = 1;
    }
    
    user.stats.lastLoginDate = now;
    user.lastLogin = now;
    user.markModified('stats');
    await user.save();

    // Check badges on login (async to avoid blocking login)
    setImmediate(() => {
      BadgeService.checkBadges(user._id).catch(err => {
        console.error('Badge check error:', err);
      });
    });

    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion || 0 },
      ACTUAL_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        globalName: user.globalName
      }
    });
  } catch (error) {
    console.error('[Auth API Error]', error);
    res.status(500).json({ 
      error: 'İşlem başarısız.', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Forgot Password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Lütfen geçerli bir e-posta girin.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Güvenlik için e-posta bulunamasa da hata gibi göstermiyoruz.
      return res.json({ success: true, message: 'Eğer bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 saat geçerli
    await user.save();

    // Frontend URL formatı varsayımı:
    const resetUrl = `http://localhost:5173/#/reset-password/${resetToken}`;
    const content = `Şifreni sıfırlamak için bir talepte bulundun. Lütfen işlemi tamamlamak için aşağıdaki bağlantıya tıkla.`;
    const htmlEmail = getEmailTemplate('Şifre Sıfırlama', content, null) + 
      `<div style="text-align: center; margin-top: 20px;">
        <a href="${resetUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Şifremi Sıfırla</a>
      </div>`;

    await sendEmail(user.email, 'Game Tracker - Şifre Sıfırlama', htmlEmail);

    res.json({ success: true, message: 'Eğer bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.' });
  } catch (error) {
    console.error('Forgot PW error', error);
    res.status(500).json({ error: 'Hata oluştu' });
  }
});

// Reset Password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Geçersiz parametreler veya şifre çok kısa.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Bağlantı geçersiz veya süresi dolmuş.' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Eski girişleri düşürür

    await user.save();

    res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (error) {
    console.error('Reset PW error', error);
    res.status(500).json({ error: 'Şifre sıfırlanamadı.' });
  }
});

module.exports = router;
