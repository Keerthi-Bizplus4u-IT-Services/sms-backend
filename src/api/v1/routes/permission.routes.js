const express = require('express');
const router = express.Router();

const permissionController = require('../controllers/permission.controller');
const { roleIdValidator, assignPermissionsValidator } = require('../validators/permission.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

// All permission management routes require super_admin
router.get('/', authenticate, enforceTenant(), authorize(['super_admin', 'admin']), permissionController.listPermissions);
router.get('/roles/:roleId', authenticate, enforceTenant(), authorize(['super_admin', 'admin']), roleIdValidator, validate, permissionController.getRolePermissions);
router.put('/roles/:roleId', authenticate, enforceTenant(), authorize(['super_admin']), assignPermissionsValidator, validate, permissionController.assignPermissionsToRole);

module.exports = router;
