const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getApplications, downloadAttachment, deleteApplication, parseResume } = require('../controllers/applicationController');
const { fetchAndProcessEmails } = require('../controllers/emailController');
const Application = require('../models/Application');

const router = express.Router();

router.get('/:jobTitle', protect, getApplications);
router.post('/:jobTitle/process-emails', protect, fetchAndProcessEmails);
router.get('/:id/attachment/:attachmentId', protect, downloadAttachment);

router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ message: 'Error fetching application' });
  }
});

router.delete('/:applicationId', protect, deleteApplication);

router.post('/:id/parse-resume', protect, parseResume);

module.exports = router;
