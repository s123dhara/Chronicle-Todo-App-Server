'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

// ── Custom Morgan token: response body size ───────────────────────────────────
morgan.token('body-size', (req, res) => {
  const len = res.getHeader('content-length');
  return len ? `${len}b` : '-';
});

// ── Token: authenticated user id ──────────────────────────────────────────────
morgan.token('user-id', (req) => (req.user ? req.user._id.toString() : 'anon'));

// ── Format strings ────────────────────────────────────────────────────────────
const DEV_FORMAT = ':method :url :status :response-time ms — :body-size [user::user-id]';
const PROD_FORMAT =
  ':remote-addr :method :url :status :response-time ms :body-size [user::user-id]';

const httpLogger = morgan(process.env.NODE_ENV === 'production' ? PROD_FORMAT : DEV_FORMAT, {
  stream: logger.stream,
});

module.exports = httpLogger;
