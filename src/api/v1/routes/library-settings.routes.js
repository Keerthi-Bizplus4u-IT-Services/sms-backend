const express = require('express');
const router = express.Router();
const controller = require('../controllers/library-settings.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const {
  upsertSettingsValidator, createFineRuleValidator,
  updateFineRuleValidator, fineRuleIdValidator
} = require('../validators/library-settings.validator');
const { validate } = require('../../../middleware/validation.middleware');

// Lending settings
router.get(
  '/',
  authenticate,
  requirePermission('library:settings'),
  controller.getSettings
);

router.put(
  '/',
  authenticate,
  requirePermission('library:settings'),
  upsertSettingsValidator,
  validate,
  controller.upsertSettings
);

// Fine rules
router.get(
  '/fine-rules',
  authenticate,
  requirePermission('library:settings'),
  controller.getFineRules
);

router.post(
  '/fine-rules',
  authenticate,
  requirePermission('library:settings'),
  createFineRuleValidator,
  validate,
  controller.createFineRule
);

router.put(
  '/fine-rules/:id',
  authenticate,
  requirePermission('library:settings'),
  updateFineRuleValidator,
  validate,
  controller.updateFineRule
);

router.delete(
  '/fine-rules/:id',
  authenticate,
  requirePermission('library:settings'),
  fineRuleIdValidator,
  validate,
  controller.deleteFineRule
);

module.exports = router;
