const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { getFeeStructureValidator, updateFeeStructureValidator, feeStructureIdValidator } = require('../validators/fee-structure.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * Fee Structure Routes
 * Parent path: /api/v1
 */

router.get(
  '/fee-structures',
  authenticate,
  requirePermission('fee-structures:read'),
  getFeeStructureValidator,
  validate,
  feeController.getFeeStructure
);

router.put(
  '/fee-structures/:cn',
  authenticate,
  requirePermission('fee-structures:write'),
  (req, res, next) => {
    req.body = {
      ...req.body,
      sclass: req.params.cn
    };
    next();
  },
  updateFeeStructureValidator,
  validate,
  feeController.updateFeeStructure
);

router.delete(
  '/fee-structures/:cn',
  authenticate,
  requirePermission('fee-structures:delete'),
  feeStructureIdValidator,
  validate,
  feeController.deleteFeeStructure
);

module.exports = router;
