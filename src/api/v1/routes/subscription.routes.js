const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { enforceTenant } = require('../../../middleware/rbac.middleware');

/**
 * Subscription Routes
 * @route /api/v1/subscription
 */

// GET /api/v1/subscription/status — private
router.get('/status', authenticate, enforceTenant(), subscriptionController.getStatus);

module.exports = router;
