const { body, param, query } = require('express-validator');

const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const applyLeaveValidator = [
  body('startDate')
    .exists()
    .withMessage('Start date is required')
    .bail()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  body('endDate')
    .exists()
    .withMessage('End date is required')
    .bail()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)'),
  body('reason')
    .isString()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Reason must be at least 3 characters long'),
  body('leaveType')
    .optional()
    .isIn(['casual', 'sick', 'special'])
    .withMessage('Leave type must be casual, sick, or special'),
  body('year')
    .optional()
    .isInt({ min: 2000, max: 9999 })
    .withMessage('Year must be between 2000 and 9999'),
  body('leaveDurationType')
    .optional()
    .isIn(['full_day', 'half_day_first', 'half_day_second', 'custom_periods'])
    .withMessage('leaveDurationType must be full_day, half_day_first, half_day_second, or custom_periods'),
  body('periodIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('periodIds must be a non-empty array when provided'),
  body('periodIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each period id must be a positive integer'),
  body('periodMappings')
    .optional()
    .isArray({ min: 1 })
    .withMessage('periodMappings must be a non-empty array when provided'),
  body('periodMappings.*.date')
    .optional()
    .isISO8601()
    .withMessage('Each period mapping date must be a valid date (YYYY-MM-DD)'),
  body('periodMappings.*.timetableId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each period mapping timetableId must be a positive integer'),
  body('periodMappings.*.substituteTeacherId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each substituteTeacherId must be a positive integer'),
  body('periodMappings.*.substituteSubjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each substituteSubjectId must be a positive integer'),
  body('periodMappings')
    .optional()
    .custom((mappings = []) => {
      if (!Array.isArray(mappings)) {
        return true;
      }

      for (const mapping of mappings) {
        if (!mapping || (!mapping.substituteTeacherId && !mapping.substituteSubjectId)) {
          throw new Error('Each period mapping must include substituteTeacherId or substituteSubjectId');
        }
      }

      return true;
    }),
];

const coveragePreviewValidator = [
  body('startDate')
    .exists()
    .withMessage('Start date is required')
    .bail()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  body('endDate')
    .exists()
    .withMessage('End date is required')
    .bail()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)'),
  body('leaveDurationType')
    .optional()
    .isIn(['full_day', 'half_day_first', 'half_day_second', 'custom_periods'])
    .withMessage('leaveDurationType must be full_day, half_day_first, half_day_second, or custom_periods'),
  body('periodIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('periodIds must be a non-empty array when provided'),
  body('periodIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each period id must be a positive integer'),
];

const createPolicyValidator = [
  body('year')
    .exists()
    .withMessage('Year is required')
    .bail()
    .isInt({ min: 2000, max: 9999 })
    .withMessage('Year must be between 2000 and 9999'),
  body('casualLeaves')
    .exists()
    .withMessage('Casual leaves are required')
    .bail()
    .isInt({ min: 0 })
    .withMessage('Casual leaves must be zero or more'),
  body('sickLeaves')
    .exists()
    .withMessage('Sick leaves are required')
    .bail()
    .isInt({ min: 0 })
    .withMessage('Sick leaves must be zero or more'),
  body('specialLeaves')
    .exists()
    .withMessage('Special leaves are required')
    .bail()
    .isInt({ min: 0 })
    .withMessage('Special leaves must be zero or more'),
];

const updatePolicyValidator = [
  body('year')
    .optional()
    .isInt({ min: 2000, max: 9999 })
    .withMessage('Year must be between 2000 and 9999'),
  body('casualLeaves')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Casual leaves must be zero or more'),
  body('sickLeaves')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sick leaves must be zero or more'),
  body('specialLeaves')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Special leaves must be zero or more'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
];

const policyIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Policy id must be a positive integer'),
];

const policyQueryValidator = [
  query('year')
    .optional()
    .isInt({ min: 2000, max: 9999 })
    .withMessage('Year must be between 2000 and 9999'),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be true or false')
    .toBoolean(),
];

const balanceQueryValidator = [
  query('year')
    .optional()
    .isInt({ min: 2000, max: 9999 })
    .withMessage('Year must be between 2000 and 9999'),
];

const leaveRequestIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Leave request id must be a positive integer'),
];

const approvalQueryValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled'])
    .withMessage('status must be pending, approved, rejected, or cancelled'),
  ...paginationValidator,
];

const updateAssignmentsValidator = [
  body('assignments').isArray({ min: 1 }).withMessage('assignments must be a non-empty array'),
  body('assignments.*.assignmentDate')
    .optional()
    .isISO8601()
    .withMessage('assignmentDate must be a valid date (YYYY-MM-DD)'),
  body('assignments.*.timetableId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('timetableId must be a positive integer'),
  body('assignments.*.periodId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('periodId must be a positive integer'),
  body('assignments.*.classId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('classId must be a positive integer'),
  body('assignments.*.sectionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('sectionId must be a positive integer'),
  body('assignments.*.originalTeacherId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('originalTeacherId must be a positive integer'),
  body('assignments.*.substituteTeacherId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('substituteTeacherId must be a positive integer'),
  body('assignments.*.substituteSubjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('substituteSubjectId must be a positive integer'),
  body('assignments')
    .custom((assignments = []) => {
      if (!Array.isArray(assignments)) {
        return true;
      }

      assignments.forEach((item, index) => {
        if (!item || (!item.substituteTeacherId && !item.substituteSubjectId)) {
          throw new Error(`assignments[${index}] must include substituteTeacherId or substituteSubjectId`);
        }
      });

      return true;
    }),
];

const leaveDecisionValidator = [
  body('status')
    .exists()
    .withMessage('status is required')
    .bail()
    .isIn(['approved', 'rejected', 'cancelled'])
    .withMessage('status must be approved, rejected, or cancelled'),
  body('comments')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('comments must be a string up to 255 characters'),
];

module.exports = {
  paginationValidator,
  applyLeaveValidator,
  coveragePreviewValidator,
  createPolicyValidator,
  updatePolicyValidator,
  policyIdValidator,
  policyQueryValidator,
  balanceQueryValidator,
  leaveRequestIdValidator,
  approvalQueryValidator,
  updateAssignmentsValidator,
  leaveDecisionValidator,
};
