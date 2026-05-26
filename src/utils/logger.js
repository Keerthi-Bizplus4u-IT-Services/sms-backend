/**
 * Logger Utility
 * Centralized logging with levels and request tracking
 */

const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Create logger instance
const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// If not in production, log to console with more details
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

/**
 * Log with request context
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const logWithContext = (level, message, meta = {}) => {
  const logData = {
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };
  
  logger.log(level, logData);
};

module.exports = {
  logger,
  logWithContext,
  info: (message, meta) => logWithContext('info', message, meta),
  warn: (message, meta) => logWithContext('warn', message, meta),
  error: (message, meta) => logWithContext('error', message, meta),
  debug: (message, meta) => logWithContext('debug', message, meta),
  audit: (action, meta = {}) => {
    logger.log('info', {
      message: `[AUDIT] ${action}`,
      audit: true,
      action,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }
};
