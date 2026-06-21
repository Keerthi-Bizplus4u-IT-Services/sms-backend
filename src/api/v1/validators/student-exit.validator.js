const { body, param, query } = require('express-validator');

/**
 * Student Exit Validators
 */

const initiateExitValidator = [
  body('student_id')
    .notEmpty()
    .withMessage('Student ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid student ID'),

  body('exit_date')
    .notEmpty()
    .withMessage('Exit date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('exit_type')
    .notEmpty()
    .withMessage('Exit type is required')
    .isIn(['transferred', 'graduated', 'withdrawn'])
    .withMessage('Exit type must be one of: transferred, graduated, withdrawn'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),

  body('qualified_for_promotion')
    .optional()
    .isBoolean()
    .withMessage('Qualified for promotion must be a boolean'),

  body('fees_paid')
    .optional()
    .isBoolean()
    .withMessage('Fees paid must be a boolean'),

  body('conduct')
    .optional()
    .isIn(['excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'])
    .withMessage('Invalid conduct value'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must not exceed 1000 characters')
];

const generateCertificateValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid exit ID'),

  body('certificate_type')
    .notEmpty()
    .withMessage('Certificate type is required')
    .isIn(['transfer_certificate', 'study_conduct_certificate'])
    .withMessage('Certificate type must be: transfer_certificate or study_conduct_certificate')
];

const exitIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid exit ID')
];

const studentExitByStudentValidator = [
  param('studentId')
    .isInt({ min: 1 })
    .withMessage('Invalid student ID')
];

const certificateDownloadValidator = [
  param('certificateId')
    .isInt({ min: 1 })
    .withMessage('Invalid certificate ID')
];

const listExitsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('exit_type')
    .optional()
    .isIn(['transferred', 'graduated', 'withdrawn'])
    .withMessage('Invalid exit type'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
];

module.exports = {
  initiateExitValidator,
  generateCertificateValidator,
  exitIdValidator,
  studentExitByStudentValidator,
  certificateDownloadValidator,
  listExitsValidator
};
