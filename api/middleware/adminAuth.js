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
    const user = await User.findById(decoded.userId).select('tokenVersion role roles rol');
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired or password changed' });
    }

    // Check if user has admin role (handle 'role' array and legacy plural fields)
    let userRole = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
    
    // Check plural fields for safety
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(r => { if (!userRole.includes(r)) userRole.push(r); });
    }
    if (user.rol && Array.isArray(user.rol)) {
      user.rol.forEach(r => { if (!userRole.includes(r)) userRole.push(r); });
    }

    if (!userRole.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.userId = decoded.userId;
    req.userRoles = userRole;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
