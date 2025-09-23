const express = require('express');
const router = express.Router();


const authRoutes = require('./auth');
const donationRoutes = require('./donation');
const requestRoutes = require('./request');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HungerLink API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/donations', donationRoutes);
router.use('/requests', requestRoutes);

// 404 handler for API routes (only one)
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = router;