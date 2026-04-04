import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { StatusCodes } from 'http-status-codes';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 min
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20;

const handler = (_req, res) =>
  sendError(res, {
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP. Please try again later.',
  });

/** General API limiter */
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Stricter limiter for auth endpoints */
const authLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip + (req.body?.email || ''),
});

/** Task mutation limiter (create/update/delete) */
const mutationLimiter = rateLimit({
  windowMs,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export { apiLimiter, authLimiter, mutationLimiter };
