const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { dashboardQueryValidator, setupStatusValidator } = require('../validators/dashboard.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/summary',
  authenticate,
  enforceTenant(),
  requirePermission('dashboard:read'),
  dashboardQueryValidator,
  validate,
  dashboardController.getSummary
);

router.get(
  '/gender-counts',
  authenticate,
  enforceTenant(),
  requirePermission('dashboard:read'),
  dashboardQueryValidator,
  validate,
  dashboardController.getGenderCounts
);

router.get(
  '/library-summary',
  authenticate,
  enforceTenant(),
  requirePermission('dashboard:read'),
  dashboardQueryValidator,
  validate,
  dashboardController.getLibrarySummary
);

router.get(
  '/setup-status',
  authenticate,
  enforceTenant(),
  requirePermission('dashboard:read'),
  setupStatusValidator,
  validate,
  dashboardController.getSetupStatus
);

module.exports = router;
