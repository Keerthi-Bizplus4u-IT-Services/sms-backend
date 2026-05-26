const { body, param, query } = require('express-validator');

const classIdParamValidator = [
  param('classId').isInt({ min: 1 }).withMessage('Invalid class ID')
];

const getSectionsQueryValidator = [
  query('classId').optional().isInt({ min: 1 }).withMessage('Invalid class ID')
];

const createSectionValidator = [
  body('class_id').isInt({ min: 1 }).withMessage('class_id must be a positive integer'),
  body('name').trim().notEmpty().withMessage('Section name is required').isLength({ max: 50 }),
  body('class_teacher_id').isInt({ min: 1 }).withMessage('class_teacher_id must be a positive integer'),
  body('max_students').optional().isInt({ min: 1, max: 500 }).withMessage('max_students must be between 1 and 500'),
  body('room_number').optional().trim().isLength({ max: 20 }).withMessage('room_number must not exceed 20 characters')
];

const updateSectionValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid section ID'),
  body('name').optional().trim().notEmpty().withMessage('Section name cannot be empty').isLength({ max: 50 }),
  body('class_teacher_id').optional().isInt({ min: 1 }).withMessage('class_teacher_id must be a positive integer'),
  body('max_students').optional().isInt({ min: 1, max: 500 }).withMessage('max_students must be between 1 and 500'),
  body('room_number').optional().trim().isLength({ max: 20 }).withMessage('room_number must not exceed 20 characters')
];

const sectionIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid section ID')
];

module.exports = {
  classIdParamValidator,
  getSectionsQueryValidator,
  createSectionValidator,
  updateSectionValidator,
  sectionIdValidator,
  sectionsByClassValidator: classIdParamValidator
};
