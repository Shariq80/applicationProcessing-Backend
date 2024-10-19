const express = require('express');
const { login, googleAuth, googleCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/google', googleAuth);
router.get('/google/callback', protect, googleCallback);

module.exports = router;
