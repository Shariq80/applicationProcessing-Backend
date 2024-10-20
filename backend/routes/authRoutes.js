const express = require('express');
const { login, googleAuth, googleCallback } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;
