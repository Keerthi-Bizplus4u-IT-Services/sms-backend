const { getResourceUsage } = require('../utils/resource-counter');
const { AppError } = require('../../../middleware/error.middleware');

/**
 * Subscription Service
 * Provides subscription/trial status and resource usage information.
 */
class SubscriptionService {
  /**
   * Get subscription status and resource usage for a school
   * @param {number} schoolId
   */
  async getStatus(schoolId) {
    const result = await getResourceUsage(schoolId);
    if (!result) {
      throw new AppError('School not found', 404);
    }

    const { school, usage } = result;
    const now = new Date();
    const trialEndsAt = school.trial_ends_at ? new Date(school.trial_ends_at) : null;
    const trialExpired = trialEndsAt ? now > trialEndsAt : false;
    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
      : 0;

    const restrictedFeatures = [];
    if (school.subscription_plan === 'free') {
      restrictedFeatures.push('email_sending', 'sms_sending');
    }

    return {
      plan: school.subscription_plan,
      is_trial: school.is_trial,
      trial_started_at: school.trial_started_at,
      trial_ends_at: school.trial_ends_at,
      days_remaining: daysRemaining,
      trial_expired: trialExpired,
      limits: usage,
      restricted_features: restrictedFeatures
    };
  }
}

module.exports = new SubscriptionService();
