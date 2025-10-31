const logger = require('../../utils/logger');

/**
 * Custom error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, details } = err;

  // Default to 500 if statusCode not set
  if (!statusCode) {
    statusCode = 500;
  }

  // Log error
  logger.error(`Error ${statusCode}: ${message}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    details: details || undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

module.exports = {
  ApiError,
  errorHandler,
  notFound
};