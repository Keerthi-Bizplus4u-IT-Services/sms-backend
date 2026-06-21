const { param, body } = require('express-validator');

const roleIdValidator = [
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer')
];

const assignPermissionsValidator = [
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  body('permissionIds')
    .isArray()
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*')
    .isInt({ min: 1 })
    .withMessage('Each permission ID must be a positive integer')
];

module.exports = {
  roleIdValidator,
  assignPermissionsValidator
};
