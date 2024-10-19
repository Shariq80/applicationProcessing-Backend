const User = require('../models/User');
const GoogleCredential = require('../models/GoogleCredential');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { google: googleApis } = require('googleapis');
const bcrypt = require('bcrypt');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Add this function at the top of your file
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Use the generateToken function here
    const token = generateToken(user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const googleAuth = (req, res) => {
  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  const authorizationUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
  });

  res.json({ url: authorizationUrl });
};

const googleCallback = async (req, res) => {
  const { code } = req.query;

  try {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const userInfo = await oAuth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });

    let user = await User.findOne({ email: userInfo.data.email });

    if (!user) {
      user = await User.create({
        name: userInfo.data.name,
        email: userInfo.data.email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    }

    await GoogleCredential.findOneAndUpdate(
      { user: user._id },
      { 
        user: user._id,
        accessToken: tokens.access_token, 
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date)
      },
      { upsert: true, new: true }
    );

    const jwtToken = generateToken(user._id);

    res.json({
      message: 'Google authentication successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.status(500).json({ error: 'Failed to process Google OAuth', details: error.message });
  }
};

module.exports = {
  login,
  generateToken,
  googleAuth,
  googleCallback,
};
