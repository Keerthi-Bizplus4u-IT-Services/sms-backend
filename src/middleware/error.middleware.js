const logger = require('../utils/logger');
const { error: errorResponse } = require('../utils/response');

/**
 * Global Error Handling Middleware
 * Catches and formats all errors
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let { statusCode = 500, message, errors } = err;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry found';
    errors = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} already exists`,
      value: e.value
    }));
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference - related record not found';
    logger.error('SequelizeForeignKeyConstraintError details:', {
      originalMessage: err.message,
      table: err.table || err.parent?.table || 'N/A',
      constraint: err.parent?.constraint || 'N/A',
      detail: err.parent?.detail || 'N/A',
      sql: err.sql || err.parent?.sql || 'N/A'
    });
  }

  // Sequelize Database Error
  if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = 'Database error occurred';
    logger.error('SequelizeDatabaseError details:', {
      originalMessage: err.message,
      sql: err.sql || err.parent?.sql || 'N/A',
      sqlParameters: err.parameters || err.parent?.parameters || 'N/A',
      detail: err.parent?.detail || 'N/A',
      constraint: err.parent?.constraint || 'N/A',
      table: err.parent?.table || 'N/A',
      column: err.parent?.column || 'N/A',
      code: err.parent?.code || 'N/A'
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size too large';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'An error occurred while processing your request';
    errors = null;
  }

  // Send error response
  return errorResponse(res, message, statusCode, errors);
};

/**
 * Handle 404 - Not Found
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
