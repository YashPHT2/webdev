const express = require('express');
const {
  renderHome,
  renderDashboard,
  renderLogin,
  renderLoginNew
} = require('../controllers/viewController');

const router = express.Router();

router.get('/', renderHome);
router.get('/home', renderHome);
router.get('/dashboard', renderDashboard);
router.get('/index', renderDashboard);
router.get('/index.html', (req, res) => res.redirect('/index'));
router.get('/demo-with-tasks.html', (req, res) => res.redirect('/'));
router.get('/login', renderLogin);
router.get('/login-new', renderLoginNew);
router.get('/login.html', (req, res) => res.redirect('/login'));

module.exports = router;
