const { body, param, query } = require('express-validator');

const ASSIGNMENT_TYPES = ['homework', 'project', 'practical', 'worksheet', 'online_quiz', 'presentation'];

const listAssignmentsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('class_id must be a positive integer'),
  query('section_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('section_id must be a positive integer')
];

const assignmentIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Assignment ID must be a positive integer')
];

const createAssignmentValidator = [
  body('class_id')
    .isInt({ min: 1 })
    .withMessage('class_id is required and must be a positive integer'),
  body('section_id')
    .isInt({ min: 1 })
    .withMessage('section_id is required and must be a positive integer'),
  body('subject_id')
    .isInt({ min: 1 })
    .withMessage('subject_id is required and must be a positive integer'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 5000 })
    .withMessage('Description must be at most 5000 characters'),
  body('assignment_type')
    .optional()
    .isIn(ASSIGNMENT_TYPES)
    .withMessage(`assignment_type must be one of: ${ASSIGNMENT_TYPES.join(', ')}`),
  body('max_marks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('max_marks must be a non-negative number'),
  body('weightage_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('weightage_percentage must be between 0 and 100'),
  body('assigned_date')
    .optional()
    .isISO8601()
    .withMessage('assigned_date must be a valid ISO 8601 date'),
  body('due_date')
    .isISO8601()
    .withMessage('due_date is required and must be a valid ISO 8601 date'),
  body('allow_late_submission')
    .optional()
    .isBoolean()
    .withMessage('allow_late_submission must be a boolean'),
  body('late_submission_penalty_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('late_submission_penalty_percent must be between 0 and 100'),
  body('attachment_url')
    .optional({ nullable: true })
    .isString()
    .withMessage('attachment_url must be a string')
    .isLength({ max: 500 })
    .withMessage('attachment_url must be at most 500 characters'),
  body('instructions')
    .optional({ nullable: true })
    .isString()
    .withMessage('instructions must be a string')
    .isLength({ max: 5000 })
    .withMessage('instructions must be at most 5000 characters'),
  body().custom((value) => {
    if (value.assigned_date && value.due_date && value.due_date < value.assigned_date) {
      throw new Error('due_date must be on or after assigned_date');
    }
    return true;
  })
];

const updateAssignmentValidator = [
  body('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('class_id must be a positive integer'),
  body('section_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('section_id must be a positive integer'),
  body('subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('subject_id must be a positive integer'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 5000 })
    .withMessage('Description must be at most 5000 characters'),
  body('assignment_type')
    .optional()
    .isIn(ASSIGNMENT_TYPES)
    .withMessage(`assignment_type must be one of: ${ASSIGNMENT_TYPES.join(', ')}`),
  body('max_marks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('max_marks must be a non-negative number'),
  body('weightage_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('weightage_percentage must be between 0 and 100'),
  body('assigned_date')
    .optional()
    .isISO8601()
    .withMessage('assigned_date must be a valid ISO 8601 date'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('due_date must be a valid ISO 8601 date'),
  body('allow_late_submission')
    .optional()
    .isBoolean()
    .withMessage('allow_late_submission must be a boolean'),
  body('late_submission_penalty_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('late_submission_penalty_percent must be between 0 and 100'),
  body('attachment_url')
    .optional({ nullable: true })
    .isString()
    .withMessage('attachment_url must be a string')
    .isLength({ max: 500 })
    .withMessage('attachment_url must be at most 500 characters'),
  body('instructions')
    .optional({ nullable: true })
    .isString()
    .withMessage('instructions must be a string')
    .isLength({ max: 5000 })
    .withMessage('instructions must be at most 5000 characters'),
  body().custom((value) => {
    if (value.assigned_date && value.due_date && value.due_date < value.assigned_date) {
      throw new Error('due_date must be on or after assigned_date');
    }
    return true;
  })
];

module.exports = {
  listAssignmentsValidator,
  assignmentIdValidator,
  createAssignmentValidator,
  updateAssignmentValidator
};