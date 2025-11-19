const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// Simple promise-based mutex for serializing writes per collection
class Mutex {
  constructor() {
    this._queue = Promise.resolve();
  }
  runExclusive(fn) {
    const run = () => Promise.resolve().then(fn);
    const p = this._queue.then(run, run);
    // Ensure next in line waits for this to settle
    this._queue = p.catch(() => {});
    return p;
  }
}

const locks = new Map();
const getLock = (key) => {
  if (!locks.has(key)) locks.set(key, new Mutex());
  return locks.get(key);
};

const state = {
  dataDir: null,
  cache: new Map(), // collection -> data
  initialized: false,
  knownCollections: ['tasks', 'subjects', 'timetable', 'events', 'chat', 'assessments']
};

const getDataDir = () => {
  return state.dataDir || path.resolve(__dirname, '../../data');
};

const getFilePath = (collection) => path.join(getDataDir(), `${collection}.json`);

async function ensureDirExists(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function readJSONFile(filePath) {
  try {
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null; // caller will seed default
    }
    // If file exists but invalid JSON, back it up and start fresh
    const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
    try {
      await fsp.copyFile(filePath, backupPath);
    } catch (_) {}
    return null;
  }
}

async function writeJSONFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  const json = JSON.stringify(data, null, 2);
  await fsp.writeFile(tmpPath, json, 'utf8');
  await fsp.rename(tmpPath, filePath);
}

async function loadCollection(collection) {
  const filePath = getFilePath(collection);
  const content = await readJSONFile(filePath);
  if (content === null) {
    // Seed with a safe default if missing
    const seeded = seedFor(collection);
    await writeJSONFileAtomic(filePath, seeded);
    state.cache.set(collection, seeded);
    return seeded;
  }
  state.cache.set(collection, content);
  return content;
}

function seedFor(collection) {
  switch (collection) {
    case 'tasks':
      return [
        {
          id: '1',
          title: 'Complete Math Assignment',
          description: 'Solve problems 1-20 from Chapter 5',
          subject: 'Mathematics',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'High',
          urgency: 'high',
          difficulty: 'moderate',
          status: 'pending',
          estimatedDuration: 120
        },
        {
          id: '2',
          title: 'Read Biology Chapter',
          description: 'Read and take notes on Chapter 3',
          subject: 'Biology',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'Medium',
          urgency: 'medium',
          difficulty: 'easy',
          status: 'pending',
          estimatedDuration: 90
        }
      ];
    case 'subjects':
      return [
        { id: 's1', name: 'Mathematics' },
        { id: 's2', name: 'Biology' },
        { id: 's3', name: 'Chemistry' },
        { id: 's4', name: 'Physics' },
        { id: 's5', name: 'English' },
        { id: 's6', name: 'History' }
      ];
    case 'timetable':
      return {
        version: 1,
        weekStart: new Date().toISOString(),
        days: {
          monday: [
            { id: 'mon-1', start: '09:00', end: '10:00', subject: 'Mathematics', location: 'Room 101', notes: '', color: '#2563eb' },
            { id: 'mon-2', start: '10:30', end: '11:30', subject: 'Chemistry', location: 'Lab B', notes: '', color: '#0ea5e9' }
          ],
          tuesday: [
            { id: 'tue-1', start: '09:00', end: '10:00', subject: 'Physics', location: 'Lab A', notes: '', color: '#16a34a' },
            { id: 'tue-2', start: '13:30', end: '14:30', subject: 'History', location: 'Room 204', notes: '', color: '#f59e0b' }
          ],
          wednesday: [
            { id: 'wed-1', start: '11:00', end: '12:00', subject: 'English', location: 'Room 110', notes: '', color: '#64748b' }
          ],
          thursday: [
            { id: 'thu-1', start: '14:00', end: '15:30', subject: 'Biology', location: 'Room 303', notes: '', color: '#22c55e' }
          ],
          friday: [
            { id: 'fri-1', start: '10:00', end: '11:30', subject: 'Computer Science', location: 'Lab C', notes: '', color: '#a855f7' }
          ],
          saturday: [],
          sunday: []
        },
        updatedAt: new Date().toISOString()
      };

    case 'events':
      return [
        { id: 'e1', title: 'Math Midterm', date: new Date(Date.now() + 5*24*60*60*1000).toISOString(), subject: 'Mathematics', type: 'exam' },
        { id: 'e2', title: 'Chemistry Quiz', date: new Date(Date.now() + 2*24*60*60*1000).toISOString(), subject: 'Chemistry', type: 'quiz' }
      ];
    case 'users':
      return [
        { id: 'u1', username: 'demo', email: 'demo@example.com', firstName: 'Demo', lastName: 'User' }
      ];
    case 'chat':
      return [
        { sessionId: 'session_1', messages: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: new Date().toISOString() }
        ], status: 'active' }
      ];
    case 'assessments':
      return [
        {
          id: 'a1',
          title: 'Math Midterm',
          subject: 'Mathematics',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming',
          weight: 0.3,
          scoreHistory: [72, 78, 81, 85, 88],
          resources: [
            { label: 'Study Guide', url: 'https://example.com/math-midterm-guide' },
            { label: 'Practice Problems', url: 'https://example.com/math-practice' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'a2',
          title: 'Chemistry Quiz',
          subject: 'Chemistry',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming',
          weight: 0.1,
          scoreHistory: [65, 70, 74, 76, 80],
          resources: [
            { label: 'Chapter 4 Notes', url: 'https://example.com/chem-notes' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'a3',
          title: 'History Essay',
          subject: 'History',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          weight: 0.2,
          scoreHistory: [78, 80, 84, 90],
          resources: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    default:
      return [];
  }
}

function deepClone(data) {
  return data == null ? data : JSON.parse(JSON.stringify(data));
}

async function init(options = {}) {
  if (state.initialized) return;
  state.dataDir = options.dataDir || process.env.DATA_DIR || getDataDir();
  await ensureDirExists(state.dataDir);
  // Preload known collections into cache
  for (const collection of state.knownCollections) {
    await loadCollection(collection);
  }
  state.initialized = true;
}

async function refreshAll() {
  await ensureDirExists(getDataDir());
  const files = await fsp.readdir(getDataDir());
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const collection = path.basename(file, '.json');
    await loadCollection(collection);
  }
}

function get(collection) {
  const data = state.cache.get(collection);
  return deepClone(data);
}

async function set(collection, data) {
  const filePath = getFilePath(collection);
  const lock = getLock(collection);
  return lock.runExclusive(async () => {
    await ensureDirExists(path.dirname(filePath));
    await writeJSONFileAtomic(filePath, data);
    state.cache.set(collection, deepClone(data));
    return true;
  });
}

async function update(collection, updater) {
  const lock = getLock(collection);
  return lock.runExclusive(async () => {
    const current = get(collection);
    const next = await Promise.resolve(updater(current));
    const filePath = getFilePath(collection);
    await ensureDirExists(path.dirname(filePath));
    await writeJSONFileAtomic(filePath, next);
    state.cache.set(collection, deepClone(next));
    return next;
  });
}

module.exports = {
  init,
  refreshAll,
  get,
  set,
  update,
  state
};
