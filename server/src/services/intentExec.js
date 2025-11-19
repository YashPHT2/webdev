const crypto = require('crypto');
const datastore = require('../datastore');

const INTENTS = Object.freeze([
  'create_task',
  'update_task',
  'complete_task',
  'create_subject',
  'none'
]);

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'];

function isISODate(val) {
  if (val == null) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function normalizeJsonText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Remove code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // If it looks like JSON, return as is
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  // Try to extract first JSON object
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function validateIntentResponse(obj) {
  const errors = [];
  if (typeof obj !== 'object' || obj == null) {
    return { valid: false, errors: ['Response is not an object'] };
  }
  if (!INTENTS.includes(obj.intent)) {
    errors.push(`intent must be one of: ${INTENTS.join(', ')}`);
  }
  if (typeof obj.payload !== 'object' || obj.payload == null) {
    errors.push('payload must be an object');
  }
  if (typeof obj.reply !== 'string' || obj.reply.trim().length === 0) {
    errors.push('reply must be a non-empty string');
  }
  if (errors.length) return { valid: false, errors };

  const payload = obj.payload || {};
  switch (obj.intent) {
    case 'create_task': {
      if (!payload.title || typeof payload.title !== 'string') errors.push('create_task.title is required string');
      if (payload.dueDate && !isISODate(payload.dueDate)) errors.push('create_task.dueDate must be ISO date string');
      if (payload.priority && !PRIORITIES.includes(payload.priority)) errors.push(`create_task.priority must be one of: ${PRIORITIES.join(', ')}`);
      break;
    }
    case 'update_task': {
      if (!payload.id || typeof payload.id !== 'string') errors.push('update_task.id is required string');
      if (payload.dueDate && !isISODate(payload.dueDate)) errors.push('update_task.dueDate must be ISO date string');
      if (payload.priority && !PRIORITIES.includes(payload.priority)) errors.push(`update_task.priority must be one of: ${PRIORITIES.join(', ')}`);
      if (payload.status && !STATUSES.includes(payload.status)) errors.push(`update_task.status must be one of: ${STATUSES.join(', ')}`);
      break;
    }
    case 'complete_task': {
      if (!payload.id || typeof payload.id !== 'string') errors.push('complete_task.id is required string');
      break;
    }
    case 'create_subject': {
      if (!payload.name || typeof payload.name !== 'string') errors.push('create_subject.name is required string');
      break;
    }
    case 'none':
      break;
  }

  return { valid: errors.length === 0, errors };
}

async function executeIntent(intent, payload) {
  switch (intent) {
    case 'create_task':
      return createTask(payload);
    case 'update_task':
      return updateTask(payload);
    case 'complete_task':
      return completeTask(payload);
    case 'create_subject':
      return createSubject(payload);
    case 'none':
    default:
      return { resources: snapshotResources() };
  }
}

function snapshotResources() {
  const tasks = datastore.get('tasks') || [];
  const subjects = datastore.get('subjects') || [];
  const events = datastore.get('events') || [];
  return { tasks, subjects, events };
}

async function createTask(payload) {
  const newTask = {
    id: `t_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`,
    title: payload.title.trim(),
    description: payload.description || '',
    subject: payload.subject || null,
    dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
    priority: payload.priority || 'Medium',
    urgency: payload.urgency || null,
    difficulty: payload.difficulty || null,
    status: 'pending',
    estimatedDuration: typeof payload.estimatedDuration === 'number' ? payload.estimatedDuration : null,
    actualDuration: null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await datastore.update('tasks', (tasks) => {
    const arr = Array.isArray(tasks) ? tasks : [];
    return [...arr, newTask];
  });
  return { resources: snapshotResources(), result: { task: newTask } };
}

async function updateTask(payload) {
  let updatedTask = null;
  await datastore.update('tasks', (tasks) => {
    const arr = Array.isArray(tasks) ? tasks : [];
    const idx = arr.findIndex(t => t.id === payload.id);
    if (idx === -1) return arr;
    const updates = { ...payload };
    delete updates.id;
    const existing = arr[idx];
    const next = { ...existing, ...updates };
    if (updates.title) next.title = updates.title.trim();
    if (updates.dueDate) next.dueDate = new Date(updates.dueDate).toISOString();
    next.updatedAt = new Date().toISOString();
    arr[idx] = next;
    updatedTask = next;
    return arr;
  });
  return { resources: snapshotResources(), result: { task: updatedTask } };
}

async function completeTask(payload) {
  let updatedTask = null;
  await datastore.update('tasks', (tasks) => {
    const arr = Array.isArray(tasks) ? tasks : [];
    const idx = arr.findIndex(t => t.id === payload.id);
    if (idx === -1) return arr;
    const next = { ...arr[idx], status: 'completed', updatedAt: new Date().toISOString() };
    arr[idx] = next;
    updatedTask = next;
    return arr;
  });
  return { resources: snapshotResources(), result: { task: updatedTask } };
}

async function createSubject(payload) {
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
  return { resources: snapshotResources(), result: { subject: newSubject } };
}

module.exports = {
  INTENTS,
  validateIntentResponse,
  executeIntent,
  normalizeJsonText
};
