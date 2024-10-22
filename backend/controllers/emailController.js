const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const { processResume } = require('../services/openaiService');
const { parseEmail } = require('../utils/emailParser');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const GoogleCredential = require('../models/GoogleCredential');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const sanitize = require('sanitize-filename');

const fetchOAuthCredentialsFromDB = async () => {
  const credential = await GoogleCredential.findOne().sort({ createdAt: -1 });
  if (!credential) {
    throw new Error('No Google credentials found in the database');
  }
  return credential;
};

const fetchAndProcessEmails = async (req, res) => {
  try {
    const { jobTitle } = req.params;
    
    const job = await Job.findOne({ title: jobTitle });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const oauthCredentials = await fetchOAuthCredentialsFromDB();

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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const messages = response.data.messages || [];
    const processedApplications = [];
    const skippedEmails = [];

    for (const message of messages) {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        const { applicantEmail, resumeText, extractedJobTitle, attachmentFilename } = parsedEmail;

        if (!resumeText || resumeText.trim().length === 0) {
          skippedEmails.push(message.id);
          continue;
        }

        let processedResult;
        try {
          processedResult = await processResume(resumeText, job.description);
        } catch (openaiError) {
          console.error('Error processing resume with OpenAI:', openaiError);
          processedResult = {
            score: 0,
            summary: "Error occurred while processing the resume. Please review manually.",
            missingSkills: []
          };
        }

        const existingApplication = await Application.findOne({ emailId: message.id });
        if (existingApplication) {
          continue;
        }

        const application = new Application({
          applicantEmail,
          jobTitle: extractedJobTitle,
          resumeText,
          score: processedResult.score,
          summary: processedResult.summary,
          missingSkills: processedResult.missingSkills,
          attachmentFilename: attachmentFilename,
          job: job._id
        });

        await application.save();
        processedApplications.push(application);

        // Mark the email as processed
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: message.id,
            requestBody: {
              addLabelIds: ['PROCESSED'],
              removeLabelIds: ['INBOX', 'UNREAD']
            }
          });
        } catch (modifyError) {
          console.error(`Error modifying email ${message.id}:`, modifyError);
          skippedEmails.push({ id: message.id, reason: 'Email modification failed' });
        }
      } catch (emailError) {
        console.error(`Error processing email ${message.id}:`, emailError);
        skippedEmails.push(message.id);
      }
    }

    res.json({ 
      success: true, 
      message: 'Emails processed', 
      applications: processedApplications,
      skippedEmails: skippedEmails
    });
  } catch (error) {
    console.error('Error fetching and processing emails:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching and processing emails', 
      error: error.message,
      processedApplications: processedApplications || [],
      skippedEmails: skippedEmails || []
    });
  }
};

const downloadAttachments = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const applications = await Application.find({ job: jobId });

    const baseDir = path.join(__dirname, '..', 'attachments');
    const jobDir = path.join(baseDir, sanitize(job.title));

    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    for (const application of applications) {
      if (application.attachmentFilename) {
        const sourceFile = path.join(baseDir, `${application.emailId}_${application.attachmentFilename}`);
        const destFile = path.join(jobDir, sanitize(application.attachmentFilename));

        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, destFile);
        } else {
          console.log(`Source file not found: ${sourceFile}`);
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Attachments downloaded and organized by job title', 
      jobTitle: job.title,
      attachmentsPath: jobDir
    });
  } catch (error) {
    console.error('Error downloading attachments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error downloading attachments', 
      error: error.message 
    });
  }
};

module.exports = {
  fetchAndProcessEmails,
  downloadAttachments
};
