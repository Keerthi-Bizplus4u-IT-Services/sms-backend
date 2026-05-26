const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, requirePermission } = require('../../../middleware/rbac.middleware');
const { reportQueryValidator } = require('../validators/report.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/data-integrity-preview',
  authenticate,
  authorize(['admin', 'super_admin']),
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getDataIntegrityPreview
);

router.get(
  '/fees',
  authenticate,
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getFeeReport
);

router.get(
  '/expenses',
  authenticate,
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getExpenseReport
);

router.get(
  '/students',
  authenticate,
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getStudentReport
);

router.get(
  '/financial-summary',
  authenticate,
  requirePermission('reports:read'),
  reportQueryValidator,
  validate,
  reportController.getFinancialSummary
);

module.exports = router;
