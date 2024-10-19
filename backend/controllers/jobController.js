const Job = require('../models/Job');

const createJob = async (req, res) => {
  try {
    const { title, description } = req.body;
    const job = await Job.create({
      title,
      description,
      hr: req.user._id,
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ hr: req.user._id });
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
      { _id: id, hr: req.user._id },
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
    const job = await Job.findOneAndDelete({ _id: id, hr: req.user._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createJob, getJobs, updateJob, deleteJob };
