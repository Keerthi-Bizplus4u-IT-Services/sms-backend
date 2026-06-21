const { body, param } = require('express-validator');

const roleIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer')
];

const createRoleValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Role name must contain only lowercase letters and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters')
];

const updateRoleValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Role name must contain only lowercase letters and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters')
];

module.exports = {
  roleIdValidator,
  createRoleValidator,
  updateRoleValidator
};
