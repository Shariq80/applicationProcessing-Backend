const express = require('express');
const { googleAuth, googleCallback } = require('../controllers/authController');

const router = express.Router();

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;
