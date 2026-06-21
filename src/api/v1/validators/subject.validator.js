const { body, param, query } = require('express-validator');

const createSubjectValidator = [
  body('name').trim().notEmpty().withMessage('Subject name is required').isLength({ max: 100 }),
  body('code').optional().trim().isLength({ max: 20 })
];

const updateSubjectValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('code').optional().trim().isLength({ max: 20 })
];

const subjectIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid subject ID')
];

const listSubjectsValidator = [
  query('class_id').optional().isInt({ min: 1 }).withMessage('Invalid class ID')
];

module.exports = {
  createSubjectValidator,
  updateSubjectValidator,
  subjectIdValidator,
  listSubjectsValidator
};
