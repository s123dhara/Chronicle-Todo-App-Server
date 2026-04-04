/**
 * Wraps an async Express route handler and forwards any rejection to next().
 * Eliminates the need for try/catch in every controller.
 *
 * @param  {Function} fn  Async (req, res, next) handler
 * @returns {Function}    Express middleware
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
