const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Set up multer storage for photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/photos');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create a donation
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    let { location } = req.body;
    // Parse location if sent as string (from FormData)
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid location format' });
      }
    }

    // Handle photo upload
    let photoPath = '';
    if (req.file) {
      // Store relative path for frontend access
      photoPath = `/uploads/photos/${req.file.filename}`;
    }

    const donation = new Donation({
      ...req.body,
      location,
      user: req.user._id,
      photo: photoPath
    });
    await donation.save();
    res.status(201).json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all donations for a user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user._id });
    res.json({ success: true, donations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all donations
router.get('/', async (req, res) => {
  try {
    const donations = await Donation.find().populate('user claimedBy');
    res.json(donations);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update donation status
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const donation = await Donation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
