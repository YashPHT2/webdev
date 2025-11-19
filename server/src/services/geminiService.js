const fetch = global.fetch || require('node-fetch');

function redactSecrets(str) {
  try {
    if (typeof str !== 'string') str = JSON.stringify(str);
  } catch (_) {}
  if (typeof str !== 'string') return str;
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return str;
  const redacted = str.split(apiKey).join('***REDACTED***');
  return redacted.replace(/[A-Za-z0-9_]*API_KEY\s*=\s*[^\s]+/gi, (m) => m.replace(/=.*/, '=***REDACTED***'));
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '15000', 10);

function buildSystemPrompt() {
  return [
    'You are Assessli, a helpful academic mentor chatbot. You must act strictly as an intent router and return only JSON.',
    'Supported intents and their payload schemas:',
    '- create_task: { title: string, description?: string, subject?: string, dueDate?: ISO8601 string, priority?: "Low|Medium|High|Urgent", estimatedDuration?: number }',
    '- update_task: { id: string, title?: string, description?: string, subject?: string, dueDate?: ISO8601 string, priority?: "Low|Medium|High|Urgent", status?: "pending|in-progress|completed|overdue|cancelled", estimatedDuration?: number, actualDuration?: number, tags?: string[] }',
    '- complete_task: { id: string }',
    '- create_subject: { name: string, color?: string }',
    '',
    'Instructions:',
    '1) Determine the single most appropriate intent and minimal payload to fulfill the user request.',
    '2) Always provide a helpful natural-language reply for the user in the "reply" field.',
    '3) Output must be ONLY a compact JSON object with the following shape (no code fences, no extra text):',
    '{ "intent": string, "payload": object, "reply": string }',
    '4) If the request is a greeting or general question without any intent, set intent to "none" and reply helpfully.',
    '5) Do not hallucinate IDs; if an ID is unknown or missing for update/complete, set intent to "none" with a clarifying reply requesting the necessary information.',
  ].join('\n');
}

async function callGemini({ messages = [], model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.statusCode = 500;
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemText = buildSystemPrompt();

  const contents = [];
  // Add limited history
  const recent = messages.slice(-10);
  for (const m of recent) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: String(m.content || '') }] });
  }

  const body = {
    contents,
    system_instruction: { role: 'system', parts: [{ text: systemText }] },
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 512
    }
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (_) {
      const err = new Error(`Gemini response was not JSON: ${redactSecrets(text).slice(0, 500)}`);
      err.statusCode = 502;
      throw err;
    }
    if (!resp.ok) {
      const err = new Error(`Gemini API error: ${json.error?.message || resp.statusText}`);
      err.statusCode = resp.status;
      throw err;
    }
    const candidate = (json.candidates && json.candidates[0]) || null;
    const part = candidate && candidate.content && Array.isArray(candidate.content.parts) && candidate.content.parts[0];
    const outputText = part && part.text ? part.text : null;
    if (!outputText) {
      const err = new Error('Gemini returned no text');
      err.statusCode = 502;
      throw err;
    }
    return { raw: json, text: outputText };
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Gemini request timed out');
      e.statusCode = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

module.exports = {
  callGemini,
  buildSystemPrompt,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS
};
