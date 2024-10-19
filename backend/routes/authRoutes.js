const express = require('express');
const { googleAuth, googleCallback, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();


router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/login', login);

module.exports = router;
