const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');

const createJob = async (req, res) => {
  try {
    const { title, description } = req.body;
    const job = new Job({
      title,
      description,
      createdBy: req.user._id
    });
    await job.save();
    
    // Add job to user's jobs array
    await User.findByIdAndUpdate(req.user._id, { $push: { jobs: job._id } });

    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, active } = req.body;
    const job = await Job.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },
      { title, description, active },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated applications
    await Application.deleteMany({ job: id });

    // Delete the job
    const job = await Job.findOneAndDelete({ _id: id, createdBy: req.user._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Remove job from user's jobs array
    await User.findByIdAndUpdate(req.user._id, { $pull: { jobs: id } });

    res.json({ message: 'Job and associated applications deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error: error.message });
  }
};

module.exports = { createJob, getJobs, updateJob, deleteJob };
