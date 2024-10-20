const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getApplications, updateApplicationStatus } = require('../controllers/applicationController');
const { fetchAndProcessEmails } = require('../controllers/emailController');

const router = express.Router();

router.get('/:jobId', protect, getApplications);
router.put('/:id/status', protect, updateApplicationStatus);
router.post('/:jobId/process-emails', protect, fetchAndProcessEmails);

module.exports = router;
