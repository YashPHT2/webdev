const datastore = require('../datastore');
const { callGemini } = require('../services/geminiService');
const { validateIntentResponse, executeIntent, normalizeJsonText } = require('../services/intentExec');

// Simple in-memory rate limiter per session/user
const rateBuckets = new Map();
function checkRateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter(ts => now - ts < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  return true;
}

function buildSessionRecord(sessionId) {
  return {
    sessionId,
    messages: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString()
  };
}

async function upsertSession(session) {
  await datastore.update('chat', (sessions) => {
    const arr = Array.isArray(sessions) ? sessions : [];
    const idx = arr.findIndex(s => s.sessionId === session.sessionId);
    if (idx === -1) return [...arr, session];
    const next = { ...arr[idx], ...session };
    arr[idx] = next;
    return arr;
  });
}

async function appendMessage(sessionId, msg) {
  await datastore.update('chat', (sessions) => {
    const arr = Array.isArray(sessions) ? sessions : [];
    const idx = arr.findIndex(s => s.sessionId === sessionId);
    if (idx === -1) return arr;
    const sess = arr[idx];
    const messages = Array.isArray(sess.messages) ? sess.messages.slice() : [];
    messages.push({
      role: msg.role,
      content: String(msg.content || ''),
      timestamp: new Date().toISOString(),
      metadata: msg.metadata || {}
    });
    arr[idx] = { ...sess, messages, lastMessageAt: new Date().toISOString() };
    return arr;
  });
}

function getSession(sessionId) {
  const sessions = datastore.get('chat') || [];
  return sessions.find(s => s.sessionId === sessionId) || null;
}

const chatController = {
  sendMessage: async (req, res) => {
    try {
      const userId = (req.body && req.body.userId) || 'anonymous';
      const userMessage = (req.body && req.body.message) ? String(req.body.message) : '';
      let { sessionId } = req.body || {};

      if (!userMessage || userMessage.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'message is required' });
      }

      // Rate limiting per session or user
      const rateKey = sessionId ? `s:${sessionId}` : `u:${userId}`;
      if (!checkRateLimit(rateKey)) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
      }

      // Ensure session exists
      let session = sessionId ? getSession(sessionId) : null;
      if (!session) {
        sessionId = `session_${Date.now()}`;
        session = buildSessionRecord(sessionId);
        await upsertSession(session);
      }

      // Append user message
      await appendMessage(sessionId, { role: 'user', content: userMessage });
      session = getSession(sessionId);

      // Prepare messages for Gemini
      const messages = (session?.messages || []).slice(-10);

      // Call Gemini
      const { text } = await callGemini({ messages });

      // Parse and validate
      const maybeJson = normalizeJsonText(text);
      let parsed;
      try {
        parsed = JSON.parse(maybeJson);
      } catch (e) {
        parsed = { intent: 'none', payload: {}, reply: 'I had trouble understanding that. Could you rephrase?' };
      }

      const { valid, errors } = validateIntentResponse(parsed);
      if (!valid) {
        parsed = { intent: 'none', payload: {}, reply: parsed && parsed.reply ? parsed.reply : 'I had trouble understanding that. Could you clarify your request?' };
      }

      // Execute intent if applicable
      let execResult = { resources: undefined, result: undefined };
      if (parsed.intent && parsed.intent !== 'none') {
        execResult = await executeIntent(parsed.intent, parsed.payload || {});
      }
      const resources = execResult.resources || { tasks: datastore.get('tasks') || [], subjects: datastore.get('subjects') || [], events: datastore.get('events') || [] };

      // Store assistant message
      await appendMessage(sessionId, { role: 'assistant', content: parsed.reply, metadata: { intent: parsed.intent, payload: parsed.payload } });

      res.json({
        success: true,
        message: 'OK',
        data: {
          sessionId,
          intent: parsed.intent,
          payload: parsed.payload,
          reply: parsed.reply,
          resources
        }
      });
    } catch (error) {
      const safeMsg = process.env.NODE_ENV === 'development' ? error.message : 'Internal error';
      res.status(error.statusCode || 500).json({ success: false, message: 'Error processing chat message', error: safeMsg });
    }
  },

  getChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = getSession(sessionId);
      if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
      res.json({ success: true, message: 'Chat history retrieved successfully', data: session });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error retrieving chat history', error: error.message });
    }
  },

  createChatSession: async (req, res) => {
    try {
      const sessionId = `session_${Date.now()}`;
      const session = buildSessionRecord(sessionId);
      await upsertSession(session);
      res.status(201).json({ success: true, message: 'Chat session created successfully', data: { sessionId, status: session.status, createdAt: session.createdAt } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating chat session', error: error.message });
    }
  },

  deleteChatHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      let removed = false;
      await datastore.update('chat', (sessions) => {
        const arr = Array.isArray(sessions) ? sessions : [];
        const before = arr.length;
        const filtered = arr.filter(s => s.sessionId !== sessionId);
        removed = before !== filtered.length;
        return filtered;
      });
      if (!removed) return res.status(404).json({ success: false, message: 'Session not found' });
      res.json({ success: true, message: 'Chat history deleted successfully', data: { sessionId } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting chat history', error: error.message });
    }
  }
};

module.exports = chatController;
