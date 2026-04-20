const Event = require('../models/Event');

class EventController {
  static async getByCommunity(req, res) {
    try {
      const { communityId } = req.query;
      const events = await Event.find({ communityId })
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
      const { communityId, title, description, date } = req.body;
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
      await Event.findByIdAndDelete(id);
      res.json({ message: 'Event deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = EventController;
