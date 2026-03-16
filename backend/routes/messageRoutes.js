const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, messageController.sendMessage);
router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/:otherUserId', authMiddleware, messageController.getMessages);
router.put('/read/:otherUserId', authMiddleware, messageController.markAsRead);
router.post('/react/:messageId', authMiddleware, messageController.toggleReaction);
router.put('/viewed/:messageId', authMiddleware, messageController.markViewed);

router.delete('/delete/:messageId', authMiddleware, messageController.deleteMessage);
router.delete('/cleanup/:otherUserId', authMiddleware, messageController.cleanupMessages);

module.exports = router;
