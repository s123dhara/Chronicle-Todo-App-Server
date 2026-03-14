'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect routes — verifies Bearer token and attaches req.user
 */
const protect = catchAsync(async (req, _res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No token provided. Please log in.'));
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Your session has expired. Please log in again.'));
    }
    return next(AppError.unauthorized('Invalid token. Please log in again.'));
  }

  // 3. Check user still exists and is active
  const user = await User.findById(decoded.userId).select('-password -refreshTokens');
  if (!user) {
    return next(AppError.unauthorized('The account belonging to this token no longer exists.'));
  }
  if (!user.isActive) {
    return next(AppError.unauthorized('This account has been deactivated.'));
  }

  // 4. Attach user to request
  req.user = user;
  next();
});

/**
 * Optional auth — attaches req.user if valid token present, but does not fail
 */
const optionalAuth = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    if (user && user.isActive) req.user = user;
  } catch {
    // Silently ignore — optional
  }
  next();
});

module.exports = { protect, optionalAuth };
