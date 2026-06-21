const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * Subscription Routes
 * @route /api/v1/subscription
 */

// GET /api/v1/subscription/status — private
router.get('/status', authenticate, subscriptionController.getStatus);

module.exports = router;
