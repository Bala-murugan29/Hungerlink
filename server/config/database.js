const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri || typeof uri !== 'string' || !uri.trim()) {
      throw new Error(
        'MONGODB_URI is not set. Create a .env at the repo root and define MONGODB_URI. For local dev, try: mongodb://127.0.0.1:27017/hungerlink'
      );
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (!process.env.MONGODB_URI) {
      console.error('ℹ️ Tip: Ensure .env exists at project root and includes MONGODB_URI. See .env.example for a template.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;