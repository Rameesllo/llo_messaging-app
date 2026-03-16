const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/search', authMiddleware, userController.searchUsers);
router.get('/profile/:id', authMiddleware, userController.getProfile);
router.get('/friends', authMiddleware, userController.getFriends);
router.get('/mutual/:otherUserId', authMiddleware, userController.getMutualFriends);
router.post('/add-friend', authMiddleware, userController.addFriend);
router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;
