const express = require('express');
const router = express.Router();

const roleController = require('../controllers/role.controller');
const { roleIdValidator, createRoleValidator, updateRoleValidator } = require('../validators/role.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

// All role management routes require super_admin
router.get('/', authenticate, enforceTenant(), authorize(['super_admin', 'admin']), roleController.listRoles);
router.get('/:id', authenticate, enforceTenant(), authorize(['super_admin', 'admin']), roleIdValidator, validate, roleController.getRole);
router.post('/', authenticate, enforceTenant(), authorize(['super_admin']), createRoleValidator, validate, roleController.createRole);
router.put('/:id', authenticate, enforceTenant(), authorize(['super_admin']), updateRoleValidator, validate, roleController.updateRole);
router.delete('/:id', authenticate, enforceTenant(), authorize(['super_admin']), roleIdValidator, validate, roleController.deleteRole);

module.exports = router;
