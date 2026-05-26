const { body, param, query } = require('express-validator');

const listCommunicationsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const createNoticeValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('details')
    .trim()
    .notEmpty()
    .withMessage('Details are required')
    .isLength({ max: 5000 })
    .withMessage('Details must be at most 5000 characters'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('target_audience')
    .optional()
    .custom((value) => {
      const validValues = ['all', 'teachers', 'parents', 'students', 'staff', 'transport', 'librarian', 'drivers', 'non_teaching_staff'];
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        const trimmed = String(v).trim().toLowerCase();
        if (!validValues.includes(trimmed)) {
          throw new Error(`Invalid audience value: ${v}. Must be one of: ${validValues.join(', ')}`);
        }
      }
      return true;
    }),
  body('posted')
    .not()
    .exists()
    .withMessage('posted is managed by the server and must not be provided')
];

const updateNoticeValidator = [
  ...createNoticeValidator
];

const attendEventValidator = [
  body('event')
    .isInt({ min: 1 })
    .withMessage('Event ID must be a positive integer')
];

const noticeIdValidator = [
  param('nid')
    .isInt({ min: 1 })
    .withMessage('Notice ID must be a positive integer')
];

module.exports = {
  listCommunicationsValidator,
  createNoticeValidator,
  updateNoticeValidator,
  noticeIdValidator,
  attendEventValidator
};
