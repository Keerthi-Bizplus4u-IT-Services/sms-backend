const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const employeeRoleController = require('../controllers/employee-role.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
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
  enforceTenant(),
  requirePermission('employees:read'),
  getEmployeesValidator,
  validate,
  employeeController.getEmployees
);

router.get(
  '/:eid',
  authenticate,
  enforceTenant(),
  requirePermission('employees:read'),
  employeeIdValidator,
  validate,
  employeeController.getEmployeeById
);

router.post(
  '/',
  authenticate,
  enforceTenant(),
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
  enforceTenant(),
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
  enforceTenant(),
  requirePermission('employees:delete'),
  employeeIdValidator,
  validate,
  employeeController.deleteEmployee
);

// ── Employee Role Assignment Routes ────────────────────────────────────────────

// List all allowed functional role names
router.get(
  '/roles/allowed',
  authenticate,
  enforceTenant(),
  requirePermission('employees:read'),
  employeeRoleController.getAllowedRoles
);

// Get all employees with their assigned roles (school-scoped)
router.get(
  '/role-assignments',
  authenticate,
  enforceTenant(),
  requirePermission('employees:read'),
  employeeRoleController.getAllWithRoles
);

// Get roles for a specific employee
router.get(
  '/:eid/roles',
  authenticate,
  enforceTenant(),
  requirePermission('employees:read'),
  employeeRoleController.getEmployeeRoles
);

// Assign a role to an employee
router.post(
  '/:eid/roles',
  authenticate,
  enforceTenant(),
  requirePermission('employees:write'),
  employeeRoleController.assignRole
);

// Remove a role from an employee
router.delete(
  '/:eid/roles/:roleName',
  authenticate,
  enforceTenant(),
  requirePermission('employees:write'),
  employeeRoleController.removeRole
);

module.exports = router;
