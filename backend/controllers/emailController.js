const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const GoogleCredential = require('../models/GoogleCredential');

const fetchOAuthCredentialsFromDB = async () => {
  // Implement the logic to fetch OAuth credentials from your database
  // For example:
  const credential = await GoogleCredential.findOne();
  return credential;
};

const fetchAndProcessEmails = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Fetch OAuth credentials from your database
    const oauthCredentials = await fetchOAuthCredentialsFromDB();

    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: oauthCredentials.refreshToken
    });

    // Get a new access token
    const { token } = await oauth2Client.getAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const user = await User.findById(req.user._id);
    const job = await Job.findOne({ _id: jobId, hr: user._id, active: true });

    if (!job) {
      throw new Error('Active job not found');
    }

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

    res.json({ success: true, message: 'Emails processed successfully', applications: processedApplications });
  } catch (error) {
    console.error('Error fetching and processing emails:', error);
    res.status(500).json({ success: false, message: 'Failed to process emails', error: error.message });
  }
};

module.exports = { fetchAndProcessEmails };
