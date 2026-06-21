const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const {
  getBooksValidator, bookIdValidator, legacyBookIdValidator,
  createBookValidator, updateBookValidator,
  createBookCopyValidator, updateBookCopyValidator,
  copyIdValidator, barcodeValidator
} = require('../validators/book.validator');
const { validate } = require('../../../middleware/validation.middleware');

// Book CRUD
router.get(
  '/',
  authenticate,
  requirePermission('books:read'),
  getBooksValidator,
  validate,
  bookController.getBooks
);

router.get(
  '/barcode/:barcode',
  authenticate,
  requirePermission('books:read'),
  barcodeValidator,
  validate,
  bookController.findByBarcode
);

router.get(
  '/:id',
  authenticate,
  requirePermission('books:read'),
  bookIdValidator,
  validate,
  bookController.getBookById
);

router.post(
  '/',
  authenticate,
  requirePermission('books:create'),
  createBookValidator,
  validate,
  bookController.createBook
);

router.put(
  '/:id',
  authenticate,
  requirePermission('books:update'),
  updateBookValidator,
  validate,
  bookController.updateBook
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('books:delete'),
  bookIdValidator,
  validate,
  bookController.deleteBook
);

// Legacy route support
router.delete(
  '/legacy/:bid',
  authenticate,
  requirePermission('books:delete'),
  legacyBookIdValidator,
  validate,
  bookController.deleteBook
);

// Book copy management
router.get(
  '/:id/copies',
  authenticate,
  requirePermission('books:read'),
  bookIdValidator,
  validate,
  bookController.getBookCopies
);

router.post(
  '/:id/copies',
  authenticate,
  requirePermission('books:create'),
  createBookCopyValidator,
  validate,
  bookController.addBookCopy
);

router.put(
  '/copies/:copyId',
  authenticate,
  requirePermission('books:update'),
  updateBookCopyValidator,
  validate,
  bookController.updateBookCopy
);

router.delete(
  '/copies/:copyId',
  authenticate,
  requirePermission('books:delete'),
  copyIdValidator,
  validate,
  bookController.deleteBookCopy
);

module.exports = router;
