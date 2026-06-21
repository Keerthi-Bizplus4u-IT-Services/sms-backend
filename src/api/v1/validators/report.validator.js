const { query } = require('express-validator');

const reportQueryValidator = [
  query('schoolId').optional().isInt({ min: 1 }).withMessage('Invalid school ID'),
  query('school_id').optional().isInt({ min: 1 }).withMessage('Invalid school ID'),
  query('branchId').optional().isInt({ min: 1 }).withMessage('Invalid branch ID'),
  query('branch_id').optional().isInt({ min: 1 }).withMessage('Invalid branch ID')
];

module.exports = { reportQueryValidator };
