const { error } = require('../utils/response');

/**
 * RBAC Middleware
 * Provides granular permission-based access control, role checks,
 * ownership validation, and tenant (school) isolation.
 */

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') return null;
  return roleName.trim().toLowerCase();
};

/**
 * Authorize by role names.
 * @param {string[]} allowedRoles - Array of allowed role names
 */
const authorize = (allowedRoles = []) => {
  const normalized = allowedRoles.map(r => r.toLowerCase()).filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const currentRole = normalizeRoleName(req.user.roleName);

    // super_admin bypasses role checks
    if (currentRole === 'super_admin') return next();

    if (!currentRole || !normalized.includes(currentRole)) {
      return error(res, 'You do not have permission to access this resource', 403);
    }

    next();
  };
};

/**
 * Require a single permission.
 * @param {string} permissionName - e.g. 'students:read'
 */
const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const currentRole = normalizeRoleName(req.user.roleName);

    // super_admin bypasses permission checks
    if (currentRole === 'super_admin') return next();

    const userPerms = req.user.permissions || [];
    if (!userPerms.includes(permissionName)) {
      return error(res, 'You do not have permission to perform this action', 403);
    }

    next();
  };
};

/**
 * Require at least one of the listed permissions.
 * @param {string[]} permissionNames - e.g. ['students:read', 'students:write']
 */
const requireAnyPermission = (permissionNames = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const currentRole = normalizeRoleName(req.user.roleName);
    if (currentRole === 'super_admin') return next();

    const userPerms = req.user.permissions || [];
    const hasAny = permissionNames.some(p => userPerms.includes(p));
    if (!hasAny) {
      return error(res, 'You do not have permission to perform this action', 403);
    }

    next();
  };
};

/**
 * Require ALL listed permissions.
 * @param {string[]} permissionNames
 */
const requireAllPermissions = (permissionNames = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const currentRole = normalizeRoleName(req.user.roleName);
    if (currentRole === 'super_admin') return next();

    const userPerms = req.user.permissions || [];
    const hasAll = permissionNames.every(p => userPerms.includes(p));
    if (!hasAll) {
      return error(res, 'You do not have permission to perform this action', 403);
    }

    next();
  };
};

/**
 * Check resource ownership.
 * super_admin can access any resource; others must own it.
 * @param {string} userIdField - The param/body field containing the owner user ID
 */
const checkOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const role = normalizeRoleName(req.user.roleName);
    if (role === 'super_admin') return next();

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    if (!resourceUserId) {
      return error(res, 'Resource identifier not found', 400);
    }

    if (parseInt(resourceUserId) !== parseInt(req.user.id)) {
      return error(res, 'You can only access your own resources', 403);
    }

    next();
  };
};

/**
 * Enforce tenant (school) isolation.
 * Sets req.schoolId from the authenticated user's school_id.
 * super_admin is global for report scope and cannot switch school via query parameters.
 * All other users are locked to their own school.
 */
const enforceTenant = () => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    const role = normalizeRoleName(req.user.roleName);

    if (role === 'super_admin') {
      req.schoolId = null;
      return next();
    }

    // Regular users must have a school_id
    if (!req.user.schoolId) {
      return error(res, 'User is not assigned to a school', 403);
    }

    req.schoolId = parseInt(req.user.schoolId, 10);
    next();
  };
};

module.exports = {
  authorize,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  checkOwnership,
  enforceTenant
};
