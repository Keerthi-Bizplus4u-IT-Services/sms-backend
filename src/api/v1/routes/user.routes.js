const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { getUsersValidator } = require('../validators/user.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * User Routes
 */

// GET /api/v1/users — list all users
router.get('/users', authenticate, enforceTenant(), requirePermission('users:read'), getUsersValidator, validate, userController.getUsers);

module.exports = router;
