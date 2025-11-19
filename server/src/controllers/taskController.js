const crypto = require('crypto');
const datastore = require('../datastore');

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'];

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateTaskPayload(payload, isUpdate = false) {
  const errors = [];
  if (!isUpdate && (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0)) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (payload.title && typeof payload.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  }
  if (payload.description && typeof payload.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }
  if (payload.subject && typeof payload.subject !== 'string') {
    errors.push({ field: 'subject', message: 'Subject must be a string' });
  }
  if (payload.priority && !PRIORITIES.includes(payload.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${PRIORITIES.join(', ')}` });
  }
  if (payload.status && !STATUSES.includes(payload.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  if (payload.dueDate && !isISODate(payload.dueDate)) {
    errors.push({ field: 'dueDate', message: 'dueDate must be a valid date string' });
  }
  if (payload.estimatedDuration != null && typeof payload.estimatedDuration !== 'number') {
    errors.push({ field: 'estimatedDuration', message: 'estimatedDuration must be a number (minutes)' });
  }
  if (payload.actualDuration != null && typeof payload.actualDuration !== 'number') {
    errors.push({ field: 'actualDuration', message: 'actualDuration must be a number (minutes)' });
  }
  if (payload.tags && !Array.isArray(payload.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of strings' });
  }
  return { valid: errors.length === 0, errors };
}

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      const tasks = datastore.get('tasks') || [];
      res.json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving tasks',
        error: error.message
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const tasks = datastore.get('tasks') || [];
      const task = tasks.find(t => t.id === id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, message: 'Task retrieved successfully', data: task });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving task',
        error: error.message
      });
    }
  },

  createTask: async (req, res) => {
    try {
      const payload = req.body || {};
      const { valid, errors } = validateTaskPayload(payload, false);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid task payload', errors });
      }

      const newTask = {
        id: `t_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`,
        title: payload.title.trim(),
        description: payload.description || '',
        subject: payload.subject || null,
        dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
        priority: payload.priority || 'Medium',
        urgency: payload.urgency || null,
        difficulty: payload.difficulty || null,
        status: payload.status || 'pending',
        estimatedDuration: typeof payload.estimatedDuration === 'number' ? payload.estimatedDuration : null,
        actualDuration: typeof payload.actualDuration === 'number' ? payload.actualDuration : null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        notes: payload.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await datastore.update('tasks', (tasks) => {
        const arr = Array.isArray(tasks) ? tasks : [];
        return [...arr, newTask];
      });

      res.status(201).json({ success: true, message: 'Task created successfully', data: newTask });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating task',
        error: error.message
      });
    }
  },

  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const { valid, errors } = validateTaskPayload(updates, true);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid task payload', errors });
      }

      let updatedTask = null;
      await datastore.update('tasks', (tasks) => {
        const arr = Array.isArray(tasks) ? tasks : [];
        const idx = arr.findIndex(t => t.id === id);
        if (idx === -1) return arr;
        const existing = arr[idx];
        const next = { ...existing, ...updates };
        if (updates.title) next.title = updates.title.trim();
        if (updates.dueDate) next.dueDate = new Date(updates.dueDate).toISOString();
        next.updatedAt = new Date().toISOString();
        arr[idx] = next;
        updatedTask = next;
        return arr;
      });

      if (!updatedTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      res.json({ success: true, message: 'Task updated successfully', data: updatedTask });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating task',
        error: error.message
      });
    }
  },

  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      let existed = false;
      await datastore.update('tasks', (tasks) => {
        const arr = Array.isArray(tasks) ? tasks : [];
        const before = arr.length;
        const filtered = arr.filter(t => t.id !== id);
        existed = before !== filtered.length;
        return filtered;
      });

      if (!existed) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      res.json({ success: true, message: 'Task deleted successfully', data: { id } });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting task',
        error: error.message
      });
    }
  }
};

module.exports = taskController;
