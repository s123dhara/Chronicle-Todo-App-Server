'use strict';

const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/AppError');
const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ── Mongoose error translators ────────────────────────────────────────────────

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, StatusCodes.BAD_REQUEST);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(
    `Duplicate value for ${field}: "${value}". Please use another value.`,
    StatusCodes.CONFLICT
  );
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));
  return new AppError('Validation failed', StatusCodes.UNPROCESSABLE_ENTITY, errors);
};

// ── JWT error translators ─────────────────────────────────────────────────────
const handleJWTError = () => AppError.unauthorized('Invalid token. Please log in again.');
const handleJWTExpiredError = () =>
  AppError.unauthorized('Your session has expired. Please log in again.');

// ── Development vs Production response ───────────────────────────────────────
const sendDevError = (res, err) => {
  logger.error(err);
  return sendError(res, {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message,
    errors: err.errors || null,
    stack: err.stack,
  });
};

const sendProdError = (res, err) => {
  if (err.isOperational) {
    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors || null,
    });
  }
  // Unknown / programmer error — don't leak details
  logger.error('UNHANDLED ERROR:', err);
  return sendError(res, {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'Something went wrong. Please try again later.',
  });
};

// ── Global error handler ──────────────────────────────────────────────────────
const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  // Log every error at appropriate level
  if (err.statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn({
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      status: err.statusCode,
    });
  }

  let error = { ...err, message: err.message };

  // Translate known Mongoose / JWT error types into AppErrors
  if (err instanceof mongoose.Error.CastError) error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err instanceof mongoose.Error.ValidationError) error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') return sendDevError(res, error);
  return sendProdError(res, error);
};

// ── 404 handler (must be added BEFORE errorHandler in app.js) ─────────────────
const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, StatusCodes.NOT_FOUND));
};

module.exports = { errorHandler, notFoundHandler };
