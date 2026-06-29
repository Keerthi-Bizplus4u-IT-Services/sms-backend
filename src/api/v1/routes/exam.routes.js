const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');
const { listExamsValidator } = require('../validators/exam.validator');

router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('marks:read'),
  listExamsValidator,
  validate,
  examController.getExams
);

module.exports = router;