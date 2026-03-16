const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/upload', authMiddleware, mediaController.uploadMedia);

module.exports = router;
