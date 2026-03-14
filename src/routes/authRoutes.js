'use strict';

const router = require('express').Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
} = require('../validators/authValidators');

// ── Public routes (rate-limited) ──────────────────────────────────────────────

/** @route  POST /api/v1/auth/register
 *  @desc   Create new account
 *  @access Public
 */
router.post('/register', authLimiter, registerValidator, validate, authController.register);

/** @route  POST /api/v1/auth/login
 *  @desc   Login and receive tokens
 *  @access Public
 */
router.post('/login', authLimiter, loginValidator, validate, authController.login);

/** @route  POST /api/v1/auth/refresh
 *  @desc   Rotate refresh token and get new access token
 *  @access Public
 */
router.post('/refresh', authLimiter, refreshTokenValidator, validate, authController.refreshToken);

// ── Protected routes ──────────────────────────────────────────────────────────

/** @route  POST /api/v1/auth/logout
 *  @desc   Logout (add ?all=true to revoke all devices)
 *  @access Private
 */
router.post('/logout', protect, authController.logout);

/** @route  GET  /api/v1/auth/me
 *  @desc   Get current user profile
 *  @access Private
 */
router.get('/me', protect, authController.getMe);

/** @route  PATCH /api/v1/auth/me
 *  @desc   Update name / theme preference
 *  @access Private
 */
router.patch('/me', protect, authController.updateMe);

/** @route  PATCH /api/v1/auth/change-password
 *  @desc   Change password (invalidates all refresh tokens)
 *  @access Private
 */
router.patch(
  '/change-password',
  protect,
  changePasswordValidator,
  validate,
  authController.changePassword
);

module.exports = router;
