const { body } = require('express-validator');

const searchScheduleValidator = [
  body('allclass-id')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Teacher ID must not exceed 50 characters'),
  body('allclass-name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Teacher name must not exceed 100 characters'),
  body('allclass-class')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Class name must not exceed 50 characters')
];

module.exports = {
  searchScheduleValidator
};
