const { body, param } = require('express-validator');

const addRoomValidator = [
  body('room_number').optional().trim().notEmpty().withMessage('Room number is required'),
  body('building_id').optional().isInt({ min: 1 }).withMessage('Invalid building ID'),
  body('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20')
];

const roomIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid room ID')
];

module.exports = {
  addRoomValidator,
  roomIdValidator
};
