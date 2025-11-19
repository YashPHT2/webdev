const dashboardViewData = {
  title: 'Smart Mentor – Dashboard',
  stylesheets: [
    '/public/css/base.css',
    '/public/css/layout.css',
    '/public/css/components.css',
    '/public/css/dashboard-enhanced.css'
  ],
  scripts: [
    { src: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', defer: true },
    { src: '/public/js/api.js', defer: true },
    { src: '/public/js/chatbot.js', defer: true },
    { src: '/script.js', defer: true }
  ]
};

const homeViewData = {
  title: 'Smart Academic Mentor',
  stylesheets: ['/styles.css'],
  scripts: [{ src: '/script.js', defer: true }]
};

const loginViewData = {
  title: 'Smart Academic Mentor – Login',
  stylesheets: [
    '/public/css/base.css',
    '/public/css/components.css',
    '/public/css/login.css'
  ],
  scripts: [],
  headContent: '',
  bodyClass: '',
  footerContent: '' // <--- ADD THIS LINE
};

const renderView = (res, view, base, extras = {}) => {
  res.render(view, { ...base, ...extras });
};

const path = require('path');

const renderHome = (req, res, extras = {}) => {
  res.sendFile(path.join(__dirname, '../../../frontpage.html'));
};

const renderDashboard = (req, res, extras = {}) => {
  renderView(res, 'pages/dashboard', dashboardViewData, extras);
};

const renderLogin = (req, res, extras = {}) => {
  const safeExtras = {
    error: null,
    success: null,
    formData: {},
    ...extras
  };
  renderView(res, 'pages/login', loginViewData, safeExtras);
};

const getLoginViewData = (extras = {}) => ({
  ...loginViewData,
  error: null,
  success: null,
  formData: {},
  headContent: '',
  footerContent: '', // <--- ADD THIS LINE
  ...extras
});

const renderLoginNew = (req, res) => {
  res.render('pages/login-new', getLoginViewData());
};

module.exports = {
  getLoginViewData,
  renderHome,
  renderDashboard,
  renderLogin,
  renderLoginNew
};
