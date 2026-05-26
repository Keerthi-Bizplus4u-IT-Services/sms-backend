const { body, param, query } = require('express-validator');

const updateFeeStructureValidator = [
  body('sclass').trim().notEmpty().withMessage('Class identifier is required'),
  body('tfee').optional().isFloat({ min: 0 }).withMessage('Total fee must be zero or positive'),
  body('fterm').optional().isFloat({ min: 0 }).withMessage('First term fee must be zero or positive'),
  body('sterm').optional().isFloat({ min: 0 }).withMessage('Second term fee must be zero or positive'),
  body('thterm').optional().isFloat({ min: 0 }).withMessage('Third term fee must be zero or positive'),
  body('trans').optional().isFloat({ min: 0 }).withMessage('Transport fee must be zero or positive'),
  body('spofee').optional().isFloat({ min: 0 }).withMessage('Sports fee must be zero or positive')
];

const deleteFeeStructureIdValidator = [
  param('cn').trim().notEmpty().withMessage('Class name parameter is required')
];

const getFeeStructureValidator = [
  query('classId').optional().isInt({ gt: 0 }).withMessage('classId must be a positive integer')
];

module.exports = {
  updateFeeStructureValidator,
  deleteFeeStructureIdValidator,
  feeStructureIdValidator: deleteFeeStructureIdValidator,
  getFeeStructureValidator
};
