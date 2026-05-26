const { param, query, body } = require('express-validator');

const getExpensesValidator = [
  query('page').optional().isInt({ min: 0 }).withMessage('Page must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100')
];

const expenseIdValidator = [
  param('eid').isInt({ min: 1 }).withMessage('Invalid expense ID')
];

const createExpenseValidator = [
  body('ename').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('idno').optional().trim().isLength({ max: 100 }),
  body('exptype').trim().notEmpty().withMessage('Expense type is required').isLength({ max: 50 }),
  body('invoiceno').optional().trim().isLength({ max: 100 }),
  body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().withMessage('Email must be valid'),
  body('status').trim().notEmpty().withMessage('Status is required').isLength({ max: 50 }),
  body('edate').optional().isISO8601().withMessage('Date must be a valid date'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date'),
  body('purpose').optional().trim().isLength({ max: 255 }),
  body('item').optional().trim().isLength({ max: 255 })
];

module.exports = {
  getExpensesValidator,
  expenseIdValidator,
  createExpenseValidator
};
