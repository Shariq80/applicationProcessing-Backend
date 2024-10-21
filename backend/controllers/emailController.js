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
    const skippedEmails = [];

    for (const message of messages) {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const parsedEmail = await parseEmail(email.data, job.title, gmail, message.id);

        if (!parsedEmail) {
          console.log(`Skipping email ${message.id}: Unable to parse or invalid application`);
          skippedEmails.push(message.id);
          continue;
        }

        const { applicantEmail, resumeText, extractedJobTitle, attachmentFilename } = parsedEmail;

        if (!resumeText || resumeText.trim().length === 0) {
          console.log(`Skipping email ${message.id}: No valid resume text found`);
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
          console.log(`Skipping already processed email: ${message.id}`);
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
        let retries = 3;
        let modificationSuccessful = false;
        while (retries > 0 && !modificationSuccessful) {
          try {
            await gmail.users.messages.modify({
              userId: 'me',
              id: message.id,
              requestBody: {
                addLabelIds: ['Label_Processed'], // Replace with your actual label ID
                removeLabelIds: ['INBOX']
              }
            });
            console.log(`Processed and marked as read: ${message.id}`);
            modificationSuccessful = true;
          } catch (modifyError) {
            console.error(`Error modifying email ${message.id}:`, modifyError);
            retries--;
            if (retries === 0) {
              console.log(`Failed to modify email ${message.id} after 3 attempts`);
              skippedEmails.push({ id: message.id, reason: 'Email modification failed' });
            } else {
              console.log(`Retrying email modification for ${message.id}. Attempts left: ${retries}`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
            }
          }
        }

        if (!modificationSuccessful) {
          console.log(`Proceeding with email processing for ${message.id} despite modification failure`);
        }

        // Add this line to mark the email as read even if modification fails
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });
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

module.exports = { fetchAndProcessEmails };
