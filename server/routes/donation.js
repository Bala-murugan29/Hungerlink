const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { authenticateToken } = require('../middleware/auth');
const Request = require('../models/Request');
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

    // Parse optional request linkage and enforce quantity
    let linkedRequest = null;
    let requestId = req.body.request || req.body.requestId || null;
    if (requestId) {
      linkedRequest = await Request.findById(requestId);
      if (!linkedRequest) {
        return res.status(400).json({ success: false, message: 'Linked request not found' });
      }
    }

    // Parse aiAnalysis if present as JSON string
    let aiAnalysis = undefined;
    if (req.body.aiAnalysis) {
      try {
        aiAnalysis = typeof req.body.aiAnalysis === 'string' ? JSON.parse(req.body.aiAnalysis) : req.body.aiAnalysis;
      } catch (_) {
        aiAnalysis = undefined; // ignore bad payload
      }
    }

    const donation = new Donation({
      ...req.body,
      ...(aiAnalysis ? { aiAnalysis } : {}),
      request: linkedRequest ? linkedRequest._id : undefined,
      location,
      user: req.user._id,
      photo: photoPath,
      // If linked to a request, mark as claimed by that requester
      ...(linkedRequest ? { status: 'claimed', claimedBy: linkedRequest.user } : {})
    });

    // Ensure numericQuantity is computed
    await donation.validate();

    // If not explicitly linked, try auto-match by food name and remaining quantity
    if (!linkedRequest) {
      const simplify = (s = '') => String(s).trim().toLowerCase();
      const dName = simplify(donation.foodType);
      if (dName) {
        const candidates = await Request.find({ status: { $in: ['open', 'accepted'] } });
        let chosen = null;
        for (const r of candidates) {
          const rName = simplify(r.foodNeeded);
          const match = rName.includes(dName) || dName.includes(rName);
          const remaining = Math.max(0, (r.numericRequested || 0) - (r.fulfilledQuantity || 0));
          if (match && remaining >= (donation.numericQuantity || 0)) {
            chosen = r;
            break;
          }
        }
        if (chosen) {
          linkedRequest = chosen;
          donation.request = chosen._id;
        }
      }
    }

    // If linked to a request, enforce not exceeding remainingQuantity
    if (linkedRequest) {
      const remaining = Math.max(0, (linkedRequest.numericRequested || 0) - (linkedRequest.fulfilledQuantity || 0));
      if (donation.numericQuantity > remaining) {
        return res.status(400).json({
          success: false,
          message: `Donation quantity exceeds remaining request amount (${donation.numericQuantity} > ${remaining})`
        });
      }
    }

    await donation.save();

    if (linkedRequest) {
      // Atomically increment fulfilled and adjust status
      const inc = donation.numericQuantity || 0;
      const updated = await Request.findByIdAndUpdate(
        linkedRequest._id,
        {
          $inc: { fulfilledQuantity: inc }
        },
        { new: true }
      );
      // If fully fulfilled, mark status accordingly
      if (updated) {
        // Save to trigger pre-save logic and status clamping
        await updated.save();
        const remainingAfter = Math.max(0, (updated.numericRequested || 0) - (updated.fulfilledQuantity || 0));
        if (remainingAfter === 0) {
          // Mark donation complete if it exactly fulfills the request
          donation.status = 'completed';
          await donation.save();
        }
      }
    }

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
    const donations = await Donation.find().populate('user claimedBy request');
    res.json({ success: true, donations });
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
