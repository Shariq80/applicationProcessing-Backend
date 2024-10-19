const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { someProtectedFunction } = require('../controllers/someController');

router.get('/protected', protect, someProtectedFunction);

module.exports = router;
