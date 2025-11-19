const crypto = require('crypto');
const datastore = require('../datastore');

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateEventPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (!isUpdate && (!payload.date || !isISODate(payload.date))) {
    errors.push({ field: 'date', message: 'date is required and must be a valid date string' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.date && !isISODate(payload.date)) {
    errors.push({ field: 'date', message: 'date must be a valid date string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.type && typeof payload.type !== 'string') {
    errors.push({ field: 'type', message: 'type must be a string' });
  }
  return { valid: errors.length === 0, errors };
}

const eventsController = {
  getEvents: async (req, res) => {
    try {
      const events = datastore.get('events') || [];
      res.json({ success: true, message: 'Events retrieved successfully', data: events, count: events.length });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving events', error: error.message });
    }
  },

  getEventById: async (req, res) => {
    try {
      const { id } = req.params;
      const events = datastore.get('events') || [];
      const event = events.find(e => e.id === id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      res.json({ success: true, message: 'Event retrieved successfully', data: event });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving event', error: error.message });
    }
  },

  createEvent: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateEventPayload(payload, false);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid event payload', errors });

      const newEvent = {
        id: `e_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`,
        title: payload.title.trim(),
        date: new Date(payload.date).toISOString(),
        subject: payload.subject || null,
        type: payload.type || 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await datastore.update('events', (events) => {
        const arr = Array.isArray(events) ? events : [];
        return [...arr, newEvent];
      });

      res.status(201).json({ success: true, message: 'Event created successfully', data: newEvent });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating event', error: error.message });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      let existed = false;
      await datastore.update('events', (events) => {
        const arr = Array.isArray(events) ? events : [];
        const before = arr.length;
        const filtered = arr.filter(e => e.id !== id);
        existed = before !== filtered.length;
        return filtered;
      });

      if (!existed) return res.status(404).json({ success: false, message: 'Event not found' });

      res.json({ success: true, message: 'Event deleted successfully', data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting event', error: error.message });
    }
  }
};

module.exports = eventsController;
