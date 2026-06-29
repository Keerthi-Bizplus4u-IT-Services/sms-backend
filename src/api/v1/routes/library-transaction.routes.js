const express = require('express');
const router = express.Router();
const controller = require('../controllers/library-transaction.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const {
  transactionFilterValidator, transactionIdValidator,
  issueBookValidator, returnBookValidator,
  renewBookValidator, payFineValidator, borrowerHistoryValidator
} = require('../validators/library-transaction.validator');
const { validate } = require('../../../middleware/validation.middleware');

// List transactions
router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('library:read'),
  transactionFilterValidator,
  validate,
  controller.getTransactions
);

// Overdue books
router.get(
  '/overdue',
  authenticate,
  enforceTenant(),
  requirePermission('library:read'),
  controller.getOverdueBooks
);

// Borrower history
router.get(
  '/borrower/:type/:id',
  authenticate,
  enforceTenant(),
  requirePermission('library:read'),
  borrowerHistoryValidator,
  validate,
  controller.getBorrowerHistory
);

// Fine preview
router.get(
  '/:id/fine-preview',
  authenticate,
  enforceTenant(),
  requirePermission('library:read'),
  transactionIdValidator,
  validate,
  controller.calculateFinePreview
);

// Get single transaction
router.get(
  '/:id',
  authenticate,
  enforceTenant(),
  requirePermission('library:read'),
  transactionIdValidator,
  validate,
  controller.getTransactionById
);

// Issue book
router.post(
  '/issue',
  authenticate,
  enforceTenant(),
  requirePermission('library:issue'),
  issueBookValidator,
  validate,
  controller.issueBook
);

// Return book
router.post(
  '/:id/return',
  authenticate,
  enforceTenant(),
  requirePermission('library:return'),
  returnBookValidator,
  validate,
  controller.returnBook
);

// Renew book
router.post(
  '/:id/renew',
  authenticate,
  enforceTenant(),
  requirePermission('library:renew'),
  renewBookValidator,
  validate,
  controller.renewBook
);

// Pay fine
router.post(
  '/:id/pay-fine',
  authenticate,
  enforceTenant(),
  requirePermission('library:fine'),
  payFineValidator,
  validate,
  controller.payFine
);

module.exports = router;
