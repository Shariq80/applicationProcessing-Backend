const express = require('express');
const { login, googleAuth, googleCallback } = require('../controllers/authController');
const { google } = require('googleapis');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per windowMs
});

router.post('/login', login);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/google/url', googleAuthLimiter, (req, res, next) => {
  console.log(`Google Auth URL requested from IP: ${req.ip}`);
  next();
}, googleAuth);

module.exports = router;
