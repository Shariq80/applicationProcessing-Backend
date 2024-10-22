const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { fetchAndProcessEmails, downloadAttachments } = require('../controllers/emailController');

const router = express.Router();

// Add this test route
router.get('/test', (req, res) => {
  res.json({ message: 'Email routes are working' });
});

router.post('/:jobTitle/process-emails', protect, fetchAndProcessEmails);

router.get('/download-attachments/:jobTitle', downloadAttachments);

module.exports = router;
