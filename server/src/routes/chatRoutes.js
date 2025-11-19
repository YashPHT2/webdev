const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.sendMessage);
router.post('/session', chatController.createChatSession);
router.get('/history/:sessionId', chatController.getChatHistory);
router.delete('/history/:sessionId', chatController.deleteChatHistory);

module.exports = router;
