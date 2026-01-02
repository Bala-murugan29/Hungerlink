const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const { authenticateToken } = require('../middleware/auth');

// Create a request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const payload = { ...req.body, user: req.user._id };
    // Ensure location shape
    if (payload.location && typeof payload.location === 'string') {
      payload.location = { address: payload.location };
    }
    const request = new Request(payload);
    await request.save();
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all requests for a user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all requests
router.get('/', async (req, res) => {
  try {
    const requests = await Request.find().populate('user');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update request status
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const request = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
