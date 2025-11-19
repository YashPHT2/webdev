const express = require('express');
const router = express.Router();
const motivationController = require('../controllers/motivationController');

router.get('/message', motivationController.getMotivationalMessage);
router.get('/quote', motivationController.getDailyQuote);
router.get('/tip', motivationController.getStudyTip);

module.exports = router;
