const { google } = require('googleapis');

const getGmailService = (accessToken, refreshToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

module.exports = { getGmailService };