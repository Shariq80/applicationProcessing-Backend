const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Job = require('../models/Job');
const Application = require('../models/Application');

router.get('/', protect, async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({ createdBy: req.user._id });
    const userJobs = await Job.find({ createdBy: req.user._id }).select('_id');
    const jobIds = userJobs.map(job => job._id);
    
    const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });
    const processedApplications = await Application.countDocuments({ job: { $in: jobIds }, status: 'Reviewed' });
    
    const recentApplications = await Application.find({ job: { $in: jobIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('job', 'title');

    const dashboardData = {
      totalJobs,
      totalApplications,
      processedApplications,
      recentApplications: recentApplications.map(app => ({
        id: app._id,
        applicantName: app.applicantName,
        status: app.status,
        jobTitle: app.job.title
      }))
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

module.exports = router;
