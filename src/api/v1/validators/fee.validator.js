const { body, query, param } = require('express-validator');

const getFeesValidator = [
  query('page').optional().isInt({ min: 0 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('roll').optional().trim().isLength({ min: 1, max: 25 }),
  query('feeType').optional().isInt({ min: 1, max: 5 }),
  query('classId').optional().isInt({ min: 1 }),
  query('studentId').optional().isInt({ min: 1 })
];

const createFeePaymentValidator = [
  body('roll').trim().notEmpty().isLength({ min: 1, max: 25 }),
  body('feeType').notEmpty().isInt({ min: 1, max: 10 }),
  body('amount').notEmpty().isFloat({ gt: 0, lt: 10000000 })
];

const feePaymentIdValidator = [
  param('paymentId').isInt({ min: 1 }).withMessage('Valid payment id is required')
];

const emailReceiptValidator = [
  ...feePaymentIdValidator,
  body('to')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }

      if (typeof value === 'string') {
        return true;
      }

      if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
        return true;
      }

      throw new Error('to must be a string email or an array of email strings');
    })
];

module.exports = {
  getFeesValidator,
  createFeePaymentValidator,
  feePaymentIdValidator,
  emailReceiptValidator
};
