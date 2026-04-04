import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { StatusCodes } from 'http-status-codes';

// ── GET /api/v1/health ────────────────────────────────────────────────────────
const healthCheck = catchAsync(async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  const isHealthy = dbState === 1;
  const uptime = process.uptime();

  const data = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    node: process.version,
    env: process.env.NODE_ENV,
    database: {
      status: dbStatus[dbState] || 'unknown',
      name: mongoose.connection.name || 'N/A',
    },
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
  };

  if (!isHealthy) {
    return sendError(res, {
      statusCode: StatusCodes.SERVICE_UNAVAILABLE,
      message: 'Service degraded',
      errors: [data],
    });
  }

  return sendSuccess(res, { message: 'Service operational', data });
});

// ── GET /api/v1/health/ping — ultra-light liveness probe ─────────────────────
const ping = (_req, res) => res.status(200).json({ pong: true, ts: Date.now() });

export { healthCheck, ping };
