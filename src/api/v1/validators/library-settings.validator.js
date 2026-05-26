const { param, body } = require('express-validator');

const upsertSettingsValidator = [
  body('borrower_type').isIn(['student', 'teacher', 'staff']).withMessage('Invalid borrower type'),
  body('max_books_allowed').optional().isInt({ min: 1, max: 50 }).withMessage('Max books must be 1-50'),
  body('default_issue_days').optional().isInt({ min: 1, max: 365 }).withMessage('Issue days must be 1-365'),
  body('max_renewals').optional().isInt({ min: 0, max: 10 }).withMessage('Max renewals must be 0-10')
];

const createFineRuleValidator = [
  body('borrower_type').isIn(['student', 'teacher', 'staff']).withMessage('Invalid borrower type'),
  body('tier_start_day').isInt({ min: 1 }).withMessage('Tier start day must be at least 1'),
  body('tier_end_day').optional({ nullable: true }).isInt({ min: 1 }),
  body('fine_per_day').isFloat({ min: 0.01 }).withMessage('Fine per day is required'),
  body('grace_period_days').optional().isInt({ min: 0, max: 30 }),
  body('max_fine_amount').optional({ nullable: true }).isFloat({ min: 0 })
];

const updateFineRuleValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid rule ID'),
  body('borrower_type').optional().isIn(['student', 'teacher', 'staff']),
  body('tier_start_day').optional().isInt({ min: 1 }),
  body('tier_end_day').optional({ nullable: true }).isInt({ min: 1 }),
  body('fine_per_day').optional().isFloat({ min: 0.01 }),
  body('grace_period_days').optional().isInt({ min: 0, max: 30 }),
  body('max_fine_amount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('is_active').optional().isBoolean()
];

const fineRuleIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid rule ID')
];

module.exports = {
  upsertSettingsValidator,
  createFineRuleValidator,
  updateFineRuleValidator,
  fineRuleIdValidator
};
