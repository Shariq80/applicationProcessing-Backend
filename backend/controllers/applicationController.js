const Application = require('../models/Application');
const Job = require('../models/Job');

const getApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, hr: req.user._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const applications = await Application.find({ job: jobId });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    const job = await Job.findOne({ _id: application.job, hr: req.user._id });
    if (!job) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    application.status = status;
    await application.save();
    
    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getApplications, updateApplicationStatus };
