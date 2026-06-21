const { param, query, body } = require('express-validator');

const getInventoryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim().isLength({ max: 100 }),
  query('status').optional().trim().isIn(['available', 'low_stock', 'out_of_stock', 'damaged', 'disposed']).withMessage('Invalid status value'),
  query('search').optional().trim().isLength({ max: 100 })
];

const inventoryIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid inventory ID')
];

const createInventoryValidator = [
  body('item_name').trim().notEmpty().withMessage('Item name is required').isLength({ max: 255 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('supplier').optional().trim().isLength({ max: 255 }),
  body('location').optional().trim().isLength({ max: 255 }),
  body('status').optional().trim().isIn(['available', 'low_stock', 'out_of_stock', 'damaged', 'disposed']).withMessage('Invalid status value'),
  body('purchase_date').optional().isISO8601().withMessage('Purchase date must be a valid date'),
  body('notes').optional().trim().isLength({ max: 2000 })
];

const updateInventoryValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid inventory ID'),
  body('item_name').optional().trim().notEmpty().withMessage('Item name cannot be empty').isLength({ max: 255 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('supplier').optional().trim().isLength({ max: 255 }),
  body('location').optional().trim().isLength({ max: 255 }),
  body('status').optional().trim().isIn(['available', 'low_stock', 'out_of_stock', 'damaged', 'disposed']).withMessage('Invalid status value'),
  body('purchase_date').optional().isISO8601().withMessage('Purchase date must be a valid date'),
  body('notes').optional().trim().isLength({ max: 2000 })
];

module.exports = {
  getInventoryValidator,
  inventoryIdValidator,
  createInventoryValidator,
  updateInventoryValidator
};
