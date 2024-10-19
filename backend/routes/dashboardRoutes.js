const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  console.log('Dashboard route accessed by user:', req.user._id);
  
  try {
    // Fetch dashboard data from your database
    const dashboardData = await fetchDashboardData(req.user._id);

    console.log('Fetched dashboard data:', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

async function fetchDashboardData(userId) {
  // Implement your actual database queries here
  // For now, we'll return mock data
  console.log('Fetching dashboard data for user:', userId);
  
  // Simulate a database query
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    totalApplications: 100,
    processedApplications: 75,
    averageScore: 85.5,
    recentApplications: [
      { id: 1, applicantName: 'John Doe', status: 'Pending' },
      { id: 2, applicantName: 'Jane Smith', status: 'Reviewed' },
    ]
  };
}

module.exports = router;
