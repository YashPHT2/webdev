const datastore = require('../datastore');

function isValidTime(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function validateTimetablePayload(payload) {
  const errors = [];
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({ field: 'root', message: 'Payload must be an object' });
    return { valid: false, errors };
  }
  if (payload.days != null && typeof payload.days !== 'object') {
    errors.push({ field: 'days', message: 'days must be an object keyed by weekday' });
  }
  if (payload.days && typeof payload.days === 'object') {
    for (const [day, blocks] of Object.entries(payload.days)) {
      if (!Array.isArray(blocks)) {
        errors.push({ field: `days.${day}`, message: 'Each day must be an array of blocks' });
        continue;
      }
      blocks.forEach((b, idx) => {
        if (!b || typeof b !== 'object') {
          errors.push({ field: `days.${day}[${idx}]`, message: 'Block must be an object' });
          return;
        }
        if (b.subject != null && typeof b.subject !== 'string') {
          errors.push({ field: `days.${day}[${idx}].subject`, message: 'subject must be a string' });
        }
        if (b.start != null && !isValidTime(b.start)) {
          errors.push({ field: `days.${day}[${idx}].start`, message: 'start must be HH:MM (24h)' });
        }
        if (b.end != null && !isValidTime(b.end)) {
          errors.push({ field: `days.${day}[${idx}].end`, message: 'end must be HH:MM (24h)' });
        }
        if (b.start && b.end && isValidTime(b.start) && isValidTime(b.end)) {
          const [sh, sm] = b.start.split(':').map(Number);
          const [eh, em] = b.end.split(':').map(Number);
          const s = sh * 60 + sm; const e = eh * 60 + em;
          if (e <= s) {
            errors.push({ field: `days.${day}[${idx}].end`, message: 'end must be after start' });
          }
        }
        if (b.color != null && typeof b.color !== 'string') {
          errors.push({ field: `days.${day}[${idx}].color`, message: 'color must be a string' });
        }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

const timetableController = {
  getTimetable: async (req, res) => {
    try {
      const current = datastore.get('timetable');
      const timetable = current || { version: 1, weekStart: new Date().toISOString(), days: {}, updatedAt: new Date().toISOString() };
      res.json({
        success: true,
        message: 'Timetable retrieved successfully',
        data: timetable
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving timetable', error: error.message });
    }
  },

  upsertTimetable: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateTimetablePayload(payload);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid timetable payload', errors });
      }

      let saved = null;
      let conflict = false;

      await datastore.update('timetable', (current) => {
        const base = current || { version: 1, weekStart: new Date().toISOString(), days: {}, updatedAt: new Date().toISOString() };
        const clientVersion = typeof payload.version === 'number' ? payload.version : null;
        if (clientVersion != null && clientVersion !== base.version) {
          conflict = true;
          return base; // no change
        }
        const next = {
          version: (base.version || 0) + 1,
          weekStart: payload.weekStart || base.weekStart || new Date().toISOString(),
          days: payload.days ? payload.days : (base.days || {}),
          updatedAt: new Date().toISOString()
        };
        saved = next;
        return next;
      });

      if (conflict) {
        const latest = datastore.get('timetable');
        return res.status(409).json({ success: false, conflict: true, message: 'Version conflict', data: latest });
      }

      res.json({ success: true, message: 'Timetable saved successfully', data: saved });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error saving timetable', error: error.message });
    }
  }
};

module.exports = timetableController;
