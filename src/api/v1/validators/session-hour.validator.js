const { body, param, query } = require('express-validator');

const createSessionHourValidator = [
  body('name').optional().trim().isLength({ max: 50 }),
  body('start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format (HH:MM)'),
  body('end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format (HH:MM)'),
  body('class_id').optional().isInt({ min: 1 }),
  body('section_id').optional().isInt({ min: 1 })
];

const updateSessionHourValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid session hour ID'),
  body('name').optional().trim().isLength({ max: 50 }),
  body('start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format (HH:MM)'),
  body('end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format (HH:MM)')
];

const sessionHourIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid session hour ID')
];

const listSessionHoursValidator = [
  query('class_id').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  query('section_id').optional().isInt({ min: 1 }).withMessage('Invalid section ID')
];

module.exports = {
  createSessionHourValidator,
  updateSessionHourValidator,
  sessionHourIdValidator,
  listSessionHoursValidator
};
