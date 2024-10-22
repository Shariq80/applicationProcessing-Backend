require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User model
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
}));

async function addUser(email, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    console.log(`User ${email} added successfully`);
  } catch (error) {
    console.error('Error adding user:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

// Usage: node addUser.js <email> <password>
const [email, password] = process.argv.slice(2);
if (email && password) {
  addUser(email, password);
}