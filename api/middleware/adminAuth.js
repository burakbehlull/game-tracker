const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  process.exit(1);
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check token version and user existence
    const user = await User.findById(decoded.userId).select('tokenVersion roles');
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired or password changed' });
    }

    // Check if user has admin role
    if (!user.roles || !user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.userId = decoded.userId;
    req.userRoles = user.roles;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
