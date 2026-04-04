import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

class AuthService {
  /**
   * Register a new user
   * @returns {{ user, accessToken, refreshToken }}
   */
  async register({ name, email, password }) {
    const existing = await User.findOne({ email }).select('_id');
    if (existing) throw AppError.conflict('An account with this email already exists');

    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = await this._issueTokens(user);

    logger.info(`New user registered: ${email}`);
    return { user, accessToken, refreshToken };
  }

  /**
   * Login with email + password
   * @returns {{ user, accessToken, refreshToken }}
   */
  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      throw AppError.unauthorized('Invalid email or password');
    }
    if (!user.isActive) {
      throw AppError.unauthorized('This account has been deactivated');
    }

    const { accessToken, refreshToken } = await this._issueTokens(user);
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);
    return { user, accessToken, refreshToken };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) throw AppError.badRequest('Refresh token required');

    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.isActive) throw AppError.unauthorized('User not found or inactive');

    // Validate that this specific refresh token is stored (rotation check)
    if (!user.refreshTokens.includes(incomingRefreshToken)) {
      // Possible token reuse — revoke all refresh tokens (security measure)
      user.refreshTokens = [];
      await user.save();
      logger.warn(`Refresh token reuse detected for user ${user.email}. All tokens revoked.`);
      throw AppError.unauthorized('Refresh token reuse detected. Please log in again.');
    }

    // Rotate: remove old, issue new
    user.refreshTokens = user.refreshTokens.filter((t) => t !== incomingRefreshToken);
    const { accessToken, refreshToken: newRefreshToken } = await this._issueTokens(user);

    logger.info(`Tokens refreshed for user: ${user.email}`);
    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout — invalidate one or all refresh tokens
   */
  async logout(userId, refreshToken, logoutAll = false) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    if (logoutAll) {
      user.refreshTokens = [];
    } else if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    }
    await user.save();
    logger.info(`User logged out: ${user.email}${logoutAll ? ' (all devices)' : ''}`);
  }

  /**
   * Update user profile (name, theme)
   */
  async updateProfile(userId, updates) {
    const allowed = {};
    if (updates.name !== undefined) allowed.name = updates.name;
    if (updates.theme !== undefined) allowed.theme = updates.theme;

    const user = await User.findByIdAndUpdate(userId, allowed, { new: true, runValidators: true });
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password +refreshTokens');
    if (!user) throw AppError.notFound('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw AppError.unauthorized('Current password is incorrect');

    user.password = newPassword;
    user.refreshTokens = []; // Force re-login on all devices after password change
    await user.save();
    logger.info(`Password changed for user: ${user.email}`);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  async _issueTokens(user) {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token (keep max 5 sessions)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }
}

export default new AuthService();
