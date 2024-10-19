const mongoose = require('mongoose');

const googleCredentialSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiryDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('GoogleCredential', googleCredentialSchema);
