'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');
const { StatusCodes } = require('http-status-codes');

/**
 * Must be placed AFTER the validator chain array in the route definition.
 * Formats express-validator errors into a clean, consistent shape.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return sendError(res, {
    statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
    message: 'Validation failed',
    errors,
  });
};

module.exports = { validate };
