const { validationResult } = require('express-validator');
const { validationError } = require('../utils/response');

/**
 * Validation Middleware
 * Handles validation errors from express-validator
 */

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    return validationError(res, formattedErrors);
  }
  
  next();
};

module.exports = {
  validate
};
