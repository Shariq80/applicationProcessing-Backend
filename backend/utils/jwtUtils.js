const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  console.log('Generating token for user:', userId);
  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  console.log('Generated token:', token);
  return token;
};

module.exports = { generateToken };
