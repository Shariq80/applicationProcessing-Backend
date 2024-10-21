const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const GoogleCredential = require('../models/GoogleCredential');

const fetchOAuthCredentialsFromDB = async () => {
  const credential = await GoogleCredential.findOne().sort({ createdAt: -1 });
  if (!credential) {
    throw new Error('No Google credentials found in the database');
  }
  return credential;
};

const fetchAndProcessEmails = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const oauthCredentials = await fetchOAuthCredentialsFromDB();
    console.log('OAuth credentials fetched:', oauthCredentials);

    if (!oauthCredentials || !oauthCredentials.refreshToken) {
      throw new Error('No valid OAuth credentials found');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: oauthCredentials.refreshToken
    });

    try {
      const { token } = await oauth2Client.getAccessToken();
      console.log('New access token obtained:', token);
    } catch (tokenError) {
      console.error('Error getting access token:', tokenError);
      throw new Error('Failed to get access token: ' + tokenError.message);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const user = await User.findById(req.user._id);
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    console.log('Searching for job with ID:', jobId);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const messages = response.data.messages || [];
    const processedApplications = [];

    for (const message of messages) {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const parsedEmail = await parseEmail(email.data, job.title, gmail, message.id);

        if (!parsedEmail) {
          console.log(`Skipping email ${message.id}: Not a valid job application`);
          continue;
        }

        const { applicantEmail, resumeText, extractedJobTitle, attachments } = parsedEmail;

        if (!extractedJobTitle) {
          console.log(`Skipping email ${message.id}: Job title not found in subject`);
          continue;
        }

        let processedResult;
        try {
          processedResult = await processResume(resumeText, job.description);
        } catch (openaiError) {
          console.error('Error processing resume with OpenAI:', openaiError);
          if (openaiError.code === 'insufficient_quota') {
            throw openaiError; // Re-throw to stop processing all emails
          }
          continue; // Skip this email and continue with the next one
        }

        const { score, summary, missingSkills } = processedResult;

        const application = await Application.create({
          job: job._id,
          applicantEmail,
          resumeText,
          score,
          summary,
          missingSkills,
          processedBy: user._id,
          attachments: attachments.map(att => ({
            filename: att.filename,
            contentType: att.mimeType || 'application/octet-stream',
            data: att.data
          }))
        });

        processedApplications.push(application);

        // Mark the email as read
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });

        console.log(`Processed and marked as read: ${message.id}`);
      } catch (error) {
        if (error.code === 'insufficient_quota') {
          throw error; // Re-throw to stop processing all emails
        }
        console.error(`Error processing email ${message.id}:`, error);
      }
    }

    res.json({ success: true, message: 'Emails processed successfully', applications: processedApplications });
  } catch (error) {
    console.error('Detailed error in fetchAndProcessEmails:', error);
    res.status(500).json({ success: false, message: 'Failed to process emails', error: error.message });
  }
};

module.exports = { fetchAndProcessEmails };
