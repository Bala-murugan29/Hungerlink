const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateLogin, validateRegistration, validateProfileUpdate } = require('../middleware/validation');
const { upload, handleUploadError } = require('../middleware/upload');

// Public routes
router.post('/register', 
  upload.single('certificate'), 
  handleUploadError,
  validateRegistration, 
  authController.register
);

router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
