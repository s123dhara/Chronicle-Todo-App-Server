'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const routes = require('./routes');
const httpLogger = require('./middleware/httpLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ── 1. Security headers (Helmet) ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? undefined // use Helmet defaults in prod
        : false, // disable CSP in dev for convenience
  })
);

// ── 2. CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ── 3. Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ── 4. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // reject payloads > 10 KB
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── 5. NoSQL injection sanitizer ──────────────────────────────────────────────
app.use(mongoSanitize());

// ── 6. HTTP parameter pollution guard ─────────────────────────────────────────
app.use(
  hpp({
    whitelist: ['status', 'priority', 'category'], // allow these as arrays
  })
);

// ── 7. HTTP request logger ────────────────────────────────────────────────────
app.use(httpLogger);

// ── 8. Global rate limiter ────────────────────────────────────────────────────
app.use(`/api/${process.env.API_VERSION || 'v1'}`, apiLimiter);

// ── 9. Trust proxy (needed for rate-limiting behind Nginx / load balancer) ───
app.set('trust proxy', 1);

// ── 10. Routes ────────────────────────────────────────────────────────────────
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// ── 11. Root info endpoint ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Chronicle Task Manager API',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    docs: `/api/${process.env.API_VERSION || 'v1'}/health`,
    timestamp: new Date().toISOString(),
  });
});

// ── 14. Time info endpoint ────────────────────────────────────────────────────
app.get('/time', (_req, res) => {
  res.json({
    iso: new Date().toISOString(),
    utc: new Date().toUTCString(),
    local: new Date().toString(),
  });
});

// ── 12. 404 handler ───────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── 13. Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
