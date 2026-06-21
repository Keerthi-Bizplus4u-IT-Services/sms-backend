const { body, param, query } = require('express-validator');

const listFeeTermsValidator = [
  query('academicYearId').optional().isInt({ gt: 0 }).withMessage('academicYearId must be a positive integer'),
  query('includeInactive').optional().isBoolean().withMessage('includeInactive must be true or false').toBoolean()
];

const createFeeTermValidator = [
  body('academicYearId').isInt({ gt: 0 }).withMessage('academicYearId is required'),
  body('name').trim().notEmpty().isLength({ max: 80 }).withMessage('name is required and must be at most 80 characters'),
  body('startDate').isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
  body('dueDate').isISO8601().withMessage('dueDate must be a valid date (YYYY-MM-DD)'),
  body('lateFeePerDay').optional().isFloat({ min: 0 }).withMessage('lateFeePerDay must be zero or positive'),
  body('lateFeeMax').optional().isFloat({ min: 0 }).withMessage('lateFeeMax must be zero or positive'),
  body('sortOrder').optional().isInt({ gt: 0 }).withMessage('sortOrder must be greater than zero'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean()
];

const updateFeeTermValidator = [
  param('id').isInt({ gt: 0 }).withMessage('id must be a positive integer'),
  body('academicYearId').optional().isInt({ gt: 0 }).withMessage('academicYearId must be a positive integer'),
  body('name').optional().trim().notEmpty().isLength({ max: 80 }).withMessage('name must be at most 80 characters'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date (YYYY-MM-DD)'),
  body('lateFeePerDay').optional().isFloat({ min: 0 }).withMessage('lateFeePerDay must be zero or positive'),
  body('lateFeeMax').optional().isFloat({ min: 0 }).withMessage('lateFeeMax must be zero or positive'),
  body('sortOrder').optional().isInt({ gt: 0 }).withMessage('sortOrder must be greater than zero'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean()
];

const feeTermIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('id must be a positive integer')
];

module.exports = {
  listFeeTermsValidator,
  createFeeTermValidator,
  updateFeeTermValidator,
  feeTermIdValidator
};
