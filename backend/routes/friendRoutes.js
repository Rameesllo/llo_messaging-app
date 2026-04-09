const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/authMiddleware');

router.post('/request', auth, friendController.sendRequest);
router.post('/accept', auth, friendController.acceptRequest);
router.get('/pending', auth, friendController.getPendingRequests);
router.get('/discover', auth, friendController.getAllUsers);
router.get('/search', auth, friendController.searchUsers);
router.delete('/unfriend/:otherUserId', auth, friendController.unfriend);

module.exports = router;
