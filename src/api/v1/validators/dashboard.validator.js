const { query } = require('express-validator');

const getSummaryValidator = [
  query('academicYearId').optional().isInt({ min: 1 }).withMessage('Invalid academic year ID')
];

const setupStatusValidator = [
  query('schoolId').optional().isInt({ min: 1 }).withMessage('Invalid school ID'),
  query('school_id').optional().isInt({ min: 1 }).withMessage('Invalid school ID')
];

module.exports = {
  getSummaryValidator,
  dashboardQueryValidator: getSummaryValidator,
  setupStatusValidator
};
