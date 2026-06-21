/**
 * Report & Dashboard Permissions Matrix
 *
 * Central registry of every reporting endpoint, the permission it requires,
 * and which roles are expected to hold that permission.
 *
 * Purpose:
 *   - Auditable record of report access rules
 *   - Single source of truth consumed by routes, tests, and docs
 *   - Changes here must be reflected in route middleware and seed data
 */

const REPORT_PERMISSIONS_MATRIX = {
  // ── Dashboard ──────────────────────────────────────────────────
  'GET /dashboard/summary': {
    permission: 'dashboard:read',
    description: 'Dashboard KPI widgets (student count, teacher count, fees, notices)',
    allowedRoles: ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accounts', 'library', 'management', 'transport']
  },
  'GET /dashboard/gender-counts': {
    permission: 'dashboard:read',
    description: 'Student gender distribution chart',
    allowedRoles: ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accounts', 'library', 'management', 'transport']
  },

  // ── Reports ────────────────────────────────────────────────────
  'GET /reports/fees': {
    permission: 'reports:read',
    description: 'Fee collection summary grouped by fee type',
    allowedRoles: ['super_admin', 'admin', 'accounts', 'management']
  },
  'GET /reports/expenses': {
    permission: 'reports:read',
    description: 'Expense summary grouped by expense type',
    allowedRoles: ['super_admin', 'admin', 'accounts', 'management']
  },
  'GET /reports/students': {
    permission: 'reports:read',
    description: 'Student enrollment counts grouped by class',
    allowedRoles: ['super_admin', 'admin', 'management']
  },
  'GET /reports/financial-summary': {
    permission: 'reports:read',
    description: 'Combined income vs expenditure overview',
    allowedRoles: ['super_admin', 'admin', 'accounts', 'management']
  }
};

/**
 * Validate that a role has access to a specific endpoint.
 * @param {string} endpoint - e.g. 'GET /reports/fees'
 * @param {string} roleName - e.g. 'admin'
 * @returns {boolean}
 */
const isRoleAllowed = (endpoint, roleName) => {
  const entry = REPORT_PERMISSIONS_MATRIX[endpoint];
  if (!entry) return false;
  return entry.allowedRoles.includes(roleName.toLowerCase());
};

/**
 * Return the permission name required for a given endpoint.
 * @param {string} endpoint
 * @returns {string|null}
 */
const requiredPermission = (endpoint) => {
  const entry = REPORT_PERMISSIONS_MATRIX[endpoint];
  return entry ? entry.permission : null;
};

module.exports = {
  REPORT_PERMISSIONS_MATRIX,
  isRoleAllowed,
  requiredPermission
};
