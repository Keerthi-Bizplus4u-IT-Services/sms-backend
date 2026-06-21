const { body, param, query } = require('express-validator');

const createAcademicYearValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Academic year name is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('Academic year name must be between 4 and 20 characters'),
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date'),
  body('is_current')
    .optional()
    .isBoolean()
    .withMessage('is_current must be a boolean')
];

const updateAcademicYearValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid academic year ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage('Academic year name must be between 4 and 20 characters'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date'),
  body('is_current')
    .optional()
    .isBoolean()
    .withMessage('is_current must be a boolean')
];

const academicYearIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid academic year ID')
];

const listAcademicYearValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('isCurrent')
    .optional()
    .isBoolean()
    .withMessage('isCurrent must be a boolean')
];

const migrationDraftValidator = [
  body('fromAcademicYearId')
    .isInt({ min: 1 })
    .withMessage('fromAcademicYearId must be a positive integer'),
  body('toAcademicYearId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('toAcademicYearId must be a positive integer'),
  body('targetYear.name')
    .if(body('toAcademicYearId').not().exists())
    .trim()
    .notEmpty()
    .withMessage('targetYear.name is required when toAcademicYearId is not provided'),
  body('targetYear.start_date')
    .if(body('toAcademicYearId').not().exists())
    .isISO8601()
    .withMessage('targetYear.start_date must be a valid ISO date'),
  body('targetYear.end_date')
    .if(body('toAcademicYearId').not().exists())
    .isISO8601()
    .withMessage('targetYear.end_date must be a valid ISO date'),
  body('newClasses')
    .optional()
    .isArray()
    .withMessage('newClasses must be an array')
];

const migrationFinalizeValidator = [
  body('fromAcademicYearId')
    .isInt({ min: 1 })
    .withMessage('fromAcademicYearId must be a positive integer'),
  body('toAcademicYearId')
    .isInt({ min: 1 })
    .withMessage('toAcademicYearId must be a positive integer'),
  body('overrides')
    .optional()
    .isArray()
    .withMessage('overrides must be an array'),
  body('overrides.*.studentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('override.studentId must be a positive integer'),
  body('overrides.*.decision')
    .optional()
    .isIn(['promote', 'detain', 'review'])
    .withMessage('override.decision must be one of promote, detain, review'),
  body('overrides.*.targetClassId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('override.targetClassId must be a positive integer')
];

module.exports = {
  createAcademicYearValidator,
  updateAcademicYearValidator,
  academicYearIdParamValidator,
  listAcademicYearValidator,
  migrationDraftValidator,
  migrationFinalizeValidator
};
