const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  applicantEmail: String,
  jobTitle: String,
  resumeText: String,
  score: Number,
  summary: String,
  attachmentFilename: String,
  attachmentData: Buffer,
  attachmentContentType: String,
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  emailId: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema);
