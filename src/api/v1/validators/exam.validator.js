const { query } = require('express-validator');

const listExamsValidator = [
  query('academicYearId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid academic year ID')
];

module.exports = {
  listExamsValidator
};