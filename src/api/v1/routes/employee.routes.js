const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const {
  getEmployeesValidator,
  employeeIdValidator,
  createEmployeeValidator,
  updateEmployeeValidator
} = require('../validators/employee.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { uploadEmployeeFiles } = require('../../../middleware/photo-upload.middleware');
const { normalizePayload } = require('../../../middleware/payload-normalizer.middleware');

router.get(
  '/',
  authenticate,
  requirePermission('employees:read'),
  getEmployeesValidator,
  validate,
  employeeController.getEmployees
);

router.get(
  '/:eid',
  authenticate,
  requirePermission('employees:read'),
  employeeIdValidator,
  validate,
  employeeController.getEmployeeById
);

router.post(
  '/',
  authenticate,
  requirePermission('employees:write'),
  uploadEmployeeFiles,
  normalizePayload,
  createEmployeeValidator,
  validate,
  employeeController.createEmployee
);

router.put(
  '/:eid',
  authenticate,
  requirePermission('employees:write'),
  uploadEmployeeFiles,
  normalizePayload,
  updateEmployeeValidator,
  validate,
  employeeController.updateEmployee
);

router.delete(
  '/:eid',
  authenticate,
  requirePermission('employees:delete'),
  employeeIdValidator,
  validate,
  employeeController.deleteEmployee
);

module.exports = router;
