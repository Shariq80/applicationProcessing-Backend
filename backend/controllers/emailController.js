const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const GoogleCredential = require('../models/GoogleCredential');

const fetchAndProcessEmails = async (req, res) => {
  const { jobId } = req.params;
  const user = await User.findById(req.user._id);
  const job = await Job.findOne({ _id: jobId, hr: user._id, active: true });

  if (!job) {
    throw new Error('Active job not found');
  }

  const credential = await GoogleCredential.findOne();
  if (!credential) {
    throw new Error('Google account not connected');
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken,
    expiry_date: credential.expiryDate,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.findOneAndUpdate({}, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date),
      });
    } else {
      await GoogleCredential.findOneAndUpdate({}, {
        accessToken: tokens.access_token,
        expiryDate: new Date(tokens.expiry_date),
      });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:(${job.title.split(' ').join(' OR ')})`,
  });

  const messages = response.data.messages || [];
  const processedApplications = [];

  for (const message of messages) {
    try {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const { applicantEmail, resumeText, extractedJobTitle } = await parseEmail(email.data, job.title);

      if (!resumeText) {
        console.log(`No resume text found for email ${message.id}`);
        continue;  // Skip this email and move to the next one
      }

      if (!extractedJobTitle) {
        console.log(`Job title not found in subject for email ${message.id}`);
        continue;  // Skip this email and move to the next one
      }

      const { score, summary, missingSkills } = await processResume(resumeText, job.description);

      const application = await Application.create({
        job: job._id,
        applicantEmail,
        resumeText,
        score,
        summary,
        missingSkills,
        processedBy: user._id,
      });

      processedApplications.push(application);
    } catch (error) {
      console.error(`Error processing email ${message.id}:`, error);
      // Continue to the next email instead of stopping the entire process
    }
  }

  return processedApplications;
};

module.exports = { fetchAndProcessEmails };
