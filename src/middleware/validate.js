import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';
import { StatusCodes } from 'http-status-codes';

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

export { validate };
