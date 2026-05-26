const { body, param } = require('express-validator');

const createHolidayValidator = [
  body('hname')
    .trim()
    .notEmpty()
    .withMessage('Holiday title is required')
    .isLength({ max: 100 })
    .withMessage('Holiday title must be at most 100 characters'),
  body('sdate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('edate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.sdate)) {
        throw new Error('End date cannot be before start date');
      }
      return true;
    })
];

const holidayIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid holiday ID')
];

module.exports = {
  createHolidayValidator,
  holidayIdValidator
};
