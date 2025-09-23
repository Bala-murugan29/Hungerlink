const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

// Register new user
const register = async (req, res) => {
  try {
    console.log('Registration request received:', {
      body: req.body,
      file: req.file ? { filename: req.file.filename, size: req.file.size } : null
    });

    const { name, emailOrPhone, password, role, location, ngoId } = req.body;

    // Validate required fields
    if (!name || !emailOrPhone || !password || !role || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'emailOrPhone', 'password', 'role', 'location']
      });
    }

    // Determine if emailOrPhone is email or phone
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const isEmail = emailRegex.test(emailOrPhone);

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(emailOrPhone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `User with this ${isEmail ? 'email' : 'phone number'} already exists`
      });
    }

    // Parse location coordinates if provided
    let coordinates = [0, 0];
    if (location.includes('GPS:')) {
      const coordsMatch = location.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
      if (coordsMatch) {
        coordinates = [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])]; // [lng, lat]
      }
    }

    // Prepare user data
    const userData = {
      name,
      password,
      role,
      location: {
        address: location,
        coordinates: {
          type: 'Point',
          coordinates: coordinates
        }
      }
    };

    // Set email or phone
    if (isEmail) {
      userData.email = emailOrPhone.toLowerCase();
    } else {
      userData.phone = emailOrPhone;
    }

    // Add NGO specific data
    if (role === 'ngo') {
      userData.ngoDetails = {
        registrationId: ngoId,
        certificatePath: req.file ? req.file.path : null,
        isVerified: false
      };
    }

    console.log('Creating user with data:', userData);

    // Create user
    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user._id);

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: `🎉 Account created successfully. Welcome, ${user.name}!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isPhoneVerified: user.isPhoneVerified,
        ngoDetails: user.ngoDetails,
        isActive: user.isActive
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Clean up uploaded file if registration fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);

    const { emailOrPhone, password } = req.body;

    // Validate required fields
    if (!emailOrPhone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/phone and password are required'
      });
    }

    // Find user by email or phone and include password
    const user = await User.findByEmailOrPhone(emailOrPhone).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password. Please try again.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password. Please try again.'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('Login successful for user:', user._id);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isPhoneVerified: user.isPhoneVerified,
        ngoDetails: user.ngoDetails,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          location: user.location,
          ngoDetails: user.ngoDetails,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, location } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (location) {
      // Parse location coordinates if provided
      let coordinates = [0, 0];
      if (location.includes('GPS:')) {
        const coordsMatch = location.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
        if (coordsMatch) {
          coordinates = [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])]; // [lng, lat]
        }
      }

      updateData.location = {
        address: location,
        coordinates: {
          type: 'Point',
          coordinates: coordinates
        }
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          location: user.location,
          ngoDetails: user.ngoDetails,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Logout user (client-side token removal, but we can track it)
const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
};
