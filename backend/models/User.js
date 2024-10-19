const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  name: { type: String },
  googleId: { type: String },
  googleAccessToken: { type: String },
  googleRefreshToken: { type: String },
}, { timestamps: true });

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.password) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
