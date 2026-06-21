const subscriptionService = require('../services/subscription.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

/**
 * Subscription Controller
 * Handles subscription/trial status requests
 */
class SubscriptionController {
  /**
   * GET /api/v1/subscription/status
   * Returns plan info, trial dates, resource usage, and restricted features
   */
  getStatus = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const status = await subscriptionService.getStatus(schoolId);
    return success(res, status, 'Subscription status retrieved successfully', 200);
  });
}

module.exports = new SubscriptionController();
