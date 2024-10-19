require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { passport } = require('./config/auth');
const errorMiddleware = require('./middleware/errorMiddleware');
const jwt = require('jsonwebtoken');
const Job = require('./models/Job');
const Application = require('./models/Application');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Passport middleware
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));

// Protected jobs route
app.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs', error: error.message });
  }
});

// Route for updating a job
app.put('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job', error: error.message });
  }
});

// Route for processing applications
app.post('/process-applications', authenticateToken, async (req, res) => {
  const { jobId } = req.body;
  
  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Fetch unprocessed applications for this job
    const applications = await Application.find({ jobId, processed: false });

    // Process each application (this is where you'd implement your AI matching logic)
    for (let app of applications) {
      // Example: Simple random score assignment
      app.score = Math.floor(Math.random() * 100);
      app.processed = true;
      await app.save();
    }

    res.json({ message: `Processed ${applications.length} applications` });
  } catch (error) {
    console.error('Error processing applications:', error);
    res.status(500).json({ message: 'Error processing applications' });
  }
});

// Error handling middleware
app.use(errorMiddleware);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
