const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { fetchAndProcessEmails } = require('../controllers/emailController');

const router = express.Router();

router.get('/fetch/:jobId', protect, fetchAndProcessEmails);

module.exports = router;
