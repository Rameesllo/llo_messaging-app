const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, groupController.createGroup);
router.get('/all', authMiddleware, groupController.getGroups);
router.post('/add-member', authMiddleware, groupController.addGroupMember);

module.exports = router;
