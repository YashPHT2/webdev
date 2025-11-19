const express = require('express');
const { handleLogin, handleLoginNew } = require('../controllers/authController');

const router = express.Router();

router.post('/login', handleLogin);
router.post('/login-new', handleLoginNew);

module.exports = router;
