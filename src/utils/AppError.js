import { StatusCodes } from 'http-status-codes';

/**
 * Operational error — expected, handled gracefully.
 * Non-operational errors (programmer bugs) are NOT AppErrors.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode   HTTP status code
   * @param {Array}  [errors]     Validation error array
   */
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = null) {
    return new AppError(message, StatusCodes.BAD_REQUEST, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, StatusCodes.UNAUTHORIZED);
  }

  static forbidden(message = 'Access denied') {
    return new AppError(message, StatusCodes.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, StatusCodes.NOT_FOUND);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(message, StatusCodes.CONFLICT);
  }

  static unprocessable(message, errors = null) {
    return new AppError(message, StatusCodes.UNPROCESSABLE_ENTITY, errors);
  }

  static tooMany(message = 'Too many requests') {
    return new AppError(message, StatusCodes.TOO_MANY_REQUESTS);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export default AppError;
