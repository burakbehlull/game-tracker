const Community = require('../models/Community');

/**
 * Middleware to check community roles
 * @param {string[]} roles - Array of roles allowed ('owner', 'admin', 'moderator', 'member')
 */
const checkCommunityRole = (roles) => {
  return async (req, res, next) => {
    try {
      const slug = req.params.slug?.toLowerCase();
      const userId = req.userId;

      const community = await Community.findOne({ slug });
      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }

      let userRole = null;

      const isMatch = (array, id) => {
        if (!Array.isArray(array)) return false;
        return array.some(item => item.toString() === id.toString());
      };

      if (community.ownerId.toString() === userId) {
        userRole = 'owner';
      } else if (isMatch(community.admins, userId)) {
        userRole = 'admin';
      } else if (isMatch(community.moderators, userId)) {
        userRole = 'moderator';
      } else if (isMatch(community.members, userId)) {
        userRole = 'member';
      }

      if (!userRole || (!roles.includes(userRole) && userRole !== 'owner')) {
        // Owner is always allowed if they are in the roles or if any role is specified
        // But if roles is ['admin'] and user is 'moderator', they are denied.
        // We usually want owner to have all permissions.
        if (userRole === 'owner') {
          req.community = community;
          req.userRole = userRole;
          return next();
        }
        
        return res.status(403).json({ error: 'Insufficient permissions in this community' });
      }

      req.community = community;
      req.userRole = userRole;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

module.exports = { checkCommunityRole };
