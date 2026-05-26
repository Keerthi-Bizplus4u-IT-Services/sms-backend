const { param, query, body } = require('express-validator');

const transactionFilterValidator = [
  query('page').optional().isInt({ min: 0 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['issued', 'returned', 'overdue', 'lost', 'damaged']),
  query('borrower_type').optional().isIn(['student', 'teacher', 'staff']),
  query('book_id').optional().isInt({ min: 1 })
];

const transactionIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID')
];

const issueBookValidator = [
  body('copy_id').isInt({ min: 1 }).withMessage('Copy ID is required'),
  body('borrower_type').isIn(['student', 'teacher', 'staff']).withMessage('Invalid borrower type'),
  body('borrower_id').isInt({ min: 1 }).withMessage('Borrower ID is required'),
  body('remarks').optional().trim().isLength({ max: 2000 })
];

const returnBookValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID'),
  body('return_date').optional().isISO8601().withMessage('Invalid return date'),
  body('remarks').optional().trim().isLength({ max: 2000 })
];

const renewBookValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID')
];

const payFineValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID')
];

const borrowerHistoryValidator = [
  param('type').isIn(['student', 'teacher', 'staff']).withMessage('Invalid borrower type'),
  param('id').isInt({ min: 1 }).withMessage('Invalid borrower ID')
];

module.exports = {
  transactionFilterValidator,
  transactionIdValidator,
  issueBookValidator,
  returnBookValidator,
  renewBookValidator,
  payFineValidator,
  borrowerHistoryValidator
};
