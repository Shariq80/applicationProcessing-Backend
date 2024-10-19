const { OAuth2Client } = require('google-auth-library');

console.log('Initializing OAuth2Client...');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
console.log('OAuth2Client initialized');

module.exports = client;
