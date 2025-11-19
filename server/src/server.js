require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // <--- IMPORT THIS
const rateLimit = require('express-rate-limit');
const datastore = require('./datastore');
const connectDB = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// Import Middleware
const { protect, redirectIfLoggedIn } = require('./middleware/authMiddleware'); // <--- IMPORT THIS

const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const studyPlanComputeRoutes = require('./routes/studyPlanComputeRoutes');
const motivationRoutes = require('./routes/motivationRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const assessmentsRoutes = require('./routes/assessmentsRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const eventRoutes = require('./routes/eventRoutes');
const viewRoutes = require('./routes/viewRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const projectRoot = path.resolve(__dirname, '..', '..');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(projectRoot, 'public')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(projectRoot, 'styles.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(projectRoot, 'script.js')));

const legacyPages = [
  'ai-mentor.html',
  'analytics.html',
  'api-stub.html',
  'assessment.html',
  'assignments.html',
  'calendar.html',
  'learning-path.html',
  'progress.html',
  'subjects.html',
  'timetable.html'
];

legacyPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(projectRoot, page));
  });
});

// Trust proxy (for correct rate-limit IPs behind proxies). Accept numeric or boolean-like env.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  const val = /^\d+$/.test(trustProxyEnv) ? parseInt(trustProxyEnv, 10) : 1;
  app.set('trust proxy', val);
}

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  credentials: true
}));

// Body parsers with limits
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '1mb' }));
app.use(cookieParser()); // <--- ENABLE COOKIE PARSER

// Basic rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${1 * 60 * 1000}`, 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '5000', 10), // 5000 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after a minute'
});
app.use(limiter);

app.use(requestLogger);

const apiSummary = {
  success: true,
  message: 'Assessli Smart Academic Mentor API',
  version: '1.0.0',
  endpoints: {
    tasks: '/api/tasks',
    subjects: '/api/subjects',
    events: '/api/events',
    chat: '/api/chat',
    studyPlan: '/api/study-plan',
    studyPlans: '/api/study-plans',
    motivation: '/api/motivation',
    timetable: '/api/timetable',
    analytics: '/api/analytics',
    assessments: '/api/assessments'
  }
};

app.get('/api', (req, res) => {
  res.json(apiSummary);
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    datastore: {
      dataDir: datastore.state.dataDir,
      collections: Array.from(datastore.state.cache.keys())
    }
  });
});

// --- ROUTE CONFIGURATION ---

// 1. Auth Routes (Public)
app.use('/', authRoutes);

// 2. Login Page (Public, but redirects if already logged in)
app.get('/login', redirectIfLoggedIn, (req, res) => {
  const { getLoginViewData } = require('./controllers/viewController');
  res.render('pages/login', getLoginViewData());
});

// 3. Protected Pages (Dashboard, etc.)
// We apply 'protect' middleware here. If not logged in, they get sent to /login
app.use('/', protect, viewRoutes);

// 4. Protected API Routes
app.use('/api/tasks', protect, taskRoutes);
// app.use('/api/chat', protect, chatRoutes); // Apply to others as needed
app.use('/api/subjects', protect, subjectRoutes);
app.use('/api/events', protect, eventRoutes);
app.use('/api/chat', protect, chatRoutes);
app.use('/api/study-plan', protect, studyPlanComputeRoutes);
app.use('/api/study-plans', protect, studyPlanRoutes);
app.use('/api/motivation', protect, motivationRoutes);
app.use('/api/timetable', protect, timetableRoutes);
app.use('/api/analytics', protect, analyticsRoutes);
app.use('/api/assessments', protect, assessmentsRoutes);

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(projectRoot, '404.html'));
  }
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await datastore.init({ dataDir: process.env.DATA_DIR });
    await datastore.refreshAll();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Data directory: ${datastore.state.dataDir}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

module.exports = app;
