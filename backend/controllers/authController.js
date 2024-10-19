const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios'); // Make sure to install axios: npm install axios

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const googleAuth = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    let accessToken = authHeader.split(' ')[1];

    try {
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userData = userInfoResponse.data;

      let user = await User.findOne({ googleId: userData.sub });
      if (!user) {
        user = await User.create({
          googleId: userData.sub,
          email: userData.email,
          name: userData.name,
          googleAccessToken: accessToken,
        });
      } else {
        user.googleAccessToken = accessToken;
        await user.save();
      }

      const jwtToken = generateToken(user._id);

      res.json({
        message: 'Google authentication successful',
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        try {
          const user = await User.findOne({ googleAccessToken: accessToken });
          if (user && user.googleRefreshToken) {
            const { tokens } = await client.refreshAccessToken(user.googleRefreshToken);
            accessToken = tokens.access_token;
            user.googleAccessToken = accessToken;
            await user.save();

            const retryResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            const userData = retryResponse.data;

            const jwtToken = generateToken(user._id);

            res.json({
              message: 'Google authentication successful',
              token: jwtToken,
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
              },
            });
          } else {
            throw new Error('No refresh token available');
          }
        } catch (refreshError) {
          throw new Error('Failed to refresh access token');
        }
      } else {
        throw new Error(`Failed to fetch user info: ${error.message}`);
      }
    }
  } catch (error) {
    res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
};

const googleCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await client.getToken(code);
    const user = await User.findById(req.user._id);
    user.googleAccessToken = tokens.access_token;
    user.googleRefreshToken = tokens.refresh_token;
    await user.save();
    res.redirect(process.env.FRONTEND_URL + '/dashboard');
  } catch (error) {
    res.status(500).json({ message: 'Error during Google authentication' });
  }
};

module.exports = { login, googleAuth, googleCallback };
