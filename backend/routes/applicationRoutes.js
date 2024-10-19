const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getApplications, updateApplicationStatus } = require('../controllers/applicationController');

const router = express.Router();

router.get('/:jobId', protect, getApplications);
router.put('/:id/status', protect, updateApplicationStatus);

module.exports = router;