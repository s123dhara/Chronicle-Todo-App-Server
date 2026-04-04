import { StatusCodes } from 'http-status-codes';
import authService from '../services/authService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.register({ name, email, password });

  return sendSuccess(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Account created successfully',
    data: { user, accessToken, refreshToken },
  });
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({ email, password });

  return sendSuccess(res, {
    statusCode: StatusCodes.OK,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
});

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const { accessToken, refreshToken: newRefresh } = await authService.refreshAccessToken(token);

  return sendSuccess(res, {
    message: 'Token refreshed',
    data: { accessToken, refreshToken: newRefresh },
  });
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
const logout = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const logoutAll = req.query.all === 'true';
  await authService.logout(req.user._id, token, logoutAll);

  return sendSuccess(res, {
    message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully',
  });
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  return sendSuccess(res, {
    message: 'User profile fetched',
    data: { user: req.user },
  });
});

// ── PATCH /api/v1/auth/me ─────────────────────────────────────────────────────
const updateMe = catchAsync(async (req, res) => {
  const { name, theme } = req.body;
  const user = await authService.updateProfile(req.user._id, { name, theme });

  return sendSuccess(res, {
    message: 'Profile updated',
    data: { user },
  });
});

// ── PATCH /api/v1/auth/change-password ───────────────────────────────────────
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);

  return sendSuccess(res, {
    message: 'Password changed successfully. Please log in again on all devices.',
  });
});

export { register, login, refreshToken, logout, getMe, updateMe, changePassword };
