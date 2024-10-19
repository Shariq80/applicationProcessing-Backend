const { google } = require('googleapis');

const getGmailService = (accessToken, refreshToken) => {
  if (!accessToken || !refreshToken) {
    console.error('Missing tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
    throw new Error('Access token and refresh token are required');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

module.exports = { getGmailService };
