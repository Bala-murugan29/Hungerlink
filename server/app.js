const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/database');
const routes = require('./routes');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // allow 100 requests per 15 minutes for development
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://hungerlink-gules.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser clients
    if (allowedOrigins.some((o) => o === origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/photos', express.static(path.join(__dirname, '../uploads/photos')));


// API routes
app.use('/api', routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Handle 404 for non-API routes (only one)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 HungerLink server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;