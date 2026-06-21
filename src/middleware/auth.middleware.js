const jwt = require('jsonwebtoken');
const { User, Role, Person, Permission } = require('../models');
const { error } = require('../utils/response');

/**
 * JWT Authentication Middleware
 * Verifies JWT token, loads user with permissions, attaches to request.
 * No legacy session fallback — JWT only.
 */

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') return null;
  return roleName.trim().toLowerCase();
};

const SUPER_ADMIN_REPORT_PREFIXES = ['/api/v1/dashboard', '/api/v1/reports'];
const SUPER_ADMIN_AUTH_ALLOWED = ['/api/v1/auth/me', '/api/v1/auth/logout', '/api/v1/auth/logout-all'];

const isSuperAdminReportOnlyMode = () => {
  const raw = String(process.env.SUPER_ADMIN_REPORT_ONLY || 'false').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
};

const isSuperAdminReportRequest = (req) => {
  const path = String(req?.originalUrl || req?.url || '').split('?')[0].toLowerCase();
  const method = String(req?.method || 'GET').toUpperCase();

  if (SUPER_ADMIN_AUTH_ALLOWED.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  const isReportPath = SUPER_ADMIN_REPORT_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isReportPath) {
    return false;
  }

  return method === 'GET';
};

/**
 * Load user from DB with role + permissions eagerly loaded
 */
const loadUserWithPermissions = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name'],
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'resource', 'action'],
          through: { attributes: [] }
        }]
      },
      {
        model: Person,
        as: 'person',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'photo_url']
      }
    ],
    attributes: { exclude: ['password_hash'] }
  });
  return user;
};

/**
 * Extract and verify JWT from Authorization header
 */
const extractAndVerifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Build req.user object from a loaded user model
 */
const buildReqUser = (user) => {
  const permissions = user.role?.permissions?.map(p => p.name) || [];
  return {
    id: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName: normalizeRoleName(user.role?.name),
    schoolId: user.school_id || null,
    person: user.person,
    permissions
  };
};

/**
 * Primary authentication middleware
 * Requires a valid Bearer token. Rejects if missing or invalid.
 */
const authenticate = async (req, res, next) => {
  try {
    let decoded;
    try {
      decoded = extractAndVerifyToken(req.headers.authorization);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Token has expired', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        return error(res, 'Invalid token', 401);
      }
      throw err;
    }

    if (!decoded) {
      return error(res, 'Access token is required', 401);
    }

    if (decoded.type && decoded.type !== 'access') {
      return error(res, 'Invalid token type', 401);
    }

    const user = await loadUserWithPermissions(decoded.userId);

    if (!user) {
      return error(res, 'User not found', 401);
    }

    if (!user.is_active) {
      return error(res, 'Account is deactivated', 403);
    }

    if (user.isLocked()) {
      return error(res, 'Account is locked due to too many failed login attempts', 403);
    }

    req.user = buildReqUser(user);

    // Set req.schoolId for tenant isolation
    // super_admin report scope is auto-derived from assignment and remains global within this instance.
    if (req.user.roleName === 'super_admin') {
      if (isSuperAdminReportOnlyMode() && !isSuperAdminReportRequest(req)) {
        return error(res, 'Super admin has report-only access in this instance', 403);
      }

      req.schoolId = null;
    } else {
      req.schoolId = req.user.schoolId ? parseInt(req.user.schoolId, 10) : null;
    }

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return error(res, 'Authentication failed', 500);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing/invalid.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req.headers.authorization);
    if (!decoded) return next();

    const user = await loadUserWithPermissions(decoded.userId);
    if (user && user.is_active && !user.isLocked()) {
      req.user = buildReqUser(user);
    }
  } catch (_err) {
    // Invalid token — continue without user
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
