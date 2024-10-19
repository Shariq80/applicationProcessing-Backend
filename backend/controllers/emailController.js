const { google } = require('googleapis');
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');

const fetchAndProcessEmails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, hr: req.user._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `subject:${job.title}`,
    });

    const messages = response.data.messages || [];
    const processedApplications = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const { applicantName, applicantEmail, resumeUrl } = parseEmail(email.data);

      const existingApplication = await Application.findOne({
        job: jobId,
        applicantEmail,
      });

      if (!existingApplication) {
        const { score, summary, missingSkills } = await processResume(resumeUrl, job.description);

        const application = await Application.create({
          job: jobId,
          applicantName,
          applicantEmail,
          resumeUrl,
          score,
          summary,
          missingSkills,
        });

        processedApplications.push(application);
      }
    }

    res.json(processedApplications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { fetchAndProcessEmails };