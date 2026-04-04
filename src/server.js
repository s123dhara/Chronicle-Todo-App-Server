import 'dotenv/config.js';
import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { startSyncDelayedCron } from './jobs/index.js';
import logger from './utils/logger.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// ── Catch unhandled promise rejections ────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason: reason?.message || reason, promise });
  // Give the server time to finish in-flight requests, then exit
  gracefulShutdown('unhandledRejection');
});

// ── Catch uncaught synchronous exceptions ─────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

// ── Start sequence ────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create and start HTTP server
    const server = http.createServer(app);

    // 3. Start Cron jobs
    startSyncDelayedCron();

    server.listen(PORT, HOST, () => {
      logger.info(`
  ┌─────────────────────────────────────────────┐
  │           Chronicle API Server               │
  │  Env  : ${(process.env.NODE_ENV || 'development').padEnd(34)}│
  │  Host : ${HOST.padEnd(34)}│
  │  Port : ${String(PORT).padEnd(34)}│
  │  Node : ${process.version.padEnd(34)}│
  └─────────────────────────────────────────────┘`);
    });

    // ── Graceful shutdown helper ───────────────────────────────────────────────
    let isShuttingDown = false;

    async function gracefulShutdown(signal) {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await disconnectDB();
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err.message);
          process.exit(1);
        }
      });

      // Force exit after 15 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 15_000);
    }

    // OS termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
