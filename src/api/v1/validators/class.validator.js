const { body, param, query } = require('express-validator');

const createClassValidator = [
  body('name').trim().notEmpty().withMessage('Class name is required').isLength({ max: 50 }),
  body('academic_year_id').notEmpty().withMessage('Academic year ID is required').isInt({ min: 1 }),
  body('branch_id').optional().isInt({ min: 1 })
];

const updateClassValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid class ID'),
  body('name').optional().trim().isLength({ max: 50 }),
  body('academic_year_id').optional().isInt({ min: 1 }),
  body('branch_id').optional().isInt({ min: 1 })
];

const classIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid class ID')
];

const academicYearIdValidator = [
  param('academicYearId').isInt({ min: 1 }).withMessage('Invalid academic year ID')
];

const listClassesValidator = [
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('Invalid academic year ID'),
  query('branch_id').optional().isInt({ min: 1 }).withMessage('Invalid branch ID')
];

module.exports = {
  createClassValidator,
  updateClassValidator,
  classIdValidator,
  academicYearIdValidator,
  listClassesValidator
};
