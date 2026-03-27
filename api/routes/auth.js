const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is not set in production');
  process.exit(1);
}
const ACTUAL_SECRET = JWT_SECRET || 'dev-secret-unsafe';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, globalName } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Eksik alanlar var' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password, email, globalName });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
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

module.exports = router;
