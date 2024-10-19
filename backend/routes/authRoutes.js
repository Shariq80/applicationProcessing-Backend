const express = require('express');
const passport = require('passport');
const { login, googleCallback } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback
);

module.exports = router;
