const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { fetchAndProcessEmails } = require('../controllers/emailController');

const router = express.Router();

// Add this test route
router.get('/test', (req, res) => {
  res.json({ message: 'Email routes are working' });
});

router.post('/:jobId/process-emails', protect, fetchAndProcessEmails);

module.exports = router;
