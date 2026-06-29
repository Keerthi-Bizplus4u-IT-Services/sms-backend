const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const {
  getFeesValidator,
  createFeePaymentValidator,
  feePaymentIdValidator,
  emailReceiptValidator
} = require('../validators/fee.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('fees:read'),
  getFeesValidator,
  validate,
  feeController.getFees
);

router.post(
  '/payments',
  authenticate,
  enforceTenant(),
  requirePermission('fees:write'),
  createFeePaymentValidator,
  validate,
  feeController.recordPayment
);

router.get(
  '/payments/:paymentId/receipt',
  authenticate,
  enforceTenant(),
  requirePermission('fees:read'),
  feePaymentIdValidator,
  validate,
  feeController.downloadReceipt
);

router.post(
  '/payments/:paymentId/email-receipt',
  authenticate,
  enforceTenant(),
  requirePermission('fees:write'),
  emailReceiptValidator,
  validate,
  feeController.emailReceipt
);

module.exports = router;
