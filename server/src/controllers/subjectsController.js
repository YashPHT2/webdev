const crypto = require('crypto');
const datastore = require('../datastore');

function validateSubjectPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0)) {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  if (payload.name && typeof payload.name !== 'string') {
    errors.push({ field: 'name', message: 'Name must be a string' });
  }
  if (payload.color && typeof payload.color !== 'string') {
    errors.push({ field: 'color', message: 'Color must be a string' });
  }
  return { valid: errors.length === 0, errors };
}

const subjectsController = {
  getAll: async (req, res) => {
    try {
      const subjects = datastore.get('subjects') || [];
      res.json({ success: true, message: 'Subjects retrieved successfully', data: subjects, count: subjects.length });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving subjects', error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const subjects = datastore.get('subjects') || [];
      const subject = subjects.find(s => s.id === id);
      if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
      res.json({ success: true, message: 'Subject retrieved successfully', data: subject });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving subject', error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateSubjectPayload(payload, false);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid subject payload', errors });

      const newSubject = {
        id: `s_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`,
        name: payload.name.trim(),
        color: payload.color || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await datastore.update('subjects', (subjects) => {
        const arr = Array.isArray(subjects) ? subjects : [];
        return [...arr, newSubject];
      });

      res.status(201).json({ success: true, message: 'Subject created successfully', data: newSubject });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating subject', error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateSubjectPayload(updates, true);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid subject payload', errors });

      let updated = null;
      await datastore.update('subjects', (subjects) => {
        const arr = Array.isArray(subjects) ? subjects : [];
        const idx = arr.findIndex(s => s.id === id);
        if (idx === -1) return arr;
        const next = { ...arr[idx], ...updates };
        if (updates.name) next.name = updates.name.trim();
        next.updatedAt = new Date().toISOString();
        arr[idx] = next;
        updated = next;
        return arr;
      });

      if (!updated) return res.status(404).json({ success: false, message: 'Subject not found' });

      res.json({ success: true, message: 'Subject updated successfully', data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating subject', error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      let existed = false;
      await datastore.update('subjects', (subjects) => {
        const arr = Array.isArray(subjects) ? subjects : [];
        const before = arr.length;
        const filtered = arr.filter(s => s.id !== id);
        existed = before !== filtered.length;
        return filtered;
      });

      if (!existed) return res.status(404).json({ success: false, message: 'Subject not found' });

      res.json({ success: true, message: 'Subject deleted successfully', data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting subject', error: error.message });
    }
  }
};

module.exports = subjectsController;
