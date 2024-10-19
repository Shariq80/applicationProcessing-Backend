const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

const fetchAndProcessEmails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.googleAccessToken) {
      return res.status(401).json({ message: 'Google account not connected' });
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `subject:"Application for ${jobId}"`,
    });

    const messages = response.data.messages || [];
    const processedApplications = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const { applicantName, applicantEmail, emailBody } = parseEmail(email.data);

      const existingApplication = await Application.findOne({
        job: jobId,
        applicantEmail,
      });

      if (!existingApplication) {
        const job = await Job.findById(jobId);
        const { score, summary, missingSkills } = await processResume(emailBody, job.description);

        const application = await Application.create({
          job: jobId,
          applicantName,
          applicantEmail,
          resumeText: emailBody,
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
