const { body, param, query } = require('express-validator');

const listExamSchedulesValidator = [
  query('academicYearId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid academic year ID'),
  query('studentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid student ID')
];

const createLegacyExamScheduleValidator = [
  body('eid')
    .trim()
    .notEmpty()
    .withMessage('Exam name is required')
    .isLength({ max: 100 })
    .withMessage('Exam name is too long'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 255 })
    .withMessage('Subject is too long'),
  body('sclass')
    .notEmpty()
    .withMessage('Class is required')
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('time')
    .trim()
    .notEmpty()
    .withMessage('Time is required')
    .isLength({ max: 100 })
    .withMessage('Time is too long'),
  body('duration')
    .trim()
    .notEmpty()
    .withMessage('Duration is required')
    .isLength({ max: 50 })
    .withMessage('Duration is too long')
];

const deleteLegacyExamScheduleValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid exam schedule ID')
];

module.exports = {
  listExamSchedulesValidator,
  createLegacyExamScheduleValidator,
  deleteLegacyExamScheduleValidator
};