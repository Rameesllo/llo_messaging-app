const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/authMiddleware');

router.post('/request', auth, friendController.sendRequest);
router.post('/accept', auth, friendController.acceptRequest);
router.get('/pending', auth, friendController.getPendingRequests);
router.get('/search', auth, friendController.searchUsers);

module.exports = router;
