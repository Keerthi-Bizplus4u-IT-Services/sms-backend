const { info } = require('./logger');

const counters = {
  auth_success: 0,
  auth_invalid_token: 0,
  auth_expired_token: 0,
  auth_invalid_token_type: 0,
  auth_user_not_found: 0,
  auth_account_deactivated: 0,
  auth_account_locked: 0,
  auth_missing_tenant_scope: 0,
  auth_tenant_mismatch: 0,
  auth_config_error: 0,
  auth_internal_error: 0
};

const normalizeMetricName = (metricName) => {
  if (!metricName || typeof metricName !== 'string') {
    return null;
  }

  return metricName.trim().toLowerCase();
};

const recordAuthMetric = (metricName, metadata = {}) => {
  const normalized = normalizeMetricName(metricName);
  if (!normalized) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(counters, normalized)) {
    counters[normalized] = 0;
  }

  counters[normalized] += 1;

  info('AUTH_METRIC', {
    category: 'auth',
    metric: normalized,
    value: 1,
    countersSnapshot: { ...counters },
    ...metadata
  });
};

const getAuthMetricsSnapshot = () => ({ ...counters });

module.exports = {
  recordAuthMetric,
  getAuthMetricsSnapshot
};
