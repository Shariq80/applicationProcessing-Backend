const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getApplications, updateApplicationStatus, downloadAttachment } = require('../controllers/applicationController');
const { fetchAndProcessEmails } = require('../controllers/emailController');
const Application = require('../models/Application');

const router = express.Router();

router.get('/:jobId', protect, getApplications);
router.put('/:id/status', protect, updateApplicationStatus);
router.post('/:jobId/process-emails', protect, fetchAndProcessEmails);
router.get('/:id/attachment/:attachmentId', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).send('Application not found');
    }

    const attachment = application.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).send('Attachment not found');
    }

    res.set({
      'Content-Type': attachment.contentType,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
    });

    res.send(attachment.data);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).send('Error downloading attachment');
  }
});

module.exports = router;
