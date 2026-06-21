const express = require('express');
const router = express.Router();
const feeTermController = require('../controllers/fee-term.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');
const {
  listFeeTermsValidator,
  createFeeTermValidator,
  updateFeeTermValidator,
  feeTermIdValidator
} = require('../validators/fee-term.validator');

router.get(
  '/',
  authenticate,
  requirePermission('fee-structures:read'),
  listFeeTermsValidator,
  validate,
  feeTermController.getFeeTerms
);

router.post(
  '/',
  authenticate,
  requirePermission('fee-structures:write'),
  createFeeTermValidator,
  validate,
  feeTermController.createFeeTerm
);

router.put(
  '/:id',
  authenticate,
  requirePermission('fee-structures:write'),
  updateFeeTermValidator,
  validate,
  feeTermController.updateFeeTerm
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('fee-structures:delete'),
  feeTermIdValidator,
  validate,
  feeTermController.deleteFeeTerm
);

module.exports = router;
