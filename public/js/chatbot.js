(function () {
  function noop() {}

  function isJSON(str) {
    if (typeof str !== 'string') return false;
    const s = str.trim();
    if (!s) return false;
    if (!(s.startsWith('{') || s.startsWith('['))) return false;
    try { JSON.parse(s); return true; } catch (_) { return false; }
  }

  function safeParseJSON(str, fallback = null) {
    try { return JSON.parse(str); } catch (_) { return fallback; }
  }

  // A lightweight client to manage chat session, persistence, streaming (simulated), and intent delivery
  class ChatbotClient {
    constructor(opts = {}) {
      this.endpoint = opts.endpoint || '/api/chat';
      this.sessionCreateEndpoint = opts.sessionCreateEndpoint || '/api/chat/session';
      this.sessionDeleteEndpoint = (id) => `/api/chat/history/${encodeURIComponent(id)}`;
      this.storageKey = opts.storageKey || 'chat:session';

      this.onStreamStart = opts.onStreamStart || noop;
      this.onStreamDelta = opts.onStreamDelta || noop;
      this.onStreamComplete = opts.onStreamComplete || noop;
      this.onMessage = opts.onMessage || noop;
      this.onIntent = opts.onIntent || noop;
      this.onError = opts.onError || noop;

      this.state = {
        sessionId: null,
        history: [] // { role: 'user'|'assistant', content: string, ts }
      };

      this.maxHistory = typeof opts.maxHistory === 'number' ? opts.maxHistory : 20;

      this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.state.sessionId = parsed.sessionId || null;
            this.state.history = Array.isArray(parsed.history) ? parsed.history : [];
          }
        }
      } catch (_) {}
    }

    persist() {
      try {
        const data = {
          sessionId: this.state.sessionId,
          history: this.state.history.slice(-this.maxHistory)
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (_) {}
    }

    async reset() {
      const id = this.state.sessionId;
      this.state.history = [];
      this.persist();
      if (id) {
        try {
          await fetch(this.sessionDeleteEndpoint(id), { method: 'DELETE' });
        } catch (_) {}
      }
      try {
        const res = await fetch(this.sessionCreateEndpoint, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          this.state.sessionId = json?.data?.sessionId || null;
          this.persist();
        } else {
          this.state.sessionId = null;
        }
      } catch (_) {
        this.state.sessionId = null;
      }
    }

    addToHistory(role, content) {
      const item = { role, content: String(content || ''), ts: Date.now() };
      this.state.history.push(item);
      this.persist();
    }

    async sendMessage(message, meta = {}) {
      const text = String(message || '').trim();
      if (!text) return;
      this.addToHistory('user', text);

      // Prepare payload
      const body = {
        message: text,
        sessionId: this.state.sessionId,
        userId: meta.userId || 'anonymous'
      };

      let res;
      try {
        res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (err) {
        this.onError(err);
        return;
      }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        this.onError(err);
        return;
      }

      // The API returns JSON with { success, data: { sessionId, reply, intent, payload, resources } }
      // There's no server-side streaming; we simulate streaming by chunking the reply.
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const data = json?.data || {};
        if (data.sessionId && data.sessionId !== this.state.sessionId) {
          this.state.sessionId = data.sessionId;
          this.persist();
        }
        const reply = String(data.reply || '');
        await this.simulateStreaming(reply, data);
      } else {
        // Fallback: treat as text
        const textReply = await res.text();
        await this.simulateStreaming(String(textReply || ''), {});
      }
    }

    async simulateStreaming(fullText, meta = {}) {
      try { this.onStreamStart(); } catch (_) {}
      const chunks = this.chunkText(fullText, 16);
      let acc = '';
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        acc += c;
        try { this.onStreamDelta(c, acc); } catch (_) {}
        await new Promise(r => setTimeout(r, 14 + Math.min(250, Math.round(Math.random() * 40))));
      }
      this.addToHistory('assistant', fullText);
      this.persist();

      // Deliver intent and completion
      try { this.onStreamComplete(fullText, meta); } catch (_) {}
      if (meta && meta.intent) {
        try { this.onIntent(meta.intent, meta.payload || {}, meta.resources || {}); } catch (_) {}
      }
    }

    chunkText(str, size) {
      if (!str) return [];
      const out = [];
      for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
      return out;
    }
  }

  window.ChatbotClient = ChatbotClient;
})();
