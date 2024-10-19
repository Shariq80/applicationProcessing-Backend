const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { fetchAndProcessEmails } = require('../controllers/emailController');

const router = express.Router();

router.get('/fetch/:jobId', protect, async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log('Processing emails for job:', jobId);
    const processedApplications = await fetchAndProcessEmails(req, res);
    res.json({ success: true, message: 'Emails processed successfully', applications: processedApplications });
  } catch (error) {
    console.error('Error processing emails:', error);
    res.status(500).json({ success: false, message: 'Failed to process emails', error: error.message });
  }
});

module.exports = router;
