'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // force IPv4
};

/**
 * Connect to MongoDB. Exits the process on failure in production
 * so the container orchestrator can restart cleanly.
 */
const connectDB = async () => {
  const uri = process.env.NODE_ENV === 'test' ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;

  if (!uri) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    // logger.info('MongoDB connection established');
    logger.info(`Connected to MongoDB: ${conn.connection.name}`);

    logger.info(
      `MongoDB connected → ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`
    );
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

// ── Connection event hooks ────────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB runtime error: ${err.message}`);
});

// Graceful teardown — called by server shutdown handler
const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed gracefully');
};

module.exports = { connectDB, disconnectDB };
