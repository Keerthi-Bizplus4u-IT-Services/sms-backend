const express = require('express');
const router = express.Router();
const controller = require('../controllers/library-settings.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const {
  upsertSettingsValidator, createFineRuleValidator,
  updateFineRuleValidator, fineRuleIdValidator
} = require('../validators/library-settings.validator');
const { validate } = require('../../../middleware/validation.middleware');

// Lending settings
router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  controller.getSettings
);

router.put(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  upsertSettingsValidator,
  validate,
  controller.upsertSettings
);

// Fine rules
router.get(
  '/fine-rules',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  controller.getFineRules
);

router.post(
  '/fine-rules',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  createFineRuleValidator,
  validate,
  controller.createFineRule
);

router.put(
  '/fine-rules/:id',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  updateFineRuleValidator,
  validate,
  controller.updateFineRule
);

router.delete(
  '/fine-rules/:id',
  authenticate,
  enforceTenant(),
  requirePermission('library:settings'),
  fineRuleIdValidator,
  validate,
  controller.deleteFineRule
);

module.exports = router;
