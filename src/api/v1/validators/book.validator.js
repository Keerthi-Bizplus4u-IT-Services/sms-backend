const { param, query, body } = require('express-validator');

const getBooksValidator = [
  query('page').optional().isInt({ min: 0 }).withMessage('Page must be a non-negative integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }),
  query('category').optional().trim().isLength({ max: 100 }),
  query('book_type').optional().trim().isIn(['physical', 'digital', 'both']).withMessage('Invalid book type'),
  query('language').optional().trim().isLength({ max: 50 })
];

const bookIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid book ID')
];

const legacyBookIdValidator = [
  param('bid').isInt({ min: 1 }).withMessage('Invalid book ID')
];

const createBookValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('isbn').optional().trim().isLength({ max: 20 }).withMessage('ISBN must be at most 20 characters'),
  body('authors').optional().trim().isLength({ max: 500 }),
  body('publisher').optional().trim().isLength({ max: 255 }),
  body('edition').optional().trim().isLength({ max: 50 }),
  body('publication_year').optional().isInt({ min: 1900, max: 2100 }).withMessage('Invalid publication year'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('language').optional().trim().isLength({ max: 50 }),
  body('book_type').optional().isIn(['physical', 'digital', 'both']).withMessage('Invalid book type'),
  body('total_copies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('shelf_location').optional().trim().isLength({ max: 50 }),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('acquired_date').optional().isISO8601().withMessage('Invalid date format'),
  body('condition_status').optional().isIn(['new', 'good', 'fair', 'damaged', 'lost']).withMessage('Invalid condition status'),
  body('is_reference_only').optional().isBoolean(),
  body('digital_url').optional().trim().isLength({ max: 500 }),
  body('description').optional().trim().isLength({ max: 5000 })
];

const updateBookValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid book ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 255 }),
  body('isbn').optional().trim().isLength({ max: 20 }),
  body('authors').optional().trim().isLength({ max: 500 }),
  body('publisher').optional().trim().isLength({ max: 255 }),
  body('edition').optional().trim().isLength({ max: 50 }),
  body('publication_year').optional().isInt({ min: 1900, max: 2100 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('language').optional().trim().isLength({ max: 50 }),
  body('book_type').optional().isIn(['physical', 'digital', 'both']),
  body('total_copies').optional().isInt({ min: 0 }),
  body('shelf_location').optional().trim().isLength({ max: 50 }),
  body('price').optional().isFloat({ min: 0 }),
  body('acquired_date').optional().isISO8601(),
  body('condition_status').optional().isIn(['new', 'good', 'fair', 'damaged', 'lost']),
  body('is_reference_only').optional().isBoolean(),
  body('digital_url').optional().trim().isLength({ max: 500 }),
  body('description').optional().trim().isLength({ max: 5000 })
];

const copyIdValidator = [
  param('copyId').isInt({ min: 1 }).withMessage('Invalid copy ID')
];

const createBookCopyValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid book ID'),
  body('purchase_date').optional().isISO8601().withMessage('Invalid date'),
  body('purchase_price').optional().isFloat({ min: 0 }),
  body('vendor').optional().trim().isLength({ max: 255 }),
  body('condition_status').optional().isIn(['new', 'good', 'fair', 'damaged', 'lost']),
  body('shelf_location').optional().trim().isLength({ max: 50 }),
  body('remarks').optional().trim().isLength({ max: 2000 })
];

const updateBookCopyValidator = [
  param('copyId').isInt({ min: 1 }).withMessage('Invalid copy ID'),
  body('condition_status').optional().isIn(['new', 'good', 'fair', 'damaged', 'lost']),
  body('shelf_location').optional().trim().isLength({ max: 50 }),
  body('remarks').optional().trim().isLength({ max: 2000 }),
  body('purchase_date').optional().isISO8601(),
  body('purchase_price').optional().isFloat({ min: 0 }),
  body('vendor').optional().trim().isLength({ max: 255 })
];

const barcodeValidator = [
  param('barcode').trim().notEmpty().withMessage('Barcode is required').isLength({ max: 100 })
];

module.exports = {
  getBooksValidator,
  bookIdValidator,
  legacyBookIdValidator,
  createBookValidator,
  updateBookValidator,
  copyIdValidator,
  createBookCopyValidator,
  updateBookCopyValidator,
  barcodeValidator
};
