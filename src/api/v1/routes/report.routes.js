const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { reportQueryValidator } = require('../validators/report.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/data-integrity-preview',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'super_admin']),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getDataIntegrityPreview
);

router.get(
  '/fees',
  authenticate,
  enforceTenant(),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getFeeReport
);

router.get(
  '/expenses',
  authenticate,
  enforceTenant(),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getExpenseReport
);

router.get(
  '/students',
  authenticate,
  enforceTenant(),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getStudentReport
);

router.get(
  '/financial-summary',
  authenticate,
  enforceTenant(),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getFinancialSummary
);

module.exports = router;
