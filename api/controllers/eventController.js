const Event = require('../models/Event');
const Community = require('../models/Community');

class EventController {
  static async getByCommunity(req, res) {
    try {
      const slug = req.params.slug?.toLowerCase();
      const community = await Community.findOne({ slug });
      if (!community) return res.status(404).json({ error: 'Community not found' });

      const events = await Event.find({ communityId: community._id })
        .sort({ date: 1 })
        .populate('createdBy', 'username avatar')
        .lean();
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { title, description, date } = req.body;
      const communityId = req.community._id; // Set from checkCommunityRole middleware
      const event = new Event({
        communityId,
        createdBy: req.userId,
        title,
        description,
        date
      });
      await event.save();
      const populated = await event.populate('createdBy', 'username avatar');
      res.status(201).json(populated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const event = await Event.findById(id);
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // Permission check: Creator OR (Admin/Mod/Owner of community)
      // Note: req.community and req.userRole are set by checkCommunityRole middleware
      const isCreator = event.createdBy.toString() === req.userId;
      const isStaff = ['owner', 'admin', 'moderator'].includes(req.userRole);

      if (!isCreator && !isStaff) {
        return res.status(403).json({ error: 'You do not have permission to delete this event' });
      }

      await Event.findByIdAndDelete(id);
      res.json({ message: 'Event deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = EventController;
