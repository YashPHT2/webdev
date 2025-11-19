const crypto = require('crypto');
const datastore = require('../datastore');

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateAssessmentPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.date && !isISODate(payload.date)) {
    errors.push({ field: 'date', message: 'date must be a valid date string' });
  }
  if (payload.status && !['upcoming', 'completed', 'overdue', 'unscheduled'].includes(payload.status)) {
    errors.push({ field: 'status', message: 'Invalid status' });
  }
  if (payload.scoreHistory && !Array.isArray(payload.scoreHistory)) {
    errors.push({ field: 'scoreHistory', message: 'scoreHistory must be an array of numbers' });
  }
  if (Array.isArray(payload.scoreHistory) && payload.scoreHistory.some(n => typeof n !== 'number')) {
    errors.push({ field: 'scoreHistory', message: 'scoreHistory must contain only numbers' });
  }
  if (payload.resources && !Array.isArray(payload.resources)) {
    errors.push({ field: 'resources', message: 'resources must be an array' });
  }
  return { valid: errors.length === 0, errors };
}

function computeStatus(a) {
  const now = Date.now();
  if (a.status === 'completed') return 'completed';
  if (!a.date) return a.status || 'unscheduled';
  const t = new Date(a.date).getTime();
  if (isNaN(t)) return a.status || 'unscheduled';
  return t >= now ? 'upcoming' : 'overdue';
}

const assessmentsController = {
  getAssessments: async (req, res) => {
    try {
      const { subject, from, to, status } = req.query || {};
      let assessments = datastore.get('assessments') || [];

      // Filtering
      if (subject) {
        assessments = assessments.filter(a => (a.subject || '').toLowerCase() === String(subject).toLowerCase());
      }
      if (from) {
        const fromTime = new Date(from).getTime();
        if (!isNaN(fromTime)) assessments = assessments.filter(a => a.date && new Date(a.date).getTime() >= fromTime);
      }
      if (to) {
        const toTime = new Date(to).getTime();
        if (!isNaN(toTime)) assessments = assessments.filter(a => a.date && new Date(a.date).getTime() <= toTime);
      }
      if (status) {
        const st = String(status).toLowerCase();
        assessments = assessments.filter(a => computeStatus(a) === st);
      }

      // Sort by date ascending (nulls last)
      assessments.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : Infinity;
        const tb = b.date ? new Date(b.date).getTime() : Infinity;
        return ta - tb;
      });

      res.json({ success: true, message: 'Assessments retrieved successfully', data: assessments, count: assessments.length });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving assessments', error: error.message });
    }
  },

  getAssessmentById: async (req, res) => {
    try {
      const { id } = req.params;
      const assessments = datastore.get('assessments') || [];
      const found = assessments.find(a => a.id === id);
      if (!found) return res.status(404).json({ success: false, message: 'Assessment not found' });
      res.json({ success: true, message: 'Assessment retrieved successfully', data: found });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving assessment', error: error.message });
    }
  },

  createAssessment: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateAssessmentPayload(payload, false);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid assessment payload', errors });

      const nowIso = new Date().toISOString();
      const newAssessment = {
        id: `a_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`,
        title: payload.title.trim(),
        subject: payload.subject || null,
        date: payload.date ? new Date(payload.date).toISOString() : null,
        status: payload.status || undefined,
        weight: typeof payload.weight === 'number' ? payload.weight : null,
        scoreHistory: Array.isArray(payload.scoreHistory) ? payload.scoreHistory : [],
        resources: Array.isArray(payload.resources) ? payload.resources : [],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await datastore.update('assessments', (assessments) => {
        const arr = Array.isArray(assessments) ? assessments : [];
        return [...arr, newAssessment];
      });

      res.status(201).json({ success: true, message: 'Assessment created successfully', data: newAssessment });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating assessment', error: error.message });
    }
  },

  updateAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateAssessmentPayload(updates, true);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid assessment payload', errors });

      let updated = null;
      await datastore.update('assessments', (assessments) => {
        const arr = Array.isArray(assessments) ? assessments : [];
        const idx = arr.findIndex(a => a.id === id);
        if (idx === -1) return arr;
        const existing = arr[idx];
        const next = { ...existing, ...updates };
        if (updates.title) next.title = updates.title.trim();
        if (updates.date) next.date = new Date(updates.date).toISOString();
        next.updatedAt = new Date().toISOString();
        arr[idx] = next;
        updated = next;
        return arr;
      });

      if (!updated) return res.status(404).json({ success: false, message: 'Assessment not found' });
      res.json({ success: true, message: 'Assessment updated successfully', data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating assessment', error: error.message });
    }
  },

  deleteAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      let existed = false;
      await datastore.update('assessments', (assessments) => {
        const arr = Array.isArray(assessments) ? assessments : [];
        const before = arr.length;
        const filtered = arr.filter(a => a.id !== id);
        existed = before !== filtered.length;
        return filtered;
      });
      if (!existed) return res.status(404).json({ success: false, message: 'Assessment not found' });
      res.json({ success: true, message: 'Assessment deleted successfully', data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting assessment', error: error.message });
    }
  }
};

module.exports = assessmentsController;
