const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  applicantName: {
    type: String,
    required: true,
  },
  applicantEmail: {
    type: String,
    required: true,
  },
  resumeUrl: {
    type: String,
    required: true,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  score: {
    type: Number,
    default: 0,
  },
  summary: {
    type: String,
    required: true,
  },
  missingSkills: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
