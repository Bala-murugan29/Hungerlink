const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Login validation rules
const validateLogin = [
  body('emailOrPhone')
    .notEmpty()
    .withMessage('Email or phone is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Registration validation rules
const validateRegistration = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('emailOrPhone')
    .notEmpty()
    .withMessage('Email or phone is required')
    .trim()
    .custom((value) => {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Please provide a valid email or phone number');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['donor', 'recipient', 'ngo'])
    .withMessage('Role must be donor, recipient, or ngo'),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim(),
  body('ngoId')
    .if(body('role').equals('ngo'))
    .notEmpty()
    .withMessage('NGO registration ID is required for NGO accounts')
    .trim(),
  handleValidationErrors
];

// Profile update validation rules
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateRegistration,
  validateProfileUpdate,
  handleValidationErrors
};