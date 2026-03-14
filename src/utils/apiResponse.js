'use strict';

const { StatusCodes } = require('http-status-codes');

/**
 * Unified success response envelope
 * { success, statusCode, message, data, meta }
 */
const sendSuccess = (
  res,
  { statusCode = StatusCodes.OK, message = 'Success', data = null, meta = null } = {}
) => {
  const payload = { success: true, statusCode, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

/**
 * Unified error response envelope
 * { success, statusCode, message, errors? }
 */
const sendError = (
  res,
  {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    message = 'Internal Server Error',
    errors = null,
  } = {}
) => {
  const payload = { success: false, statusCode, message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

/**
 * Build pagination meta object
 */
const paginationMeta = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = { sendSuccess, sendError, paginationMeta };
