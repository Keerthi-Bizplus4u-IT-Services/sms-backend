const { body, param, query } = require('express-validator');

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const createTimetableEntryValidator = [
  body('class_id')
    .notEmpty().withMessage('class_id is required')
    .isInt({ min: 1 }).withMessage('class_id must be a positive integer'),
  body('section_id')
    .notEmpty().withMessage('section_id is required')
    .isInt({ min: 1 }).withMessage('section_id must be a positive integer'),
  body('day_of_week')
    .notEmpty().withMessage('day_of_week is required')
    .isIn(VALID_DAYS).withMessage(`day_of_week must be one of: ${VALID_DAYS.join(', ')}`),
  body('period_id')
    .notEmpty().withMessage('period_id is required')
    .isInt({ min: 1 }).withMessage('period_id must be a positive integer'),
  body('subject_id')
    .notEmpty().withMessage('subject_id is required')
    .isInt({ min: 1 }).withMessage('subject_id must be a positive integer'),
  body('teacher_id')
    .notEmpty().withMessage('teacher_id is required')
    .isInt({ min: 1 }).withMessage('teacher_id must be a positive integer'),
  body('room_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('room_number must not exceed 50 characters'),
  body('is_practical')
    .optional()
    .isBoolean().withMessage('is_practical must be a boolean'),
  body('effective_from')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('effective_from must be a valid date (YYYY-MM-DD)'),
  body('effective_to')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('effective_to must be a valid date (YYYY-MM-DD)')
];

const updateTimetableEntryValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid timetable entry ID'),
  body('class_id')
    .optional()
    .isInt({ min: 1 }).withMessage('class_id must be a positive integer'),
  body('section_id')
    .optional()
    .isInt({ min: 1 }).withMessage('section_id must be a positive integer'),
  body('day_of_week')
    .optional()
    .isIn(VALID_DAYS).withMessage(`day_of_week must be one of: ${VALID_DAYS.join(', ')}`),
  body('period_id')
    .optional()
    .isInt({ min: 1 }).withMessage('period_id must be a positive integer'),
  body('subject_id')
    .optional()
    .isInt({ min: 1 }).withMessage('subject_id must be a positive integer'),
  body('teacher_id')
    .optional()
    .isInt({ min: 1 }).withMessage('teacher_id must be a positive integer'),
  body('room_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('room_number must not exceed 50 characters'),
  body('is_practical')
    .optional()
    .isBoolean().withMessage('is_practical must be a boolean'),
  body('effective_from')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('effective_from must be a valid date (YYYY-MM-DD)'),
  body('effective_to')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('effective_to must be a valid date (YYYY-MM-DD)')
];

const changeTeacherValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid timetable entry ID'),
  body('teacher_id')
    .notEmpty().withMessage('teacher_id is required')
    .isInt({ min: 1 }).withMessage('teacher_id must be a positive integer')
];

const timetableEntryIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid timetable entry ID')
];

const listTimetableEntriesValidator = [
  query('class_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid class_id'),
  query('section_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid section_id'),
  query('day_of_week')
    .optional()
    .isIn(VALID_DAYS).withMessage(`day_of_week must be one of: ${VALID_DAYS.join(', ')}`)
];

const listTimetablePeriodsValidator = [
  query('academic_year_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid academic_year_id')
];

module.exports = {
  createTimetableEntryValidator,
  updateTimetableEntryValidator,
  changeTeacherValidator,
  timetableEntryIdValidator,
  listTimetableEntriesValidator,
  listTimetablePeriodsValidator
};
