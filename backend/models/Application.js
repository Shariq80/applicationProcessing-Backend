const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  applicantEmail: {
    type: String,
    required: true,
  },
  resumeText: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
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
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    data: {
      type: Buffer,
      required: true
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
