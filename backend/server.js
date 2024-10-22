require('dotenv').config();

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const dashboardRoutes = require('./routes/dashboardRoutes');
const rateLimit = require('express-rate-limit');
const { fetchAndProcessEmails } = require('./controllers/emailController');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
require('./config/auth');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Catch-all route for unmatched requests
app.use((req, res) => {
  console.log('Unmatched route:', req.method, req.url);
  res.status(404).send('Route not found');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
